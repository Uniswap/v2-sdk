import { ChainId } from '../constants';
import { Token } from './token';
import { Pair } from './pair';
import { Price } from './fractions/price';
export declare class Route {
    readonly pairs: Pair[];
    readonly path: Token[];
    readonly input: Token;
    readonly output: Token;
    readonly midPrice: Price;
    constructor(pairs: Pair[], input: Token, output?: Token);
    get chainId(): ChainId;
}
