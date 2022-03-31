import JSBI from 'jsbi'

// exports for external consumption
export type BigintIsh = JSBI | string | number

export enum ChainId {
  MAINNET = 56,
  TESTNET = 97
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

export const FACTORY_ADDRESS = '0xf3a0a9095B8b05d46F3ee8fe1d66c259dE4CB364'
export const FACTORY_ADDRESSES: { [chainId: number]: string } = {
  [ChainId.MAINNET]: '0xA72546dDbd75Fb4f0176EdbA30cc42c31c27b452',
  [ChainId.TESTNET]: '0xf3a0a9095B8b05d46F3ee8fe1d66c259dE4CB364'
}
export const INIT_CODE_HASH = '0x21a1c45127cc5500cc626d621f5483247142398cc2fb2fe83a73fd9b20ea79c7'

export const MaxUint256 = JSBI.BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000)

// exports for internal consumption
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)
export const FIVE = JSBI.BigInt(5)
export const TEN = JSBI.BigInt(10)
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
