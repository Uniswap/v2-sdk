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

            // const D = HybridComputeLiquidity(pool);
            // const A = HybridParamsFromData(pool.data);
            // const x = pool.reserve0 + amountIn;
            // const b = 4*A*x + D - 4*A*D;
            // const Ds = Math.sqrt(b*b + 4*A*D*D*D/x);
            // const yNew2 =  -(x/2+D/8/A-D/2) + Ds/8/A;
            // console.log(yNew, yNew2);
            

            const dy = (pool.reserve1 - yNew)*(1-pool.fee); // TODO: почему у остальных комиссии берут вначале, а тут - в конце ?
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
            // const res2 = derivativeD(x => calcOutByIn(pool, x), 0.01)(amountIn); // TODO: change to analytic
            // //console.log(amountIn, res, res2);
            // if (res !==0 || res2 !== 0)
            //     console.assert(Math.abs(res/res2-1) < 1e-4 || Math.abs(res-res2) < 1e-4, "140 " + amountIn + " " + res + " " + res2);
            return res;
            //return res2;
        }
    }
    return 0;
}

function calcPriceEffective(amountIn: number, pool: Pool) {
    const out = calcOutByIn(pool, amountIn);
    return amountIn/out;
}

function derivativeD(f: (x:number)=>number, dif = 1e-7) {
    return function y(x: number) {
        return (f(x+dif) - f(x))/dif;
    }
}

function revert(from: number, to: number, f: (x:number)=>number) {
    return function x(y: number): number {
        let n = 2;
        if (y <= f(from)) {
            console.log(1);
            
            return from;
        }
        if (y >= f(to)) {
            console.log(2);
            
            return to;
        }
        let x1 = from, x2 = to;
        while(1)
        {
            const x0: number = (x1+x2)/2;
            if (x0 == x1 || x0 == x2) {
                console.log(n);
                
                return x0;
            }
            const y0 = f(x0);
            ++n;
            if (y == y0) {
                console.log(n);
                
                return x0;
            }
            if (y < y0) 
                x2=x0;
            else
                x1=x0;
        }
        console.log(n);
        
        return 0;
    }
}

// function calcInputByPrice3(pool: Pool, legPriceInTokenOut: number, priceEffective: number): number {
//     let res =  revert(0.0000001, 1e8, (x:number) => 1/calcPrice(pool, x))(priceEffective);
//     res = res > 0.0000001 ? res : 0;
//     return res;
// }

function calcInputByPriceConstantMean(pool:Pool, price:number) {
    const w = ConstantMeanParamsFromData(pool.data);
    const weightRatio = w[0]/w[1];
    const t = pool.reserve1*price*weightRatio*(1-pool.fee)*Math.pow(pool.reserve0, weightRatio);
    return (Math.pow(t, 1/(weightRatio+1)) - pool.reserve0)/(1-pool.fee);
}

function calcInputByPrice4(pool: Pool, priceEffective: number): number {
    switch(pool.type) {
        case PoolType.ConstantProduct: {
            const x = pool.reserve0/(1-pool.fee);
            const res =  Math.sqrt(pool.reserve1*x*priceEffective) - x;
            // if (res > 0.0000001) {
            //     const res2 = calcInputByPrice3(pool, legPriceInTokenOut, priceEffective);
            //     console.assert(Math.abs(res/res2-1) < 1e-6, "179 " + res + " " + res2);
            // }
            return res;
        } 
        case PoolType.ConstantMean: {
            const res = calcInputByPriceConstantMean(pool, priceEffective);
            // if (res > 0.0000001) {
            //     const res2 = calcInputByPrice3(pool, legPriceInTokenOut, priceEffective);
            //     console.assert(Math.abs(res/res2-1) < 1e-6, "190 " + res + " " + res2);
            // }
            return res;
        } 
        case PoolType.Hybrid: {
            let res =  revert(0.0000001, 1e8, (x:number) => 1/calcPrice(pool, x))(priceEffective);
            res = res > 0.0000001 ? res : 0;
            return res;
            //return calcInputByPrice3(pool, legPriceInTokenOut, priceEffective);
        }
    }
}

// function calcInputByPrice(pool: Pool, legPriceInTokenOut: number, priceEffective: number): number {
//     /*switch(pool.type) {
//         case PoolType.ConstantProduct: {
//             return priceEffective*pool.reserve1-pool.reserve0/(1-pool.fee);
//         }
//     }*/
    
