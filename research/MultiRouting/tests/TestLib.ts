import {Pool, Token} from '../src/MultiRouterTypes'
import {MultiRouter} from '../src/MultiRouter2'
import { Graph } from '../src/MultiRouter3';
import { env1 } from './Env1';

interface Environment {
    tokenInPriceBase : number;
    tokenOutPriceBase: number;
    price1In0: number;
    gasPrice: number;
    testPools: Pool[],
    tokens: Token[],
    routers: MultiRouter[]
}

export enum RouterType {
    MultiRouter05 = 'MultiRouter0.5',
    MultiRouter1 = 'MultiRouter1',
    MultiRouter2 = 'MutiRouter2',
    MultiRouter3 = 'MutiRouter3'
}

export function loss(env: Environment, router: RouterType, poolNum: number, options: any) {
    switch(router) {
        case RouterType.MultiRouter2:   
            return amountIn => {
                // if (poolNum == -1)
                //     poolNum = 5;
                const amountOutIdeal = amountIn/env.price1In0;
                let [out, gas] = env.routers[poolNum].calcOutByIn(amountIn);
                out -= gas*env.gasPrice*env.tokenOutPriceBase;
                const res = (amountOutIdeal - out)/amountOutIdeal;
                return res;
            }
        case RouterType.MultiRouter3: {
            const g = new Graph(poolNum >= 0 ? [env.testPools[poolNum]] : env.testPools);
            return amountIn => {
                const out = g.findBestMultiPath(env.tokens[0], env.tokens[1], amountIn, options.steps);
                const amountOutIdeal = amountIn/env.price1In0;
                const res = (amountOutIdeal - out.totalOutput)/amountOutIdeal;
                return res;
            }
        }
    }
}

export function lossRatio(
    env: Environment, 
    router1: RouterType, 
    poolNum1: number, 
    options1: any, 
    router2: RouterType, 
    poolNum2: number, 
    options2: any
) {
    return amountIn => {
        const l1 = loss(env, router1, poolNum1, options1)(amountIn);
        const l2 = loss(env, router2, poolNum2, options2)(amountIn);
        return l1/l2 - 1;
    }
}

function test1(pool: number, amountIn: number) {
    const env = env1;
    const g = new Graph(pool >= 0 ? [env.testPools[pool]] : env.testPools);
    const p = g.findBestPath(env.tokens[0], env.tokens[1], amountIn);
    return p;
}

function test2(pool: number, amountIn: number) {
    const env = env1;
    const g = new Graph(pool >= 0 ? [env.testPools[pool]] : env.testPools);
    const p = g.findBestPath(env.tokens[1], env.tokens[0], amountIn);
    return p;
}

function test3(pool: number, amountIn: number, steps: number) {
    const env = env1;
    const g = new Graph(pool >= 0 ? [env.testPools[pool]] : env.testPools);
    const res = g.findBestMultiPath(env.tokens[0], env.tokens[1], amountIn, steps);
    return [env, res];
}

function test4(pool: number, amountIn: number, steps: number) {
    const env = env1;
    const g = new Graph(pool >= 0 ? [env.testPools[pool]] : env.testPools);
    const res = g.findBestMultiPath(env.tokens[1], env.tokens[0], amountIn, steps);
    return res;
}