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
const testPool1_2 = {
    token0: tokens[0],
    token1: tokens[1],
    address: "pool1",
    type: PoolType.ConstantProduct,
    reserve0: 1_000_000,
    reserve1: 1_000_000/(price[1]/price[0]),
    data: new ArrayBuffer(16),
    fee: 0.003
};
const testPool2 = {
    token0: tokens[1],
    token1: tokens[2],
    address: "pool1",
    type: PoolType.ConstantProduct,
    reserve0: 1_00_000,
    reserve1: 1_00_000/(price[2]/price[1]),
    data: new ArrayBuffer(16),
    fee: 0.003
};
const testPool2_2 = {
    token0: tokens[1],
    token1: tokens[2],
    address: "pool1",
    type: PoolType.ConstantProduct,
    reserve0: 1_000_000,
    reserve1: 1_000_000/(price[2]/price[1]),
    data: new ArrayBuffer(16),
    fee: 0.003
};

const testPools = [testPool1, testPool1_2, testPool2, testPool2_2];

const r1 = new MultiRouterConstantProduct(testPool1);
const r1_2 = new MultiRouterConstantProduct(testPool1_2);
const r1All = new MultiRouterParallel([r1, r1_2], gasPrice);
const r2 = new MultiRouterConstantProduct(testPool2);
const r2_2 = new MultiRouterConstantProduct(testPool2_2);
const r2All = new MultiRouterParallel([r2, r2_2], gasPrice);

const r = new MultiRouterSerial([r1All, r2All]);

export const env5 = {
    name: "env5",
    // tokenInPriceBase,
    // tokenOutPriceBase,
    // price1In0,
    gasPrice,
    testPools,
    tokens,
    routers: [r],
    routerPrice: [price[2]/price[0]],
    routerTokenOutPrice: [price[2]]
}