//     let res =  revert(0.0000001, 1e40, (x:number) => x/calcOutByIn(pool, x))(priceEffective);
//     res = res > 0.0000001 ? res : 0;

//     if (pool.type == PoolType.ConstantProduct) {
//         let assumed = priceEffective * pool.reserve1 - pool.reserve0/(1-pool.fee);
//         assumed = assumed > 0.0000001 ? assumed : 0;
//         if (assumed > 0.0000001) {
//             if (Math.abs(res/assumed - 1) >= 1e-6)
//                 console.assert(Math.abs(res/assumed - 1) < 1e-6, '161: ' + assumed + res);
//         } else
//             if (res != 0)
//                 console.assert(res == 0, '151');
            
//     }
//     return res;
// }

// function calcInputByPrice2(pool: Pool, legPriceInTokenOut: number, priceEffective: number): number {
//     /*switch(pool.type) {
//         case PoolType.ConstantProduct: {
//             return priceEffective*pool.reserve1-pool.reserve0/(1-pool.fee);
//         }
//     }*/
    
//     let res =  revert(100000000000, 0.0000001, (x:number) => calcOutByIn(pool, x)/x)(priceEffective);
//     res = res > 0.0000001 ? res : 0;

//     if (pool.type == PoolType.ConstantProduct) {
//         let assumed = pool.reserve1/priceEffective - pool.reserve0/(1-pool.fee);
//         assumed = assumed > 0.0000001 ? assumed : 0;
//         if (assumed > 0.0000001) {
//             if (Math.abs(res/assumed - 1) >= 1e-6)
//                 console.assert(Math.abs(res/assumed - 1) < 1e-6, '161: ' + assumed + " " + res);
//         } else
//             if (res)
//                 console.assert(res == 0, '151');
            
//     }
//     return res;
// }

