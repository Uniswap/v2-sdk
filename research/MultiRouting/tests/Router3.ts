
import {Graph} from '../src/MultiRouter3'
import {testEnvironment1} from './Env1'
export * as MultiRouter2 from '../src/MultiRouter2'

function test1(pool: number, amountIn: number) {
    const env = testEnvironment1();
    const g = new Graph(pool >= 0 ? [env.testPools[pool]] : env.testPools);
    const p = g.findBestPath(env.tokens[0], env.tokens[1], amountIn);
    return p;
}

function test2(pool: number, amountIn: number) {
    const env = testEnvironment1();
    const g = new Graph(pool >= 0 ? [env.testPools[pool]] : env.testPools);
    const p = g.findBestPath(env.tokens[1], env.tokens[0], amountIn);
    return p;
}

export function test3(pool: number, amountIn: number, steps: number) {
    const env = testEnvironment1();
    const g = new Graph(pool >= 0 ? [env.testPools[pool]] : env.testPools);
    const res = g.findBestMultiPath(env.tokens[0], env.tokens[1], amountIn, steps);
    return [env, res];
}

function test4(pool: number, amountIn: number, steps: number) {
    const env = testEnvironment1();
    const g = new Graph(pool >= 0 ? [env.testPools[pool]] : env.testPools);
    const res = g.findBestMultiPath(env.tokens[1], env.tokens[0], amountIn, steps);
    return res;
}

test3(-1, 500, 100);