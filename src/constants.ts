import JSBI from 'jsbi'
import { SupportedChainId } from '@reservoir-labs/sdk-core'

export const FACTORY_ADDRESS = {
  // this is deployed using the ReservoirDeployer
  [SupportedChainId.AVAX]: '0x47e537e1452dbc9c3ee8f1420e5aaf22111d3547',
  // this is deployed manually as it wasn't necessary to use the ReservoirDeployer at that time
  [SupportedChainId.AVAX_TESTNET]: '0xCae997a6f253814441B878868fd6DBB32a52816f'
}

export const ROUTER_ADDRESS = {
  [SupportedChainId.AVAX]: '0xd627FdC984a249E9b5F2df263A37368f4e459726',
  [SupportedChainId.AVAX_TESTNET]: '0x67bc78378723acd8876FCA16d9c6C24ff79acb8e'
}
export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000)
export const FEE_ACCURACY = JSBI.BigInt(1_000_000) // 100%

export const A_PRECISION = JSBI.BigInt(100)

export const DEFAULT_AMPLIFICATION_COEFFICIENT_PRECISE = JSBI.multiply(JSBI.BigInt(1000), A_PRECISION) // 1000 with 100 of precision

// exports for internal consumption
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)
export const FIVE = JSBI.BigInt(5)
