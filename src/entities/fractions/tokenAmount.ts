import JSBI from 'jsbi'
import invariant from 'tiny-invariant'
import { CurrencyAmount } from './currencyAmount'
import { Token } from '../token'
import { BigintIsh } from '../../constants'

export class TokenAmount extends CurrencyAmount {
  public readonly token: Token

  public constructor(token: Token, amount: BigintIsh) {
    super(token, amount)
    this.token = token
  }

  public add(other: TokenAmount): TokenAmount {
    invariant(this.token.equals(other.token), 'TOKEN')
    return new TokenAmount(this.token, JSBI.add(this.raw, other.raw))
  }

  public subtract(other: TokenAmount): TokenAmount {
    invariant(this.token.equals(other.token), 'TOKEN')
    return new TokenAmount(this.token, JSBI.subtract(this.raw, other.raw))
  }
}
