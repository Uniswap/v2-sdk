import JSBI from 'jsbi'

// TODO: update this with the standardized CREATE2 address that will be the same across all chains
// Currently it only works for the wallet derived from anvil's private key
export const FACTORY_ADDRESS = '0xE9FC621FdD32Ec8b7eaCFC42b0CDe8BC95F23C7E'

export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000)
export const FEE_ACCURACY = JSBI.BigInt(1_000_000) // 100%

// exports for internal consumption
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)
export const FIVE = JSBI.BigInt(5)
