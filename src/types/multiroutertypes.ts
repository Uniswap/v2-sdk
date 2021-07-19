
export interface Token {
    name: string;
    gasPrice: number;
}

export enum PoolType {
    ConstantProduct = 'ConstantProduct',
    ConstantMean = 'ConstantMean',
    Hybrid = 'Hybrid'
}

export interface Pool {
    address: string;
    token0: Token;
    token1: Token;
    type: PoolType;
    reserve0: number;
    reserve1: number;
    data: ArrayBuffer;
    fee: number;
}

export interface RouteLeg {
    address: string;
    token: Token;
    swapPortion: number;        // For router contract
    absolutePortion: number;    // To depict at webpage for user
}

export interface Route {
    amountIn: number,
    amountOut: number,
    legs: RouteLeg[],
    gasSpent: number,
    totalAmountOut: number
}