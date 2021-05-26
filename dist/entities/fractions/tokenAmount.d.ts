import { Token } from '../token';
import JSBI from 'jsbi';
import { BigintIsh, Rounding } from '../../constants';
import { Fraction } from './fraction';
export declare class TokenAmount extends Fraction {
    readonly token: Token;
    constructor(token: Token, amount: BigintIsh);
    get raw(): JSBI;
    add(other: TokenAmount): TokenAmount;
    subtract(other: TokenAmount): TokenAmount;
    toSignificant(significantDigits?: number, format?: object, rounding?: Rounding): string;
    toFixed(decimalPlaces?: number, format?: object, rounding?: Rounding): string;
    toExact(format?: object): string;
}
