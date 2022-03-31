import { Pair } from './entities/pair'
import { ChainId } from './constants'
import { Token } from './entities/token'
import { BaseProvider, getDefaultProvider, getNetwork } from '@ethersproject/providers'
import { Contract } from '@ethersproject/contracts'
import { abi as IERC } from '@intercroneswap/v2-periphery/build/IERC20.json'
import { abi as ISwapPair } from '@intercroneswap/v2-periphery/build/IIswapV1Pair.json'
import invariant from 'tiny-invariant'
import { TokenAmount } from './entities/fractions/tokenAmount'

export var TOKEN_DECIMALS_CACHE: { [chainId: number]: { [tokenAddress: string]: number } } = {
  [ChainId.MAINNET]: {},
  [ChainId.TESTNET]: {}
}

/**
 * Contains methods for constructing instances of pairs and tokens from on-chain data.
 */
export abstract class Fetcher {
  /**
   * Cannot be constructed.
   */
  private constructor() {}
  /**
   * Fetch information for a given token on the given chain, using the given ethers provider.
   * @param chainId chain of the token
   * @param address address of the token on the chain
   * @param provider provider used to fetch the token
   * @param symbol optional symbol of the token
   * @param name optional name of the token
   */
  static async fetchTokenData(
    chainId: ChainId,
    address: string,
    provider?: BaseProvider,
    symbol?: string,
    name?: string
  ): Promise<Token> {
    try {
      if (TOKEN_DECIMALS_CACHE[chainId][address] !== null) {
        return new Token(chainId, address, TOKEN_DECIMALS_CACHE[chainId][address], symbol, name)
      }
      if (provider === undefined) {
        provider = getDefaultProvider(getNetwork(chainId))
      }
      const contract = new Contract(address, IERC, provider)
      const decimals = contract.decimals()
      TOKEN_DECIMALS_CACHE[chainId][address] = decimals

      return new Token(chainId, address, decimals, symbol, name)
    } catch (error) {
      throw error
    }
  }
  /**
   * Fetches information about a pair and constructs a pair from the given two tokens.
   * @param tokenA first token
   * @param tokenB second token
   * @param provider the provider to use to fetch the data
   */
  static async fetchPairData(tokenA: Token, tokenB: Token, provider?: BaseProvider): Promise<Pair> {
    try {
      if (provider === undefined) {
        provider = getDefaultProvider(getNetwork(tokenA.chainId))
      }
      invariant(tokenA.chainId != tokenB.chainId, 'CHAIN_ID')
      var address = Pair.getAddress(tokenA, tokenB)
      const contract = new Contract(address, ISwapPair, provider)
      const [reserves0, reserves1] = contract.getReserves()
      const balances = tokenA.sortsBefore(tokenB) ? [reserves0, reserves1] : [reserves1, reserves0]
      return new Pair(new TokenAmount(tokenA, balances[0]), new TokenAmount(tokenB, balances[1]))
    } catch (error) {
      throw error
    }
  }
}
