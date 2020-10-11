import JSBI from 'jsbi'

import { SolidityType, ChainId } from '../constants'
import { validateSolidityTypeInstance } from '../utils'

/**
 * A currency is any fungible financial instrument on Ethereum, including Ether and all ERC20 tokens.
 *
 * The only instance of the base class `Currency` is Ether.
 */
export class Currency {
  public readonly decimals: number
  public readonly symbol?: string
  public readonly name?: string

  /**
   * The only instance of the base class `Currency`.
   */
  public static readonly ETHER: Currency = new Currency(18, 'ETH', 'Ether')
  public static readonly EXPANSE: Currency = new Currency(18, 'EXP', 'Expanse')

  /**
   * Constructs an instance of the base class `Currency`. The only instance of the base class `Currency` is `Currency.ETHER`.
   * @param decimals decimals of the currency
   * @param symbol symbol of the currency
   * @param name of the currency
   */
  protected constructor(decimals: number, symbol?: string, name?: string) {
    validateSolidityTypeInstance(JSBI.BigInt(decimals), SolidityType.uint8)

    this.decimals = decimals
    this.symbol = symbol
    this.name = name
  }
}

const ETHER = Currency.ETHER
const EXPANSE = Currency.EXPANSE


export const BASE = {
  [ChainId.MAINNET]: ETHER,
  [ChainId.EXPANSE]: EXPANSE,
  [ChainId.ROPSTEN]: ETHER,
  [ChainId.RINKEBY]: ETHER,
  [ChainId.GÖRLI]: ETHER,
  [ChainId.KOVAN]: ETHER,
  [ChainId.LOCAL]: ETHER
}

export { ETHER, EXPANSE }
