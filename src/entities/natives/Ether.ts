import { Token, WETH9 } from '../Token'

import { Currency } from '../Currency'
import { NativeCurrency } from '../NativeCurrency'
import invariant from 'tiny-invariant'

/**
 * Ether is the main usage of a 'native' currency, i.e. for Ethereum mainnet and all testnets
 */
export class Ether extends NativeCurrency {
  protected constructor(chainId: number) {
    super(chainId, 18, 'ETH', 'Ether')
  }

  public get wrapped(): Token {
    const weth9 = WETH9[this.chainId]
    invariant(!!weth9, 'WRAPPED')
    return weth9
  }

  private static _etherCache: { [chainId: number]: Ether } = {}

  public static onChain(chainId: number): Ether {
    return (
      this._etherCache[chainId] ??
      (this._etherCache[chainId] = new Ether(chainId))
    )
  }

  public equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId
  }
}
