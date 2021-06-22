import { Token, WNATIVE } from '../Token'

import { Currency } from '../Currency'
import { NativeCurrency } from '../NativeCurrency'
import invariant from 'tiny-invariant'

export class Matic extends NativeCurrency {
  protected constructor(chainId: number) {
    super(chainId, 18, 'MATIC', 'Matic')
  }

  public get wrapped(): Token {
    const wnative = WNATIVE[this.chainId]
    invariant(!!wnative, 'WRAPPED')
    return wnative
  }

  private static _cache: { [chainId: number]: Matic } = {}

  public static onChain(chainId: number): Matic {
    return this._cache[chainId] ?? (this._cache[chainId] = new Matic(chainId))
  }

  public equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId
  }
}
