import JSBI from 'jsbi'

// exports for external consumption
export type BigintIsh = JSBI | bigint | string

export enum ChainId {
  MAINNET = 1,
  ROPSTEN = 3,
  RINKEBY = 4,
  GÖRLI = 5,
  KOVAN = 42
}

export enum TradeType {
  EXACT_INPUT,
  EXACT_OUTPUT
}

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP
}

export const FACTORY_ADDRESS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
  [ChainId.ROPSTEN]: '0xF2Ce6e43f11152a33cE082033ee1514fDf998137',
  [ChainId.RINKEBY]: '0xF2Ce6e43f11152a33cE082033ee1514fDf998137',
  [ChainId.GÖRLI]: '0xF2Ce6e43f11152a33cE082033ee1514fDf998137',
  [ChainId.KOVAN]: '0xF2Ce6e43f11152a33cE082033ee1514fDf998137'
}

export const ROUTER_ADDRESS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
  [ChainId.RINKEBY]: '0x600c710979Ad494269ddcc4d94E95344537cd211',
  [ChainId.ROPSTEN]: '0x600c710979Ad494269ddcc4d94E95344537cd211',
  [ChainId.GÖRLI]: '0x600c710979Ad494269ddcc4d94E95344537cd211',
  [ChainId.KOVAN]: '0x600c710979Ad494269ddcc4d94E95344537cd211'
}

export const INIT_CODE_HASH: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303',
  [ChainId.ROPSTEN]: '0x54133925c45bec962a59f3e2c52a7d507cf9225eb14aa6f0f01a33e997e4fa3c',
  [ChainId.RINKEBY]: '0x54133925c45bec962a59f3e2c52a7d507cf9225eb14aa6f0f01a33e997e4fa3c',
  [ChainId.GÖRLI]: '0x54133925c45bec962a59f3e2c52a7d507cf9225eb14aa6f0f01a33e997e4fa3c',
  [ChainId.KOVAN]: '0x54133925c45bec962a59f3e2c52a7d507cf9225eb14aa6f0f01a33e997e4fa3c'
}

export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000)

// exports for internal consumption
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)
export const TWO = JSBI.BigInt(2)
export const THREE = JSBI.BigInt(3)
export const FIVE = JSBI.BigInt(5)
export const TEN = JSBI.BigInt(10)
export const _100 = JSBI.BigInt(100)
export const _997 = JSBI.BigInt(997)
export const _1000 = JSBI.BigInt(1000)

export enum SolidityType {
  uint8 = 'uint8',
  uint256 = 'uint256'
}

export const SOLIDITY_TYPE_MAXIMA = {
  [SolidityType.uint8]: JSBI.BigInt('0xff'),
  [SolidityType.uint256]: JSBI.BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
}
