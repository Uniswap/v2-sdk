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

// Bridge:
//   /1\
// -0 | 3-
//   \2/

const price = [1,1,1,1];
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

const testPool0_1 = getPool(0, 1, 1_000_000);
const testPool0_2 = getPool(0, 2, 1_00_000);
const testPool1_2 = getPool(1, 2, 1_000_000);
const testPool1_3 = getPool(1, 3, 1_00_000);
const testPool2_3 = getPool(2, 3, 1_000_000);

const testPools = [
    testPool0_1, testPool0_2, testPool1_3, testPool2_3, testPool1_2,
];

const r = new MultiRouterParallel([
    new MultiRouterSerial([
        new MultiRouterConstantProduct(testPool0_1),
        new MultiRouterConstantProduct(testPool1_3),
    ]),
    new MultiRouterSerial([
        new MultiRouterConstantProduct(testPool0_2),
        new MultiRouterConstantProduct(testPool2_3),
    ]),
], gasPrice);

const r2 = new MultiRouterSerial([
    new MultiRouterParallel([
        new MultiRouterSerial([
            new MultiRouterConstantProduct(testPool0_1),
            new MultiRouterConstantProduct(testPool1_2),
        ]),
        new MultiRouterConstantProduct(testPool0_2),
    ], gasPrice),
    new MultiRouterConstantProduct(testPool2_3),
]);

export const Bridge = {
    name: "Bridge",
    gasPrice,
    testPools,
    tokens,
    routers: [r, r2],
    routerPrice: [price[3]/price[0], price[3]/price[0]],
    routerTokenOutPrice: [price[3], price[3]]
}
