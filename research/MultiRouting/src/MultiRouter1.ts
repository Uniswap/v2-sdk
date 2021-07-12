import { calcInputByPrice, calcOutByIn, calcPrice, revertPositive } from './MultiRouterMath';
import {PoolType, Pool, Route} from './MultiRouterTypes'

const LegGasConsuming = 40_000;

function calcPoolChainOutByIn(pools:Pool[], amountIn: number): number {
    return pools.reduce((input, p) => calcOutByIn(p, input), amountIn);
}

function calcPoolChainPrice(pools:Pool[], amountIn: number): number {
    let out = amountIn, derivative = 1;
    const last = pools.length - 1;
    for (let i = 0; i < last; ++i) {
        derivative *= calcPrice(pools[i], out);
        out = calcOutByIn(pools[i], out);
    }
    const res = derivative * calcPrice(pools[last], out);

    // TODO: to delete
    const res2 = (calcPoolChainOutByIn(pools, amountIn + 0.01) - calcPoolChainOutByIn(pools, amountIn))/0.01;
    if (Math.abs(res/res2-1) > 1e-5)
        console.error("163 " + res + " " + res2 + " " + Math.abs(res/res2-1));

    return res;
}

function calcPoolChainInputByPrice(pools:Pool[], priceEffective: number, hint = 1): number {
    if (pools.length == 1)
        return calcInputByPrice(pools[0], priceEffective, hint);

    return revertPositive( (x:number) => 1/calcPoolChainPrice(pools, x), priceEffective, hint);
}

