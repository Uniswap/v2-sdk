import { Token, WNATIVE } from '../Token'

import { Currency } from '../Currency'
import { NativeCurrency } from '../NativeCurrency'
import invariant from 'tiny-invariant'

export class Heco extends NativeCurrency {
  protected constructor(chainId: number) {
    super(chainId, 18, 'HT', 'Huobi Token')
  }

  public get wrapped(): Token {
    const wnative = WNATIVE[this.chainId]
    invariant(!!wnative, 'WRAPPED')
    return wnative
  }

  private static _cache: { [chainId: number]: Heco } = {}

  public static onChain(chainId: number): Heco {
    return this._cache[chainId] ?? (this._cache[chainId] = new Heco(chainId))
  }

  public equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId
  }
}
