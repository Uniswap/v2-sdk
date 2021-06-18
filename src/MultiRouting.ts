//import { Price, Token } from "entities";

const LegGasConsuming = 40_000;

enum PoolType {
    ConstantProduct = 'ConstantProduct',
    ConstantMean = 'ConstantMean',
    Hybrid = 'Hybrid'
}

interface Pool {
    address: string;
    type: PoolType;
    reserve0: number;
    reserve1: number;
    data: ArrayBuffer;
    fee: number;
}

interface RouteLeg {
    address: string;
  //  token: Token;
    quantity: number;
}

interface Route {
    amountIn: number,
    amountOut: number,
    legs: RouteLeg[],
    feesApproximation: number
}

function calcSquareEquation(a:number, b:number, c:number): [number, number] {
    const D = b*b-4*a*c;
    console.assert(D >= 0, `Discriminant is negative! ${a} ${b} ${c}`);
    const sqrtD = Math.sqrt(D);
    return [(-b-sqrtD)/2/a, (-b+sqrtD)/2/a];
}

function ConstantMeanParamsFromData(data: ArrayBuffer): [number, number] {
    const arr = new Uint8Array(data);
    return [arr[0], 100-arr[0]];
}

function ConstantMeanDataFromParams(weight0: number, weight1: number): ArrayBuffer {
    console.assert(weight0+weight1 == 100, 'Weight wrong')
    const data = new ArrayBuffer(16);
    const arr = new Uint8Array(data);
    arr[0] = weight0;
    return data;
}

function HybridParamsFromData(data: ArrayBuffer): number {
    const arr = new Int32Array(data);
    return arr[0];
}

function HybridDataFromParams(A: number): ArrayBuffer {
    const data = new ArrayBuffer(16);
    const arr = new Int32Array(data);
    arr[0] = A;
    return data;
}

const DCache = new Map<Pool, number>();
function HybridComputeLiquidity(pool: Pool): number {
    const res = DCache.get(pool);
    if (res != undefined)
        return res;

    const s = pool.reserve0 + pool.reserve1;
    if (s == 0) {
        DCache.set(pool, 0);
        return 0;
    }

    const A = HybridParamsFromData(pool.data);
    const nA = A * 2;

    let prevD;
    let D = s;
    for (let i = 0; i < 256; i++) {
        const dP = D*D*D / (pool.reserve0 * pool.reserve1 * 4);
        prevD = D;
        D = (nA*s + dP * 2)*D/((nA - 1)*D + dP * 3);
        if ( (D - prevD) <= 1 ) {
            break;
        }
    }
    DCache.set(pool, D);
    return D;
}

function HybridgetY(pool: Pool, x: number): number {
    const D = HybridComputeLiquidity(pool);
    const A = HybridParamsFromData(pool.data);
    return calcSquareEquation(16*A*x, 16*A*x*x + 4*D*x - 16*A*D*x, -D*D*D)[1];
}

function calcOutByIn(pool:Pool, amountIn: number): number {
    switch(pool.type) {
        case PoolType.ConstantProduct: {
            return pool.reserve1*amountIn/(pool.reserve0/(1-pool.fee) + amountIn);
        } 
        case PoolType.ConstantMean: {
            const [weight0, weight1] = ConstantMeanParamsFromData(pool.data);
            const weightRatio = weight0/weight1;
            const actualIn = amountIn*(1-pool.fee);
            return pool.reserve1*(1-Math.pow(pool.reserve0/(pool.reserve0+actualIn), weightRatio));
        } 
        case PoolType.Hybrid: {
            const xNew = pool.reserve0 + amountIn;
            const yNew = HybridgetY(pool, xNew);
            const dy = (pool.reserve1 - yNew)*(1-pool.fee); // TODO: Why other pools take fees at the beginning, and this one - at the end?
            return dy;
        }
    }
    return 0;
}

function calcPrice(pool:Pool, amountIn: number): number {
    switch(pool.type) {
        case PoolType.ConstantProduct: {
            const x = pool.reserve0/(1-pool.fee);
            return pool.reserve1*x/(x+amountIn)/(x+amountIn);
        } 
        case PoolType.ConstantMean: {
            const [weight0, weight1] = ConstantMeanParamsFromData(pool.data);
            const weightRatio = weight0/weight1;
            const x = pool.reserve0+amountIn*(1-pool.fee);
            return pool.reserve1*weightRatio*(1-pool.fee)*Math.pow(pool.reserve0/x, weightRatio)/x;
        } 
        case PoolType.Hybrid: {
            const D = HybridComputeLiquidity(pool);
            const A = HybridParamsFromData(pool.data);
            const x = pool.reserve0 + amountIn;
            const b = 4*A*x + D - 4*A*D;
            const ac4 = D*D*D/x;
            const Ds = Math.sqrt(b*b + 4*A*ac4);
            const res = (0.5 - (2*b-ac4/x)/Ds/4)*(1-pool.fee);
            return res;
        }
    }
    return 0;
}

