import { Pair } from './entities/pair'
import invariant from 'tiny-invariant'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import { getDefaultProvider } from '@ethersproject/providers'
import { getNetwork } from '@ethersproject/networks'
import { Contract } from '@ethersproject/contracts'
import DefiraPair from './abis/defiraPair.abi.json'

/**
 * Contains methods for constructing instances of pairs and tokens from on-chain data.
 */
export abstract class Fetcher {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  /**
   * Fetches information about a pair and constructs a pair from the given two tokens.
   * @param tokenA first token
   * @param tokenB second token
   * @param provider the provider to use to fetch the data
   */
  public static async fetchPairData(
    tokenA: Token,
    tokenB: Token,
    factoryAddress: string,
    initHashCode: string,
    provider = getDefaultProvider(getNetwork(tokenA.chainId))
  ): Promise<Pair> {
    invariant(tokenA.chainId === tokenB.chainId, 'CHAIN_ID')
    const address = Pair.getAddress(tokenA, tokenB, factoryAddress, initHashCode)
    const [reserves0, reserves1] = await new Contract(address, DefiraPair.abi, provider).getReserves()
    const balances = tokenA.sortsBefore(tokenB) ? [reserves0, reserves1] : [reserves1, reserves0]
    return new Pair(
      CurrencyAmount.fromRawAmount(tokenA, balances[0]),
      CurrencyAmount.fromRawAmount(tokenB, balances[1]),
      factoryAddress,
      initHashCode
    )
  }
}
