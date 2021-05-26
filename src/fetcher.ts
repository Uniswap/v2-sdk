import { Contract } from '@ethersproject/contracts'
import { getNetwork } from '@ethersproject/networks'
import { getDefaultProvider } from '@ethersproject/providers'
import { TokenAmount } from './entities/fractions/tokenAmount'
import { Pair } from './entities/pair'
import MooniswapFactoryABI from './abis/MooniswapFactory.json'
import MooniswapABI from './abis/Mooniswap.json'
import invariant from 'tiny-invariant'
import ERC20ABI from './abis/ERC20.json'
import { ChainId, FACTORY_ADDRESS } from './constants'
import { Token } from './entities/token'

let TOKEN_DECIMALS_CACHE: { [chainId: number]: { [address: string]: number } } = {
    [ChainId.MAINNET]: {
        '0xE0B7927c4aF23765Cb51314A0E0521A9645F0E2A': 9 // DGD
    }
}

const POOLS_CACHE: { [chainId: number]: { [token0: string]: { [token1: string]: string } } } = {
    [ChainId.MAINNET]: {}
}

/**
 * Contains methods for constructing instances of pairs and tokens from on-chain data.
 */
export abstract class Fetcher {
    /**
     * Cannot be constructed.
     */
    private constructor() {
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
        chainId: ChainId,
        address: string,
        provider = getDefaultProvider(getNetwork(chainId)),
        symbol?: string,
        name?: string
    ): Promise<Token> {
        const parsedDecimals =
            typeof TOKEN_DECIMALS_CACHE?.[chainId]?.[address] === 'number'
                ? TOKEN_DECIMALS_CACHE[chainId][address]
                : await new Contract(address, ERC20ABI, provider).decimals().then((decimals: number): number => {
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
     * @param provider the provider to use to fetch the data
     */
    public static async fetchPairData(
        tokenA: Token,
        tokenB: Token,
        provider = getDefaultProvider(getNetwork(tokenA.chainId))
    ): Promise<Pair> {
        invariant(tokenA.chainId === tokenB.chainId, 'CHAIN_ID')

        let poolAddress: string;
        if (!POOLS_CACHE[tokenA.chainId]) {
            POOLS_CACHE[tokenA.chainId] = {};
        }
        if (!POOLS_CACHE[tokenA.chainId][tokenA.address]) {
            POOLS_CACHE[tokenA.chainId][tokenA.address] = {}
        }

        if (POOLS_CACHE[tokenA.chainId][tokenA.address][tokenB.address]) {
            poolAddress = POOLS_CACHE[tokenA.chainId][tokenA.address][tokenB.address]
        } else {
            poolAddress = await new Contract(FACTORY_ADDRESS, MooniswapFactoryABI, provider).pools(
                tokenA.address,
                tokenB.address
            )
            POOLS_CACHE[tokenA.chainId][tokenA.address][tokenB.address] = poolAddress
            POOLS_CACHE[tokenA.chainId][tokenB.address][tokenA.address] = poolAddress
        }

        const poolContract = new Contract(poolAddress, MooniswapABI, provider);
        const tokenAddresses = await Promise.all([
            poolContract.tokens(0),
            poolContract.tokens(1)
        ])
        const tokens = tokenA.address === tokenAddresses[0] ? [tokenA, tokenB] : [tokenB, tokenA]
        const balances = await Promise.all([
            new Contract(tokenAddresses[0], ERC20ABI, provider).balanceOf(poolAddress),
            new Contract(tokenAddresses[1], ERC20ABI, provider).balanceOf(poolAddress)
        ])
        return new Pair(new TokenAmount(tokens[0], balances[0]), new TokenAmount(tokens[1], balances[1]), poolAddress)
    }
}