function revert(from: number, to: number, f: (x:number)=>number) {
    return function x(y: number): number {
        let n = 2;
        if (y <= f(from)) return from;
        if (y >= f(to)) return to;
        let x1 = from, x2 = to;
        while(1)
        {
            const x0: number = (x1+x2)/2;
            if (x0 == x1 || x0 == x2) return x0;
            const y0 = f(x0);
            if (y == y0) return x0;
            if (y < y0) 
                x2=x0;
            else
                x1=x0;
        }
        return 0;
    }
}

function calcInputByPriceConstantMean(pool:Pool, price:number) {
    const w = ConstantMeanParamsFromData(pool.data);
    const weightRatio = w[0]/w[1];
    const t = pool.reserve1*price*weightRatio*(1-pool.fee)*Math.pow(pool.reserve0, weightRatio);
    return (Math.pow(t, 1/(weightRatio+1)) - pool.reserve0)/(1-pool.fee);
}

function calcInputByPrice(pool: Pool, priceEffective: number): number {
    switch(pool.type) {
        case PoolType.ConstantProduct: {
            const x = pool.reserve0/(1-pool.fee);
            const res =  Math.sqrt(pool.reserve1*x*priceEffective) - x;
            return res;
        } 
        case PoolType.ConstantMean: {
            const res = calcInputByPriceConstantMean(pool, priceEffective);
            return res;
        } 
        case PoolType.Hybrid: {
            let res =  revert(0.0000001, 1e8, (x:number) => 1/calcPrice(pool, x))(priceEffective);
            res = res > 0.0000001 ? res : 0;
            return res;
        }
    }
}

function calcInputByPriceTotal(pools: Pool[], priceEffective: number): number {
    let res = 0;
    // TODO: if pools are sorted by effectivity and one of them is less 0 => may avoid to check others
    pools.forEach(pool => {
        const input = calcInputByPrice(pool, priceEffective);
        if (input > 0)
        res += input;
    })
    return res;
}

interface PoolsVariantData {
    poolNumber: number;
    amountOut: number;
    priceEffective: number;
    distribution: number[];
}

function findBestDistributionIdealParams(
    amountIn: number,
    pools: Pool[],
    minPrice: number
): PoolsVariantData {
    // TODO: not binary search - but better? 1.01?
    let maxPrice;
    for (maxPrice = minPrice*2; calcInputByPriceTotal(pools, maxPrice) < amountIn; maxPrice *=2);
    minPrice = maxPrice/2;
    while((maxPrice/minPrice - 1) > 1e-12) {
        const price:number = (maxPrice+minPrice)/2;
        const input = calcInputByPriceTotal(pools, price);
        if (input >= amountIn) 
            maxPrice = price;
        else
            minPrice = price;
    }
    
    const price:number = (maxPrice+minPrice)/2;

    let distribution = pools.map(pool => Math.max(calcInputByPrice(pool, price), 0));

    const sum = distribution.reduce((a,b) => a+b, 0);
    if (Math.abs(sum/amountIn - 1) >= 0.1)
        console.assert(Math.abs(sum/amountIn - 1) < 0.1, '196 ' + sum + ' ' + amountIn);
    distribution = distribution.map(v => v/sum);
    return {
        poolNumber: pools.length, 
        amountOut: distribution.map((v, i) => calcOutByIn(pools[i], v*amountIn)).reduce((a,b) => a+b, 0),
        priceEffective: price,
        distribution
    }
}

function findBestDistributionIdeal(
    amountIn: number,
    pools: Pool[],
    tokenInPriceBase: number,
    tokenOutPriceBase: number,
    gasPriceGWeiBase: number
): Route  | [number, number[][]]{
    const legPriceInTokenOut = LegGasConsuming*gasPriceGWeiBase*1e-9/tokenOutPriceBase;

    let minPrice = calcPrice(pools[0], 0);
    for (let i = 1; i < pools.length; ++i) {
        const pr = calcPrice(pools[i], 0);
        minPrice = Math.min(pr, minPrice);
    }

    const params = findBestDistributionIdealParams(amountIn, pools, minPrice);
    const distrSorted = params.distribution.map((v, i) => [i, v]).sort((a,b) => b[1] - a[1]);
    params.distribution = distrSorted.map(a => a[1]);
    const poolsSorted = distrSorted.map(a => pools[a[0]]);    

    // TODO: Use more fast search instead
    let bestPoolNumber = pools.length;
    let bestOut = params.amountOut - pools.length*legPriceInTokenOut;
    let bestParams = params;
    for (let i = pools.length-1; i >= 1; --i) {
        const shortPoolList = poolsSorted.slice(0, i);
        const p = findBestDistributionIdealParams(amountIn, shortPoolList, minPrice);
        const out = p.amountOut - i*legPriceInTokenOut;
        if (out < bestOut){
            //break;        // TODO: uncomment?
        } else {
            bestPoolNumber = i;
            bestOut = out;
            bestParams = p;
        }
    }
    const finalDistribution = bestParams.distribution.map((v, i) => [distrSorted[i][0], v]);
    
    const checkedOut = calcOut(amountIn, pools, finalDistribution, tokenOutPriceBase, gasPriceGWeiBase);
    return [checkedOut, finalDistribution];
}

