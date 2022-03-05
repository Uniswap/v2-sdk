import invariant from 'tiny-invariant'
import JSBI from 'jsbi'
import { Currency, ETHER } from '../currency'
import { Fraction } from './fraction'
import _Big from 'big.js'

import toFormat from 'toformat'
import { BigintIsh, Rounding, TEN, SolidityType } from '../../constants'
import { parseBigintIsh } from '../../utils/parseBigintIsh'
import { validateSolidityTypeInstance } from '../../utils/validateSolidityTypeInstance'

const Big = toFormat(_Big)

export class CurrencyAmount extends Fraction {
  public readonly currency: Currency

  public get raw(): JSBI {
    return this.numerator
  }

  static ether(amount: BigintIsh): CurrencyAmount {
    return new CurrencyAmount(ETHER, amount)
  }

  protected constructor(currency: Currency, amount: BigintIsh) {
    const parsedAmount = parseBigintIsh(amount)
    validateSolidityTypeInstance(parsedAmount, SolidityType.uint256)

    super(parsedAmount, JSBI.exponentiate(TEN, JSBI.BigInt(currency.decimals)))
    this.currency = currency
  }

  public add(other: CurrencyAmount): CurrencyAmount {
    invariant(this.currency.equals(other.currency), 'CURRENCY')
    return new CurrencyAmount(this.currency, JSBI.add(this.raw, other.raw))
  }

  public subtract(other: CurrencyAmount): CurrencyAmount {
    invariant(this.currency.equals(other.currency), 'CURRENCY')
    return new CurrencyAmount(this.currency, JSBI.subtract(this.raw, other.raw))
  }

  public toSignificant(
    significantDigits: number = 6,
    format?: object,
    rounding: Rounding = Rounding.ROUND_DOWN
  ): string {
    return super.toSignificant(significantDigits, format, rounding)
  }

  public toFixed(
    decimalPlaces: number = this.currency.decimals,
    format?: object,
    rounding: Rounding = Rounding.ROUND_DOWN
  ): string {
    invariant(decimalPlaces <= this.currency.decimals, 'DECIMALS')
    return super.toFixed(decimalPlaces, format, rounding)
  }

  public toExact(format: object = { groupSeparator: '' }): string {
    Big.DP = this.currency.decimals
    return new Big(this.numerator.toString()).div(this.denominator.toString()).toFormat(format)
  }
}
