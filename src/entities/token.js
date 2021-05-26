import { ChainId, ZERO_ADDRESS } from '../constants';
import { isETH, validateAndParseAddress } from '../utils';
import invariant from 'tiny-invariant';
/**
 * Represents an ERC20 token and Ether with a unique address and some metadata.
 */
export class Token {
    constructor(chainId, address, decimals, symbol, name) {
        this.chainId = chainId;
        this.address = validateAndParseAddress(address);
        this.isEther = isETH(address);
        this.decimals = decimals;
        this.symbol = symbol;
        this.name = name;
    }
    /**
     * Returns true if the two tokens are equivalent, i.e. have the same chainId and address.
     * @param other other token to compare
     */
    equals(other) {
        // short circuit on reference equality
        if (this === other) {
            return true;
        }
        return this.chainId === other.chainId && this.address === other.address;
    }
    /**
     * Returns true if the address of this token sorts before the address of the other token
     * @param other other token to compare
     * @throws if the tokens have the same address
     * @throws if the tokens are on different chains
     */
    sortsBefore(other) {
        invariant(this.chainId === other.chainId, 'CHAIN_IDS');
        invariant(this.address !== other.address, 'ADDRESSES');
        return this.address.toLowerCase() < other.address.toLowerCase();
    }
}
/**
 * Compares two currencies for equality
 */
export function currencyEquals(currencyA, currencyB) {
    var _a, _b;
    return ((_a = currencyA === null || currencyA === void 0 ? void 0 : currencyA.address) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === ((_b = currencyB === null || currencyB === void 0 ? void 0 : currencyB.address) === null || _b === void 0 ? void 0 : _b.toLowerCase());
}
export const ETHER = new Token(ChainId.MAINNET, ZERO_ADDRESS, 18, 'ETH', 'Ethereum');
//# sourceMappingURL=token.js.map