function findBestDistribution2 (
    amountIn: number,
    pools: Pool[],
    tokenInPriceBase: number,
    tokenOutPriceBase: number,
    gasPriceGWeiBase: number
): Route  | [number, number[][]]{
    const legPriceInTokenOut = LegGasConsuming*gasPriceGWeiBase*1e-9/tokenOutPriceBase;    

    const out = pools.map(p => calcOutByIn(p, amountIn));
    const sum = out.reduce((a, b) => a+b, 0);
    const order = out.map((o, i) => [i, o/sum]).sort((a,b) => b[1] - a[1]);
    
    let bestGroup = order;
    let bestOut = -legPriceInTokenOut*pools.length*2;
    let flagDown = false;
     
    
    for (let i = pools.length; i >= 1; --i) {
        const group = order.slice(0, i);
        const sum = group.reduce((a, b) => a+b[1], 0);
        const out = group.map(p => calcOutByIn(pools[p[0]], p[1]/sum*amountIn)).reduce((a, b) => a+b, 0) - legPriceInTokenOut*i;
        
        if (out > bestOut) {
            console.assert(flagDown == false, "flagDown at " + amountIn);
            bestOut = out;
            bestGroup = group.map(([n, v]) => [n, v/sum]);
        } else {
            flagDown = true;
           // break;        // TODO: unconmment?
        }
    }
    
    
    return [bestOut, bestGroup];
}

function findBestDistribution3 (
    amountIn: number,
    pools: Pool[],
    tokenInPriceBase: number,
    tokenOutPriceBase: number,
    gasPriceGWeiBase: number
): Route  | [number, number[][]]{
    const legPriceInTokenOut = LegGasConsuming*gasPriceGWeiBase*1e-9/tokenOutPriceBase;    

    const out = pools.map(p => calcOutByIn(p, amountIn/pools.length));
    const sum = out.reduce((a, b) => a+b, 0);
    const order = out.map((o, i) => [i, o/sum]).sort((a,b) => b[1] - a[1]);
    
    let bestGroup = order;
    let bestOut = -legPriceInTokenOut*pools.length*2;
    let flagDown = false;
     
    
    for (let i = pools.length; i >= 1; --i) {
        const group = order.slice(0, i);
        const sum = group.reduce((a, b) => a+b[1], 0);
        const out = group.map(p => calcOutByIn(pools[p[0]], p[1]/sum*amountIn)).reduce((a, b) => a+b, 0) - legPriceInTokenOut*i;
        
        if (out > bestOut) {
            // commented because assertion triggers too often
            // console.assert(flagDown == false, "flagDown at " + amountIn);
            bestOut = out;
            bestGroup = group.map(([n, v]) => [n, v/sum]);
        } else {
            flagDown = true;
           // break;        // TODO: unconmment?
        }
    }
        
    const checkedOut = calcOut(amountIn, pools, bestGroup, tokenOutPriceBase, gasPriceGWeiBase);
    return [checkedOut, bestGroup];
}

function findBestDistributionPools(
    amountIn: number,
    pools: Pool[]       // TODO: maybe use initial distribution?
): [number, number[]] {

    let distr = pools.map(p => Math.max(calcOutByIn(p, amountIn/pools.length), 0));
    
    for(let i = 0; i < 5; ++i) {
        const sum = distr.reduce((a, b) => a+b, 0);
        console.assert(sum > 0, "508 " + sum);
        
        const prices = distr.map((d, j) => 1/calcPrice(pools[j], amountIn*d/sum))
        const pr = prices.reduce((a, b) => Math.max(a, b), 0);
        
        distr = pools.map(p => calcInputByPrice(p, pr));        
    }

    const sum = distr.reduce((a, b) => a + b, 0);
    distr = distr.map(d => d/sum);
    const out = distr.map((p, i) => calcOutByIn(pools[i], p*amountIn)).reduce((a, b) => a+b, 0);

    return [out, distr];
}

