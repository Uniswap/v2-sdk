import { ChainId, ZERO_ADDRESS } from '../constants'
import { isETH, validateAndParseAddress } from '../utils'
import invariant from 'tiny-invariant';

/**
 * Represents an ERC20 token and Ether with a unique address and some metadata.
 */
export class Token {
    public readonly chainId: ChainId
    public readonly address: string
    public readonly isEther: boolean
    public readonly decimals: number
    public readonly symbol: string | undefined
    public readonly name: string | undefined

    public constructor(chainId: ChainId, address: string, decimals: number, symbol?: string, name?: string) {
        this.chainId = chainId
        this.address = validateAndParseAddress(address)
        this.isEther = isETH(address)
        this.decimals = decimals
        this.symbol = symbol
        this.name = name
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
export function currencyEquals(currencyA: Token, currencyB: Token): boolean {
    return currencyA?.address?.toLowerCase() === currencyB?.address?.toLowerCase()
}

export const ETHER = new Token(ChainId.MAINNET, ZERO_ADDRESS, 18, 'ETH', 'Ethereum')

