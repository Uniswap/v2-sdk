import { Percent } from '@uniswap/sdk-core'
import JSBI from 'jsbi'

/**
 * @deprecated use FACTORY_ADDRESS_MAP instead
 */
export const FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'

export const FACTORY_ADDRESS_MAP: { [chainId: number]: string } = {
  // Mainnet
  1: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  // Ropsten
  3: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  // Goerli
  5: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  // Optimism
  10: '0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf',
  // Arbitrum
  42161: '0xf1D7CC64Fb4452F05c498126312eBE29f30Fbcf9',
  // Avalanche
  43114: '0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C',
  // Base
  8453: '0x8909dc15e40173ff4699343b6eb8132c65e18ec6',
  // BNB
  56: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
  // Polygon
  137: '0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C'
}

export const INIT_CODE_HASH = '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'

export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000)

// exports for internal consumption
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)
export const FIVE = JSBI.BigInt(5)
export const _997 = JSBI.BigInt(997)
export const _1000 = JSBI.BigInt(1000)
export const BASIS_POINTS = JSBI.BigInt(10000)

export const ZERO_PERCENT = new Percent(ZERO)
export const ONE_HUNDRED_PERCENT = new Percent(ONE)