function findBestDistribution(
    amountIn: number,
    pools: Pool[],
    tokenInPriceBase: number,
    tokenOutPriceBase: number,
    gasPriceGWeiBase: number
): Route  | [number, number[][]]{
    const legPriceInTokenOut = LegGasConsuming*gasPriceGWeiBase*1e-9/tokenOutPriceBase;

    let [bestOut, distr] = findBestDistributionPools(amountIn, pools);
    bestOut -= legPriceInTokenOut*pools.length;
    let bestGroup = distr.map((d, i) => [i, d]).sort((a,b) => b[1] - a[1]);
    
    let flagDown = false;
    const poolsSorted = bestGroup.map(a => pools[a[0]]);    
    for (let i = pools.length-1; i >= 1; --i) {
        const group = poolsSorted.slice(0, i);
        let [out, distr] = findBestDistributionPools(amountIn, group);
        out -= legPriceInTokenOut*i;
        
        if (out > bestOut) {
            console.assert(flagDown == false, "408 flagDown at " + amountIn);
            bestOut = out;
            bestGroup = distr.map((d, i) => [bestGroup[i][0], d]);
        } else {
            flagDown = true;
           // break;            // TODO: uncomment for speed up ???
        }
    }
        
    const checkedOut = calcOut(amountIn, pools, bestGroup, tokenOutPriceBase, gasPriceGWeiBase);
    return [checkedOut, bestGroup];
}

function calcOut(
    amountIn: number,
    pools: Pool[],
    distribution: number[][],
    tokenOutPriceBase: number,
    gasPriceGWeiBase: number
): number {
    const legPriceInTokenOut = LegGasConsuming*gasPriceGWeiBase*1e-9/tokenOutPriceBase;  
    const sum = distribution.reduce((a, b) => a + b[1], 0);
    const out = distribution.map(p => calcOutByIn(pools[p[0]], p[1]/sum*amountIn)).reduce((a, b) => a+b, 0);
   /* console.log(amountIn, sum, out);
    console.log(distribution.map(d => {
        const inn = amountIn*d[1]/sum;
        inCheck += inn;
        const out = calcOutByIn(pools[d[0]], inn);
        outCheck += out;
        const pr = calcPrice(pools[d[0]], inn);
        d.push(out);
        d.push(pr);
        return d;
    }));*/    
    
    return out - legPriceInTokenOut*distribution.length;
}

function testEnvironment() {
    const price1In0 = 1;
    const reserve = [1_000_000, 100_000, 1_000_000, 1_000_000, 10_000];
    const tokenInPriceBase = 1;
    const tokenOutPriceBase = tokenInPriceBase*price1In0;

    var testPool1 = {
        address: "xxx",
        type: PoolType.ConstantProduct,
        reserve0: reserve[0],
        reserve1: reserve[0]/price1In0 - 100,
        data: new ArrayBuffer(16),
        fee: 0.003
    };
    var testPool2 = {
        address: "xxx",
        type: PoolType.ConstantProduct,
        reserve0: reserve[1],
        reserve1: reserve[1]/price1In0,
        data: new ArrayBuffer(16),
        fee: 0.003
    };
    const weight0 = 90, weight1 = 10;
    var testPool3 = {
        address: "xxx",
        type: PoolType.ConstantMean,
        reserve0: 2*weight0*price1In0*reserve[2]/(weight0*price1In0 + weight1),
        reserve1: 2*weight1*reserve[2]/(weight0*price1In0 + weight1),
        data: ConstantMeanDataFromParams(weight0, weight1),
        fee: 0.002
    };
    var testPool4 = {
        address: "xxx",
        type: PoolType.ConstantProduct,
        reserve0: reserve[3] - 100,
        reserve1: reserve[3]/price1In0,
        data: new ArrayBuffer(16),
        fee: 0.003
    };
    var testPool5 = {
        address: "xxx",
        type: PoolType.Hybrid,
        reserve0: reserve[4],
        reserve1: reserve[4]/price1In0,
        data: HybridDataFromParams(80),
        fee: 0.003
    }; 

    var testPools = [testPool1, testPool2, testPool3, testPool4];
    if (price1In0 == 1)
        testPools.push(testPool5);

    return {
        testPools,
        tokenInPriceBase,
        tokenOutPriceBase,
        price1In0
    }
}

// var env0 = testEnvironment();
// const legPriceInTokenOut = LegGasConsuming*200*1e-9/env0.tokenOutPriceBase;
// const start = Date.now();
// for (let i = 0; i < 100000; ++i)
//      findBestDistribution4(999000,  env0.testPools, env0.tokenInPriceBase, env0.tokenOutPriceBase, 200); // 31mks
// const finish = Date.now();
// console.log(finish-start);

