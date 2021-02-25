import invariant from 'tiny-invariant'
import { ChainId } from '../constants'
import { validateAndParseAddress } from '../utils'
import { Currency } from './currency'

/**
 * Represents an ERC20 token with a unique address and some metadata.
 */
export class Token extends Currency {
  public readonly chainId: ChainId
  public readonly address: string

  public constructor(chainId: ChainId, address: string, decimals: number, symbol?: string, name?: string) {
    super(decimals, symbol, name)
    this.chainId = chainId
    this.address = validateAndParseAddress(address)
  }

  /**
   * Returns true if the two tokens are equivalent, i.e. have the same chainId and address.
   * @param other other token to compare
   */
  public equals(other: Token): boolean {
    // short circuit on reference equality
    if (this === other) {
      return true
    }
    return this.chainId === other.chainId && this.address === other.address
  }

  /**
   * Returns true if the address of this token sorts before the address of the other token
   * @param other other token to compare
   * @throws if the tokens have the same address
   * @throws if the tokens are on different chains
   */
  public sortsBefore(other: Token): boolean {
    invariant(this.chainId === other.chainId, 'CHAIN_IDS')
    invariant(this.address !== other.address, 'ADDRESSES')
    return this.address.toLowerCase() < other.address.toLowerCase()
  }
}

/**
 * Compares two currencies for equality
 */
export function currencyEquals(currencyA: Currency, currencyB: Currency): boolean {
  if (currencyA instanceof Token && currencyB instanceof Token) {
    return currencyA.equals(currencyB)
  } else if (currencyA instanceof Token) {
    return false
  } else if (currencyB instanceof Token) {
    return false
  } else {
    return currencyA === currencyB
  }
}

// TODO: Rename to WNATIVE for sanity
export const WETH = {
  [ChainId.MAINNET]: new Token(ChainId.MAINNET, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.ROPSTEN]: new Token(ChainId.ROPSTEN, '0xc778417E063141139Fce010982780140Aa0cD5Ab', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.RINKEBY]: new Token(ChainId.RINKEBY, '0xc778417E063141139Fce010982780140Aa0cD5Ab', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.GÖRLI]: new Token(ChainId.GÖRLI, '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.KOVAN]: new Token(ChainId.KOVAN, '0xd0A1E359811322d97991E03f863a0C30C2cF029C', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.FANTOM]: new Token(ChainId.FANTOM, "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83", 18, "WFTM", "Wrapped FTM"),
  [ChainId.FANTOM_TESTNET]: new Token(ChainId.FANTOM_TESTNET, "0xf1277d1Ed8AD466beddF92ef448A132661956621", 18, "FTM", "Wrapped FTM"),
  [ChainId.MATIC]: new Token(ChainId.MATIC, "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", 18, "WMATIC", "Wrapped Matic"),
  [ChainId.MATIC_TESTNET]: new Token(ChainId.MATIC_TESTNET, "0x5B67676a984807a212b1c59eBFc9B3568a474F0a", 18, "WMATIC", "Wrapped Matic"),
  [ChainId.XDAI]: new Token(ChainId.XDAI, "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d", 18, "WXDAI", "Wrapped xDai"),
  [ChainId.BSC]: new Token(ChainId.BSC, "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", 18, "WBNB", "Wrapped BNB"),
  [ChainId.BSC_TESTNET]: new Token(ChainId.BSC_TESTNET, "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", 18, "WBNB", "Wrapped BNB"),
  [ChainId.ARBITRUM]: new Token(ChainId.ARBITRUM, "0xf8456e5e6A225C2C1D74D8C9a4cB2B1d5dc1153b", 18, "WETH", "Wrapped Ether")
}
