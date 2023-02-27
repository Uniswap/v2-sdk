import JSBI from 'jsbi'

// TODO: update this with the standardized CREATE2 address that will be the same across all chains
// Currently it only works for the wallet derived from anvil's private key
export const FACTORY_ADDRESS = '0x044a540Bad7c0eA1373dac0B17E0e3352e1E0F1C'

export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000)
export const FEE_ACCURACY = JSBI.BigInt(1_000_000) // 100%

export const A_PRECISION = JSBI.BigInt(100)

export const DEFAULT_AMPLIFICATION_COEFFICIENT_PRECISE = JSBI.multiply(JSBI.BigInt(1000), A_PRECISION) // 1000 with 100 of precision

// exports for internal consumption
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)
export const FIVE = JSBI.BigInt(5)