function calcInputByPriceParallel(pools: Pool[], priceEffective: number): number {
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
    for (maxPrice = minPrice*2; calcInputByPriceParallel(pools, maxPrice) < amountIn; maxPrice *=2);
    minPrice = maxPrice/2;
    while((maxPrice/minPrice - 1) > 1e-12) {
        const price:number = (maxPrice+minPrice)/2;
        const input = calcInputByPriceParallel(pools, price);
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

export function findBestDistributionIdeal(
    amountIn: number,
    pools: Pool[],
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
    let bestOut = params.amountOut - pools.length*legPriceInTokenOut;
    let bestParams = params;
    for (let i = pools.length-1; i >= 1; --i) {
        const shortPoolList = poolsSorted.slice(0, i);
        const p = findBestDistributionIdealParams(amountIn, shortPoolList, minPrice);
        const out = p.amountOut - i*legPriceInTokenOut;
        if (out < bestOut){
            //break;        // TODO: uncomment?
        } else {
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
    tokenOutPriceBase: number,
    gasPriceGWeiBase: number
): Route  | [number, number[][]]{
    const legPriceInTokenOut = LegGasConsuming*gasPriceGWeiBase*1e-9/tokenOutPriceBase;    

    const out = pools.map(p => calcOutByIn(p, amountIn/pools.length));
    const sum = out.reduce((a, b) => a+b, 0);
    const order = out.map((o, i) => [i, o/sum]).sort((a,b) => b[1] - a[1]);
    
    let bestGroup = order;
    let bestOut = -legPriceInTokenOut*pools.length*2;     
    
    for (let i = pools.length; i >= 1; --i) {
        const group = order.slice(0, i);
        const sum = group.reduce((a, b) => a+b[1], 0);
        const out = group.map(p => calcOutByIn(pools[p[0]], p[1]/sum*amountIn)).reduce((a, b) => a+b, 0) - legPriceInTokenOut*i;
        
        if (out > bestOut) {
            bestOut = out;
            bestGroup = group.map(([n, v]) => [n, v/sum]);
        } else {
           // break;        // TODO: unconmment?
        }
    }
        
    const checkedOut = calcOut(amountIn, pools, bestGroup, tokenOutPriceBase, gasPriceGWeiBase);
    return [checkedOut, bestGroup];
}

function findBestDistributionWithoutTransactionCost(
    amountIn: number,
    pools: Pool[]       // TODO: maybe use initial distribution?
): [number, number[]] {

    if (pools.length == 1) {
        return [calcOutByIn(pools[0], amountIn), [1]];
    }

    let distr = pools.map(p => Math.max(calcOutByIn(p, amountIn/pools.length), 0));
    
    for(let i = 0; i < 5; ++i) {
        const sum = distr.reduce((a, b) => a+b, 0);
        console.assert(sum > 0, "508 " + sum);
        
        const prices = distr.map((d, j) => 1/calcPrice(pools[j], amountIn*d/sum))
        const pr = prices.reduce((a, b) => Math.max(a, b), 0);
        
        distr = pools.map((p, i) => calcInputByPrice(p, pr, distr[i]));        
    }

    const sum = distr.reduce((a, b) => a + b, 0);
    distr = distr.map(d => d/sum);
    const out = distr.map((p, i) => calcOutByIn(pools[i], p*amountIn)).reduce((a, b) => a+b, 0);

    return [out, distr];
}

export function findBestDistribution(
    amountIn: number,
    pools: Pool[],
    tokenOutPriceBase: number,
    gasPriceGWeiBase: number
): Route  | [number, number[][]]{
    const legPriceInTokenOut = LegGasConsuming*gasPriceGWeiBase*1e-9/tokenOutPriceBase;

    let [bestOut, distr] = findBestDistributionWithoutTransactionCost(amountIn, pools);
    bestOut -= legPriceInTokenOut*pools.length;
    let bestGroup = distr.map((d, i) => [i, d]).sort((a,b) => b[1] - a[1]);
    
    let flagDown = false;
    const poolsSorted = bestGroup.map(a => pools[a[0]]);    
    for (let i = pools.length-1; i >= 1; --i) {
        const group = poolsSorted.slice(0, i);
        let [out, distr] = findBestDistributionWithoutTransactionCost(amountIn, group);
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

function findBesChaintDistributionWithoutTransactionCost(
    amountIn: number,
    poolChains: Pool[][]       // TODO: maybe use initial distribution?
): [number, number[]] {

    if (poolChains.length == 1) {
        return [calcPoolChainOutByIn(poolChains[0], amountIn), [1]];
    }

    let distr = poolChains.map(p => Math.max(calcPoolChainOutByIn(p, amountIn/poolChains.length), 0));
    
    for(let i = 0; i < 5; ++i) {
        const sum = distr.reduce((a, b) => a+b, 0);
        console.assert(sum > 0, "508 " + sum);
        
        const prices = distr.map((d, j) => 1/calcPoolChainPrice(poolChains[j], amountIn*d/sum))
        const pr = prices.reduce((a, b) => Math.max(a, b), 0);
        
        distr = poolChains.map((p, i) => calcPoolChainInputByPrice(p, pr, distr[i]));        
    }

    const sum = distr.reduce((a, b) => a + b, 0);
    distr = distr.map(d => d/sum);
    const out = distr.map((p, i) => calcPoolChainOutByIn(poolChains[i], p*amountIn)).reduce((a, b) => a+b, 0);

    return [out, distr];
}

function findBestChainDistribution(
    amountIn: number,
    poolChains: Pool[][],
    tokenOutPriceBase: number,
    gasPriceGWeiBase: number
): Route  | [number, number[][]]{
    const legPriceInTokenOut = LegGasConsuming*gasPriceGWeiBase*1e-9/tokenOutPriceBase;

    let [bestOut, distr] = findBesChaintDistributionWithoutTransactionCost(amountIn, poolChains);
    let bestGroup = distr.map((d, i) => [i, d]).sort((a,b) => b[1] - a[1]);
    let totalJumps = 0;
    const poolNumber:number[] = [];
    for (let i = 0; i < poolChains.length; ++i) {
        totalJumps += poolChains[bestGroup[i][0]].length;
        poolNumber[i] = totalJumps;
    }
    bestOut -= legPriceInTokenOut*totalJumps;
    
    let flagDown = false;
    const poolsSorted = bestGroup.map(a => poolChains[a[0]]);    
    for (let i = poolChains.length-1; i >= 1; --i) {
        const group = poolsSorted.slice(0, i);
        let [out, distr] = findBesChaintDistributionWithoutTransactionCost(amountIn, group);
        out -= legPriceInTokenOut*poolNumber[i-1];
        
        if (out > bestOut) {
            console.assert(flagDown == false, "408 flagDown at " + amountIn);
            bestOut = out;
            bestGroup = distr.map((d, i) => [bestGroup[i][0], d]);
        } else {
            flagDown = true;
           // break;            // TODO: uncomment for speed up ???
        }
    }
        
    const checkedOut = calcPoolChainOut(amountIn, poolChains, bestGroup, tokenOutPriceBase, gasPriceGWeiBase);
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

function calcPoolChainOut(
    amountIn: number,
    poolChains: Pool[][],
    distribution: number[][],
    tokenOutPriceBase: number,
    gasPriceGWeiBase: number
): number {
    const legPriceInTokenOut = LegGasConsuming*gasPriceGWeiBase*1e-9/tokenOutPriceBase;  
    const sum = distribution.reduce((a, b) => a + b[1], 0);
    const out = distribution.map(p => calcPoolChainOutByIn(poolChains[p[0]], p[1]/sum*amountIn)).reduce((a, b) => a+b, 0);
    let totalJumps = distribution.reduce((a, p) => a += poolChains[p[0]].length, 0);
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
    return out - legPriceInTokenOut*totalJumps;
}
