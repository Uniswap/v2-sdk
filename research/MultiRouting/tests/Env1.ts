import {PoolType, ConstantMeanDataFromParams, HybridDataFromParams} from '../src/MultiRouter3'

export function testEnvironment1() {
    const price1In0 = 1;
    const reserve = [1_000_000, 100_000, 1_000_000, 1_000_000, 10_000];

    const T1 = {
        name: "1",
        gasPrice: 1*200*1e-9
    }
    const T2 = {
        name: "2",
        gasPrice: 1*200*1e-9
    }

    var testPool1 = {
        token0: T1,
        token1: T2,
        address: "pool1",
        type: PoolType.ConstantProduct,
        reserve0: reserve[0],
        reserve1: reserve[0]/price1In0 - 100,
        data: new ArrayBuffer(16),
        fee: 0.003
    };
    var testPool2 = {
        token0: T1,
        token1: T2,
        address: "pool2",
        type: PoolType.ConstantProduct,
        reserve0: reserve[1],
        reserve1: reserve[1]/price1In0,
        data: new ArrayBuffer(16),
        fee: 0.003
    };
    const weight0 = 90, weight1 = 10;
    var testPool3 = {
        token0: T1,
        token1: T2,
        address: "pool3",
        type: PoolType.ConstantMean,
        reserve0: 2*weight0*price1In0*reserve[2]/(weight0*price1In0 + weight1),
        reserve1: 2*weight1*reserve[2]/(weight0*price1In0 + weight1),
        data: ConstantMeanDataFromParams(weight0, weight1),
        fee: 0.002
    };
    var testPool4 = {
        token0: T1,
        token1: T2,
        address: "pool4",
        type: PoolType.ConstantProduct,
        reserve0: reserve[3] - 100,
        reserve1: reserve[3]/price1In0,
        data: new ArrayBuffer(16),
        fee: 0.003
    };
    var testPool5 = {
        token0: T1,
        token1: T2,
        address: "pool5",
        type: PoolType.Hybrid,
        reserve0: reserve[4],
        reserve1: reserve[4]/price1In0,
        data: HybridDataFromParams(80),
        fee: 0.003
    }; 

    var testPools = [testPool1, testPool2, testPool3, testPool4, testPool5];

    const tokens = [T1, T2];

    return {
        price1In0,
        testPools,
        tokens
    }
}
