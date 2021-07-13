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

const price = [1.2,2,0.5];
const tokens = price.map((p, i) => ({
    name: '' + (i+1),
    gasPrice: gasPrice/p
}));

const testPool1 = {
    token0: tokens[0],
    token1: tokens[1],
    address: "pool1",
    type: PoolType.ConstantProduct,
    reserve0: 1_000_000,
    reserve1: 1_000_000/(price[1]/price[0]) - 100,
    data: new ArrayBuffer(16),
    fee: 0.003
};
const testPool2 = {
    token0: tokens[1],
    token1: tokens[2],
    address: "pool1",
    type: PoolType.ConstantProduct,
    reserve0: 1_000_000,
    reserve1: 1_000_000/(price[2]/price[1]),
    data: new ArrayBuffer(16),
    fee: 0.003
};
/*
const weight0 = 90, weight1 = 10;
const testPool3 = {
    token0: T1,
    token1: T2,
    address: "pool3",
    type: PoolType.ConstantMean,
    reserve0: 2*weight0*price1In0*reserve[2]/(weight0*price1In0 + weight1),
    reserve1: 2*weight1*reserve[2]/(weight0*price1In0 + weight1),
    data: ConstantMeanDataFromParams(weight0, weight1),
    fee: 0.002
};
const testPool4 = {
    token0: T1,
    token1: T2,
    address: "pool4",
    type: PoolType.ConstantProduct,
    reserve0: reserve[3] - 100,
    reserve1: reserve[3]/price1In0,
    data: new ArrayBuffer(16),
    fee: 0.003
};
const testPool5 = {
    token0: T1,
    token1: T2,
    address: "pool5",
    type: PoolType.Hybrid,
    reserve0: reserve[4],
    reserve1: reserve[4]/price1In0,
    data: HybridDataFromParams(80),
    fee: 0.003
}; */

const testPools = [testPool1, testPool2];

const r1 = new MultiRouterConstantProduct(testPool1);
const r2 = new MultiRouterConstantProduct(testPool2);

const r = new MultiRouterSerial([r1, r2]);

export const env4 = {
    name: "env1",
    // tokenInPriceBase,
    // tokenOutPriceBase,
    // price1In0,
    gasPrice,
    testPools,
    tokens,
    routers: [r1, r2, r],
    routerPrice: [price[1]/price[0], price[2]/price[1], price[2]/price[0]],
    routerTokenOutPrice: [price[1], price[2], price[2]]
}
