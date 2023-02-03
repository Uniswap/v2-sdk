import { Contract } from '@ethersproject/contracts'
import { getNetwork } from '@ethersproject/networks'
import { getDefaultProvider } from '@ethersproject/providers'
import { SupportedChainId, Token, CurrencyAmount, WETH9 } from '@reservoir-labs/sdk-core'
import { Pair } from './entities/pair'
import invariant from 'tiny-invariant'
import { FACTORY_ADDRESS } from './constants'
import GenericFactory from './abis/GenericFactory.json'
import ReservoirPair from './abis/ReservoirPair.json'
import JSBI from 'jsbi'
import { AddressZero } from '@ethersproject/constants'

let TOKEN_DECIMALS_CACHE: { [chainId: number]: { [address: string]: number } } = {
  [SupportedChainId.MAINNET]: {
    '0xE0B7927c4aF23765Cb51314A0E0521A9645F0E2A': 9 // DGD
  }
}

// TODO: import these abis as npm package dependencies
const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  }
]

/**
 * Contains methods for constructing instances of pairs and tokens from on-chain data.
 */
export abstract class Fetcher {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  public static async fetchAllPairs(
    chainId: SupportedChainId,
    provider = getDefaultProvider(getNetwork(chainId))
  ): Promise<string[]> {
    return await new Contract(FACTORY_ADDRESS, GenericFactory.abi, provider).allPairs()
  }

  // returns the pairs that should be considered in the routing of trades
  // only returns pairs that have been instantiated already
  // does not return pairs that do not exist yet
  // currently it returns the tokenA-tokenB pair for all curves, as well as
  // pairs that are routed through the native asset as that probably will have the most liquidity
  public static async fetchRelevantPairs(
    chainId: SupportedChainId,
    tokenA: Token,
    tokenB: Token,
    provider = getDefaultProvider(getNetwork(chainId))
  ): Promise<Pair[]> {
    invariant(tokenA.chainId == tokenB.chainId, 'CHAIN_ID')
    invariant(tokenA != tokenB, 'SAME_TOKEN')
    const factory = new Contract(FACTORY_ADDRESS, GenericFactory.abi, provider)

    // get the pairs for the two curves
    const stable = await factory.getPair(tokenA.address, tokenB.address, 1)
    const constantProduct = await factory.getPair(tokenA.address, tokenB.address, 0)

    // get native pairs
    const nativeTokenAConstantProduct = await factory.getPair(tokenA.address, WETH9[chainId].address, 0)
    const nativeTokenAStable = await factory.getPair(tokenA.address, WETH9[chainId].address, 1)
    const nativeTokenBConstantProduct = await factory.getPair(tokenB.address, WETH9[chainId].address, 0)
    const nativeTokenBStable = await factory.getPair(tokenB.address, WETH9[chainId].address, 1)

    const relevantPairs = [
      stable,
      constantProduct,
      nativeTokenAConstantProduct,
      nativeTokenAStable,
      nativeTokenBConstantProduct,
      nativeTokenBStable
    ].filter(address => address != AddressZero)

    return [...new Set(relevantPairs)] // de-duplicate repeated addresses
  }

  /**
   * Fetch information for a given token on the given chain, using the given ethers provider.
   * @param chainId chain of the token
   * @param address address of the token on the chain
   * @param provider provider used to fetch the token
   * @param symbol optional symbol of the token
   * @param name optional name of the token
   */
  public static async fetchTokenData(
    chainId: SupportedChainId,
    address: string,
    provider = getDefaultProvider(getNetwork(chainId)),
    symbol?: string,
    name?: string
  ): Promise<Token> {
    const parsedDecimals =
      typeof TOKEN_DECIMALS_CACHE?.[chainId]?.[address] === 'number'
        ? TOKEN_DECIMALS_CACHE[chainId][address]
        : await new Contract(address, ERC20_ABI, provider).decimals().then((decimals: number): number => {
            TOKEN_DECIMALS_CACHE = {
              ...TOKEN_DECIMALS_CACHE,
              [chainId]: {
                ...TOKEN_DECIMALS_CACHE?.[chainId],
                [address]: decimals
              }
            }
            return decimals
          })
    return new Token(chainId, address, parsedDecimals, symbol, name)
  }

  /**
   * Fetches information about a pair and constructs a pair from the given two tokens.
   * @param tokenA first token
   * @param tokenB second token
   * @param curveId 0 for ConstantProduct, 1 for Stable
   * @param provider the provider to use to fetch the data
   */
  public static async fetchPairData(
    tokenA: Token,
    tokenB: Token,
    curveId: number,
    provider = getDefaultProvider(getNetwork(tokenA.chainId))
  ): Promise<Pair> {
    invariant(tokenA.chainId === tokenB.chainId, 'CHAIN_ID')
    const address = Pair.getAddress(tokenA, tokenB, curveId)

    const pair = await new Contract(address, ReservoirPair.abi, provider)
    const [reserves0, reserves1] = pair.getReserves()
    const balances = tokenA.sortsBefore(tokenB) ? [reserves0, reserves1] : [reserves1, reserves0]
    const swapFee: JSBI = pair.swapFee()
    return new Pair(
      CurrencyAmount.fromRawAmount(tokenA, balances[0]),
      CurrencyAmount.fromRawAmount(tokenB, balances[1]),
      curveId,
      swapFee
    )
  }
}
