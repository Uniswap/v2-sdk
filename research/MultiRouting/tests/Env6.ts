import { PoolType } from '../src/MultiRouterTypes';
import {ConstantMeanDataFromParams, HybridDataFromParams} from '../src/MultiRouterMath'
import {
    MultiRouterConstantMean, 
    MultiRouterConstantProduct, 
    MultiRouterHybrid, 
    MultiRouterParallel, 
    MultiRouterSerial
} from '../src/MultiRouter2'

const gasPrice = 1*200*1e-9;

// 0-1-3
//  \2/
const price = [1.2,2,0.5, 0.1];
const tokens = price.map((p, i) => ({
    name: '' + (i+1),
    gasPrice: gasPrice/p
}));

function getPool(t0: number, t1: number, reserve: number, fee=0.003, imbalance = 0) {
    return {
        token0: tokens[t0],
        token1: tokens[t1],
        address: `pool-${t0}-${t1}-${reserve}-${fee}`,
        type: PoolType.ConstantProduct,
        reserve0: reserve,
        reserve1: reserve/(price[t1]/price[t0]) - imbalance,
        data: new ArrayBuffer(16),
        fee
    };
}

const testPool1_1 = getPool(0, 1, 1_000_000);
const testPool1_2 = getPool(0, 1, 1_000_000, 0.003, 100);
const testPool1_3 = getPool(0, 1, 100_000);
const r1 = new MultiRouterParallel([
    new MultiRouterConstantProduct(testPool1_1),
    new MultiRouterConstantProduct(testPool1_2),
    new MultiRouterConstantProduct(testPool1_3),
], gasPrice);

const testPool2_1 = getPool(1, 3, 1_000_000);
const testPool2_2 = getPool(1, 3, 1_000_000, 0.003, 100);
const testPool2_3 = getPool(1, 3, 100_000);
const r2 = new MultiRouterParallel([
    new MultiRouterConstantProduct(testPool2_1),
    new MultiRouterConstantProduct(testPool2_2),
    new MultiRouterConstantProduct(testPool2_3),
], gasPrice);

const testPool3_1 = getPool(0, 2, 1_000_000);
const testPool3_2 = getPool(0, 2, 1_000_000, 0.003, 100);
const testPool3_3 = getPool(0, 2, 100_000);
const r3 = new MultiRouterParallel([
    new MultiRouterConstantProduct(testPool3_1),
    new MultiRouterConstantProduct(testPool3_2),
    new MultiRouterConstantProduct(testPool3_3),
], gasPrice);

const testPool4_1 = getPool(2, 3, 1_000_000);
const testPool4_2 = getPool(2, 3, 1_000_000, 0.003, 100);
const testPool4_3 = getPool(2, 3, 100_000);
const r4 = new MultiRouterParallel([
    new MultiRouterConstantProduct(testPool4_1),
    new MultiRouterConstantProduct(testPool4_2),
    new MultiRouterConstantProduct(testPool4_3),
], gasPrice);

const testPool5_1 = getPool(0, 3, 100_000, 0.005);
const testPool5_2 = getPool(0, 3, 100_000, 0.005, 100);
const testPool5_3 = getPool(0, 3, 100_000, 0.005);
const rr1 = new MultiRouterConstantProduct(testPool5_1);
const rr2 = new MultiRouterConstantProduct(testPool5_2);
const rr3 = new MultiRouterConstantProduct(testPool5_3);

const testPools = [
    testPool1_1, testPool1_2, testPool1_3, testPool2_1, testPool2_2, testPool2_3,
    testPool3_1, testPool3_2, testPool3_3, testPool4_1, testPool4_2, testPool4_3,
    testPool5_1, testPool5_2, testPool5_3,
];

const s1 = new MultiRouterSerial([r1, r2]);
const s2 = new MultiRouterSerial([r3, r4]);
const r = new MultiRouterParallel([s1, s2, rr1, rr2, rr3], gasPrice);

export const env6 = {
    name: "env6",
    // tokenInPriceBase,
    // tokenOutPriceBase,
    // price1In0,
    gasPrice,
    testPools,
    tokens,
    routers: [r],
    routerPrice: [price[3]/price[0]],
    routerTokenOutPrice: [price[3]]
}
