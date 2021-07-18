import * as _ from 'lodash'
import {Pool, PoolType, Token} from '../src/MultiRouterTypes'
import {MultiRouter, MultiRouterParallel} from '../src/MultiRouter2'
import { Graph } from '../src/MultiRouter3';
import { env1 } from './Env1';
import { findBestDistributionIdeal } from '../src/MultiRouter1';

interface Environment {
    name: string;
    tokenInPriceBase : number;
    tokenOutPriceBase: number;
    price1In0: number;
    gasPrice: number;
    testPools: Pool[],
    tokens: Token[],
    routers: MultiRouter[],
    routerPrice: number[],
    routerTokenOutPrice: number[]
}

export enum RouterType {
    MultiRouter05 = 'MultiRouter0.5',
    MultiRouter1 = 'MultiRouter1',
    MultiRouter2 = 'MutiRouter2',
    MultiRouter3 = 'MutiRouter3'
}

const findBestDistributionIdealMemo = _.memoize(
    (amountIn, env) => findBestDistributionIdeal(amountIn, env.testPools, env.tokenOutPriceBase, env.gasPrice/1e-9),
    (amountIn, env) => `${amountIn}_${env1}`
)

export function usage(env: Environment, router: RouterType, poolNum: number, options: any) {
    switch(router) {
        case RouterType.MultiRouter05: {
            return amountIn => {
                const distr = findBestDistributionIdealMemo(amountIn, env)[1];
                const usage = distr.find(a => a[0] == poolNum);
                return usage ? usage[1] : 0;
            }
        }
        case RouterType.MultiRouter2: {
            return amountIn => {
                const distr = (env.routers[5] as MultiRouterParallel).getDistrib(amountIn);
                const usage = distr.find(a => a[0] == poolNum);
                return usage ? usage[1] : 0;
            }
        }
    }
}

export function loss(env: Environment, router: RouterType, poolNum: number, options: any) {
    switch(router) {
        case RouterType.MultiRouter2:
            if (poolNum >= env.routers.length)
                return x => 0;
            return amountIn => {
                const amountOutIdeal = amountIn/env.routerPrice[poolNum];
                let [out, gas] = env.routers[poolNum].calcOutByIn(amountIn);
                out -= gas*env.gasPrice/env.routerTokenOutPrice[poolNum];
                const res = (amountOutIdeal - out)/amountOutIdeal;
                return res;
            }
        case RouterType.MultiRouter3: {
            if (poolNum >= 0 && poolNum >= env.testPools.length)
                return x => 0;
            const g = new Graph(poolNum >= 0 ? [env.testPools[poolNum]] : env.testPools);
            options = {
                steps: 20,
                from: 0,
                to: 1,
                ...options
            }
            return amountIn => {
                const out = g.findBestRoute(env.tokens[options.from], env.tokens[options.to], amountIn, options.steps);
                const price = env.tokens[options.to].gasPrice/env.tokens[options.from].gasPrice;
                const amountOutIdeal = amountIn*price;
                const res = (amountOutIdeal - out.totalAmountOut)/amountOutIdeal;
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

export function price(env: Environment, router: RouterType, poolNum) {
    switch(router) {
    case RouterType.MultiRouter2:
        return amountIn => {
            return env.routers[poolNum].calcPrice(amountIn);
        }
    }
}

export function input(env: Environment, router: RouterType, poolNum) {
    switch(router) {
    case RouterType.MultiRouter2:
        return amountIn => {
            return env.routers[poolNum].calcInputByPrice(amountIn, 1);
        }
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
    const res = g.findBestRoute(env.tokens[0], env.tokens[1], amountIn, steps);
    return [env, res];
}

function test4(pool: number, amountIn: number, steps: number) {
    const env = env1;
    const g = new Graph(pool >= 0 ? [env.testPools[pool]] : env.testPools);
    const res = g.findBestRoute(env.tokens[1], env.tokens[0], amountIn, steps);
    return res;
}