function calcInputByPriceTotal(pools: Pool[], priceEffective: number): number {
    let res = 0;
    // если при большей цене кто-то из пулов уже отключился - на меньших можно уже не проверять )
    pools.forEach(pool => {
        const input = calcInputByPrice4(pool, priceEffective);
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

function findBestDistributionParams(
    amountIn: number,
    pools: Pool[], 
    legPriceInTokenOut: number, 
    minPrice: number,
    maxPrice: number
): PoolsVariantData {
    // TODO: not binary search - but better? 1.01?
    while((maxPrice/minPrice - 1) > 1e-12) {
        const price:number = (maxPrice+minPrice)/2;
        const input = calcInputByPriceTotal(pools, price);
        if (input >= amountIn)   //!!!
            maxPrice = price;
        else
            minPrice = price;
    }
    const price:number = (maxPrice+minPrice)/2;

    let distribution = pools.map(pool => Math.max(calcInputByPrice4(pool, price), 0));

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

function findBestDistribution(
    amountIn: number,
    pools: Pool[],
    tokenInPriceBase: number,
    tokenOutPriceBase: number,
    gasPriceGWeiBase: number
): Route  | [number, number[][]]{
    const legPriceInTokenOut = LegGasConsuming*gasPriceGWeiBase*1e-9/tokenOutPriceBase;

    //TODO: optimize max calculation. 1.5?
/*    let minPrice:number, maxPrice = tokenOutPriceBase/tokenInPriceBase;
    if (calcInputByPriceTotal(pools, legPriceInTokenOut, maxPrice) != 0)
        console.assert(calcInputByPriceTotal(pools, legPriceInTokenOut, maxPrice) == 0, "Internal Error 90");
    for (maxPrice *= 10; calcInputByPriceTotal(pools, legPriceInTokenOut, maxPrice) == 0;)
        maxPrice *= 10
    minPrice = maxPrice/10;*/
    const minPrice = 1e-7;
    const maxPrice = 1e+12;
    
    const params = findBestDistributionParams(amountIn, pools, legPriceInTokenOut, minPrice, maxPrice);
    //console.log(minPrice, maxPrice, params.priceEffective, params.amountOut);

    const distrSorted = params.distribution.map((v, i) => [i, v]).sort((a,b) => b[1] - a[1]);
    params.distribution = distrSorted.map(a => a[1]);
    const poolsSorted = distrSorted.map(a => pools[a[0]]);    

    // Use more fast search instead
    let bestPoolNumber = pools.length;
    let bestOut = params.amountOut - pools.length*legPriceInTokenOut;
    let bestParams = params;
    for (let i = pools.length-1; i >= 1; --i) {
        const shortPoolList = poolsSorted.slice(0, i);
        const p = findBestDistributionParams(amountIn, shortPoolList, legPriceInTokenOut, minPrice, maxPrice);
        const out = p.amountOut - i*legPriceInTokenOut;
        //console.log('a', i, p.priceEffective, p.amountOut, amountIn);
        
        
        //console.log(i, out);
        if (out < bestOut)
        {;} //break;
        else {
            bestPoolNumber = i;
            bestOut = out;
            bestParams = p;
        }
    }
    const finalDistribution = bestParams.distribution.map((v, i) => [distrSorted[i][0], v]);
   /* if (amountIn >= 999) {
        //console.log(finalDistribution.map(p => calcPriceEffective(amountIn*p[1], pools[p[0]])));
        console.log(finalDistribution.map(d => {
            const inn = amountIn*d[1];
            const out = calcOutByIn(pools[d[0]], inn);
            const pr = out/inn;
            d.push(out);
            d.push(pr);
            return d;
        }));
    }*/
    //console.log(amountIn, finalDistribution);
    
   /* binarySearch(
        1, 
        pools.length,
        (n:number) => findBestDistribution2(amountIn, poolsSorted.slice(0, n), legPriceInTokenOut, minPrice, maxPrice),
        (a, b) => { // a is better then b
            const [n1, sum1] = a;
            const [n2, sum2] = b;
            return sum1-n1*legPriceInTokenOut > sum2-n2*legPriceInTokenOut;
        }
    )*/
    
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
    // console.log(amountIn);
    // console.log(order);
     
    
    for (let i = pools.length; i >= 1; --i) {
        const group = order.slice(0, i);
        const sum = group.reduce((a, b) => a+b[1], 0);
        const out = group.map(p => calcOutByIn(pools[p[0]], p[1]/sum*amountIn)).reduce((a, b) => a+b, 0) - legPriceInTokenOut*i;
        // console.log(i, out);
        
        if (out > bestOut) {
            console.assert(flagDown == false, "flagDown at " + amountIn);
            bestOut = out;
            bestGroup = group.map(([n, v]) => [n, v/sum]);
        } else {
            flagDown = true;
           // break;
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
    //        console.assert(flagDown == false, "flagDown at " + amountIn);
            bestOut = out;
            bestGroup = group.map(([n, v]) => [n, v/sum]);
        } else {
            flagDown = true;
           // break;
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
   /* let outCheck = 0, inCheck = 0;
    console.log(amountIn, sum, out);
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
    //console.log("Check out: ", outCheck);
    //console.log("Check in: ", inCheck);
    
    
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

    var testPoolsCPOnly = [testPool1, testPool2, testPool4]
    return {
        testPools,//: testPoolsCPOnly,
        tokenInPriceBase,
        tokenOutPriceBase,
        price1In0
    }
}

var env0 = testEnvironment();

// const legPriceInTokenOut = LegGasConsuming*200*1e-9/env0.tokenOutPriceBase;
// const start = Date.now();
// for (let i = 0; i < 1000; ++i)
//     findBestDistribution(999.01,  env0.testPools, env0.tokenInPriceBase, env0.tokenOutPriceBase, 200); // 100 ms -> 2ms
// // //    findBestDistributionParams(999, env0.testPools, legPriceInTokenOut, 1e-7, 1e12);   // 20ms for 5 pools -> 420mks
// //   findBestDistributionParams(999, env0.testPools, legPriceInTokenOut, 1e-1, 1e1);    // 12ms for 5  -> 250mks
// // for (let i = 0; i < 100_000_000; ++i)
// //     calcInputByPrice4(env0.testPools[2], legPriceInTokenOut, 1.1); // 7ns for product, 26ns for mean, 180mks for hybrid
// //console.log(calcInputByPrice4(env0.testPools[4], legPriceInTokenOut, 122));
// const finish = Date.now();
// console.log(finish-start);

 //const res2 = findBestDistribution3(999.01, env0.testPools, env0.tokenInPriceBase, env0.tokenOutPriceBase, 200);

/*calcOut(666, env0.testPools,
    [
        [2, 0.26], //[2, 0.2501168033445149],
        [3, 0.25],
        //[4, 0.25],
        // [0, 0.24992981838432382]
    ], env0.tokenOutPriceBase, 200);

    calcOut(666, env0.testPools,
        [
            [2, 0.27], //[2, 0.2501168033445149],
            [3, 0.24],
            //[4, 0.25],
            // [0, 0.24992981838432382]
        ], env0.tokenOutPriceBase, 200);
*/
