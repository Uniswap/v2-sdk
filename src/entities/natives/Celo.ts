import { Token, WNATIVE } from '../Token'

import { Currency } from '../Currency'
import { NativeCurrency } from '../NativeCurrency'
import invariant from 'tiny-invariant'

export class Celo extends NativeCurrency {
  protected constructor(chainId: number) {
    super(chainId, 18, 'CELO', 'Celo')
  }

  public get wrapped(): Token {
    const wcelo = WNATIVE[this.chainId]
    invariant(!!wcelo, 'WRAPPED')
    return wcelo
  }

  private static _cache: { [chainId: number]: Celo } = {}

  public static onChain(chainId: number): Celo {
    return this._cache[chainId] ?? (this._cache[chainId] = new Celo(chainId))
  }

  public equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId
  }
}
