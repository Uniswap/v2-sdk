import invariant from 'tiny-invariant';
import JSBI from 'jsbi';
import { Rounding, SolidityType, TEN } from '../../constants';
import { parseBigintIsh, validateSolidityTypeInstance } from '../../utils';
import { Fraction } from './fraction';
import toFormat from 'toformat';
import _Big from 'big.js';
const Big = toFormat(_Big);
export class TokenAmount extends Fraction {
    // amount _must_ be raw, i.e. in the native representation
    constructor(token, amount) {
        const parsedAmount = parseBigintIsh(amount);
        validateSolidityTypeInstance(parsedAmount, SolidityType.uint256);
        super(parsedAmount, JSBI.exponentiate(TEN, JSBI.BigInt(token.decimals)));
        this.token = token;
    }
    get raw() {
        return this.numerator;
    }
    add(other) {
        invariant(this.token.equals(other.token), 'TOKEN');
        return new TokenAmount(this.token, JSBI.add(this.raw, other.raw));
    }
    subtract(other) {
        invariant(this.token.equals(other.token), 'TOKEN');
        return new TokenAmount(this.token, JSBI.subtract(this.raw, other.raw));
    }
    toSignificant(significantDigits = 6, format, rounding = Rounding.ROUND_DOWN) {
        return super.toSignificant(significantDigits, format, rounding);
    }
    toFixed(decimalPlaces = this.token.decimals, format, rounding = Rounding.ROUND_DOWN) {
        invariant(decimalPlaces <= this.token.decimals, 'DECIMALS');
        return super.toFixed(decimalPlaces, format, rounding);
    }
    toExact(format = { groupSeparator: '' }) {
        Big.DP = this.token.decimals;
        return new Big(this.numerator.toString()).div(this.denominator.toString()).toFormat(format);
    }
}
//# sourceMappingURL=tokenAmount.js.map