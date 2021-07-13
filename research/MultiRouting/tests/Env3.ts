import { PoolType } from '../src/MultiRouterTypes';
import {ConstantMeanDataFromParams, HybridDataFromParams} from '../src/MultiRouterMath'
import {
    MultiRouterConstantMean, 
    MultiRouterConstantProduct, 
    MultiRouterHybrid, 
    MultiRouterParallel, 
    MultiRouterSerial
} from '../src/MultiRouter2'

const price1In0 = 0.1;
const reserve = [1_000_000, 100_000, 1_000_000, 1_000_000, 10_000];
const gasPrice = 1*200*1e-9;

const tokenInPriceBase = 1;
const tokenOutPriceBase = tokenInPriceBase*price1In0;

const T1 = {
    name: "1",
    gasPrice: gasPrice/tokenInPriceBase
}
const T2 = {
    name: "2",
    gasPrice: gasPrice/tokenOutPriceBase
}

const testPool1 = {
    token0: T2,
    token1: T1,
    address: "pool1",
    type: PoolType.ConstantProduct,
    reserve0: reserve[0],
    reserve1: reserve[0]/price1In0 - 100,
    data: new ArrayBuffer(16),
    fee: 0.003
};
const testPool2 = {
    token0: T2,
    token1: T1,
    address: "pool2",
    type: PoolType.ConstantProduct,
    reserve0: reserve[1],
    reserve1: reserve[1]/price1In0,
    data: new ArrayBuffer(16),
    fee: 0.003
};
const weight0 = 90, weight1 = 10;
const testPool3 = {
    token0: T2,
    token1: T1,
    address: "pool3",
    type: PoolType.ConstantMean,
    reserve0: 2*weight0*price1In0*reserve[2]/(weight0*price1In0 + weight1),
    reserve1: 2*weight1*reserve[2]/(weight0*price1In0 + weight1),
    data: ConstantMeanDataFromParams(weight0, weight1),
    fee: 0.002
};
const testPool4 = {
    token0: T2,
    token1: T1,
    address: "pool4",
    type: PoolType.ConstantProduct,
    reserve0: reserve[3] - 200,
    reserve1: reserve[3]/price1In0,
    data: new ArrayBuffer(16),
    fee: 0.003
};

const testPools = [testPool1, testPool2, testPool3, testPool4];

const tokens = [T1, T2];

const r1 = new MultiRouterConstantProduct(testPool1);
const r2 = new MultiRouterConstantProduct(testPool2);
const r3 = new MultiRouterConstantMean(testPool3);
const r4 = new MultiRouterConstantProduct(testPool4);

const r = new MultiRouterParallel([r1, r2, r3, r4], gasPrice/tokenOutPriceBase);
const r6 = new MultiRouterSerial([r, r1]);

export const env3 = {
    name: "env3",
    tokenInPriceBase,
    tokenOutPriceBase,
    price1In0,
    gasPrice,
    testPools,
    tokens,
    routers: [r1, r2, r3, r4, r4, r, r6]
}
