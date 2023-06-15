import { Contract } from '@ethersproject/contracts'
import { getNetwork } from '@ethersproject/networks'
import { getDefaultProvider } from '@ethersproject/providers'
import { SupportedChainId, Token, CurrencyAmount, WETH9 } from '@reservoir-labs/sdk-core'
import { Pair } from './entities/pair'
import invariant from 'tiny-invariant'
import { FACTORY_ADDRESS } from './constants'
import GenericFactory from './abis/GenericFactory.json'
import ReservoirPair from './abis/ReservoirPair.json'
import StablePair from './abis/StablePair.json'
import JSBI from 'jsbi'

let TOKEN_DECIMALS_CACHE: { [chainId: number]: { [address: string]: number } } = {
  // [SupportedChainId.MAINNET]: {
  //   '0xE0B7927c4aF23765Cb51314A0E0521A9645F0E2A': 9 // DGD
  // }
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
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
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
    return await new Contract(FACTORY_ADDRESS[chainId], GenericFactory.abi, provider).allPairs()
  }

  // private static async _fetchPairIfExists(
  //   tokenA: Token,
  //   tokenB: Token,
  //   curveId: number,
  //   provider = getDefaultProvider(getNetwork(tokenA.chainId))
  // ): Promise<Pair | null> {
  //   const factory = new Contract(FACTORY_ADDRESS, GenericFactory.abi, provider)
  //   const pair = await factory.getPair(tokenA.address, tokenB.address, curveId)
  //
  //   if (pair === AddressZero) return null
  //
  //   return Fetcher.fetchPairData(tokenA, tokenB, curveId, provider)
  // }

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

    const relevantPairs: Set<string> = new Set()

    // get the pairs for the two curves
    const constantProduct = Pair.getAddress(tokenA, tokenB, 0)
    const stable = Pair.getAddress(tokenA, tokenB, 1)

    relevantPairs.add(constantProduct)
    relevantPairs.add(stable)

    // get native pairs
    if (!tokenA.equals(WETH9[chainId])) {
      const nativeTokenAConstantProduct = Pair.getAddress(tokenA, WETH9[chainId], 0)
      const nativeTokenAStable = Pair.getAddress(tokenA, WETH9[chainId], 1)
      relevantPairs.add(nativeTokenAConstantProduct)
      relevantPairs.add(nativeTokenAStable)
    }

    if (!tokenB.equals(WETH9[chainId])) {
      const nativeTokenBConstantProduct = Pair.getAddress(tokenB, WETH9[chainId], 0)
      const nativeTokenBStable = Pair.getAddress(tokenB, WETH9[chainId], 1)
      relevantPairs.add(nativeTokenBConstantProduct)
      relevantPairs.add(nativeTokenBStable)
    }

    const promises = Array.from(relevantPairs).map(async value => {
      try {
        return [await this.fetchPairDataUsingAddress(chainId, value, provider)]
      } catch {
        return []
      }
    })

    const fetchedPairs = await Promise.all(promises)

    return fetchedPairs.flat(1)
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

    const pair = new Contract(address, ReservoirPair.abi, provider)
    const reserves = await pair.getReserves()
    const balances = tokenA.sortsBefore(tokenB)
      ? [reserves.rReserve0, reserves.rReserve1]
      : [reserves.rReserve1, reserves.rReserve0]
    const swapFee: JSBI = JSBI.BigInt(await pair.swapFee())

    let ampCoefficient = null
    if (curveId == 1) {
      ampCoefficient = JSBI.BigInt(await new Contract(address, StablePair.abi, provider).getCurrentAPrecise())
    }

    return new Pair(
      CurrencyAmount.fromRawAmount(tokenA, balances[0]),
      CurrencyAmount.fromRawAmount(tokenB, balances[1]),
      curveId,
      swapFee,
      ampCoefficient
    )
  }

  public static async fetchPairDataUsingAddress(
    chainId: SupportedChainId,
    address: string,
    provider = getDefaultProvider(getNetwork(chainId))
  ): Promise<Pair> {
    const pair = new Contract(address, ReservoirPair.abi, provider)

    const token0ERC20 = new Contract(await pair.token0(), ERC20_ABI, provider)
    const token0: Token = await Fetcher.fetchTokenData(
      chainId,
      token0ERC20.address,
      provider,
      await token0ERC20.symbol(),
      await token0ERC20.name()
    )
    const token1ERC20 = new Contract(await pair.token1(), ERC20_ABI, provider)
    const token1: Token = await Fetcher.fetchTokenData(
      chainId,
      token1ERC20.address,
      provider,
      await token1ERC20.symbol(),
      await token1ERC20.name()
    )

    const reserves = await pair.getReserves()
    const swapFee: JSBI = JSBI.BigInt(await pair.swapFee())
    let curveId

    const factory = new Contract(FACTORY_ADDRESS[chainId], GenericFactory.abi, provider)
    if (address == (await factory.getPair(token0.address, token1.address, 0))) {
      curveId = 0
    } else {
      curveId = 1
    }

    let ampCoefficient = null
    if (curveId == 1) {
      // fetch amplification coefficient
      ampCoefficient = JSBI.BigInt(await new Contract(address, StablePair.abi, provider).getCurrentAPrecise())
    }
    return new Pair(
      CurrencyAmount.fromRawAmount(token0, reserves.rReserve0),
      CurrencyAmount.fromRawAmount(token1, reserves.rReserve1),
      curveId,
      swapFee,
      ampCoefficient
    )
  }
}
