import { Token } from '../token';
import { TokenAmount } from './tokenAmount';
import { BigintIsh, Rounding } from '../../constants';
import { Route } from '../route';
import { Fraction } from './fraction';
export declare class Price extends Fraction {
    readonly baseCurrency: Token;
    readonly quoteCurrency: Token;
    readonly scalar: Fraction;
    static fromRoute(route: Route): Price;
    constructor(baseCurrency: Token, quoteCurrency: Token, denominator: BigintIsh, numerator: BigintIsh);
    get raw(): Fraction;
    get adjusted(): Fraction;
    invert(): Price;
    multiply(other: Price): Price;
    quote(currencyAmount: TokenAmount): TokenAmount;
    toSignificant(significantDigits?: number, format?: object, rounding?: Rounding): string;
    toFixed(decimalPlaces?: number, format?: object, rounding?: Rounding): string;
}
