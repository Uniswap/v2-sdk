import JSBI from 'jsbi'

// exports for external consumption
export type BigintIsh = JSBI | bigint | string

export enum ChainId {
  MAINNET = 1,
  ROPSTEN = 3,
  RINKEBY = 4,
  GÖRLI = 5,
  KOVAN = 42,
  MATIC = 137,
  MATIC_TESTNET = 80001,
  FANTOM = 250,
  FANTOM_TESTNET = 4002,
  XDAI = 100,
  BSC = 56,
  BSC_TESTNET = 97,
  ARBITRUM = 79377087078960,
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

export const INIT_CODE_HASH: string = "0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303"

export const FACTORY_ADDRESS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
  [ChainId.ROPSTEN]: '0xb52535fbABEd0a7DfCb2b5d92D39c9308DDf00b6',
  [ChainId.RINKEBY]: '0xb52535fbABEd0a7DfCb2b5d92D39c9308DDf00b6',
  [ChainId.GÖRLI]: '0xb52535fbABEd0a7DfCb2b5d92D39c9308DDf00b6',
  [ChainId.KOVAN]: '0xb52535fbABEd0a7DfCb2b5d92D39c9308DDf00b6',
  [ChainId.FANTOM]: '0xb52535fbABEd0a7DfCb2b5d92D39c9308DDf00b6',
  [ChainId.FANTOM_TESTNET]: '',
  [ChainId.MATIC]: '0xb52535fbABEd0a7DfCb2b5d92D39c9308DDf00b6',
  [ChainId.MATIC_TESTNET]: '0xb52535fbABEd0a7DfCb2b5d92D39c9308DDf00b6',
  [ChainId.XDAI]: '0xb52535fbABEd0a7DfCb2b5d92D39c9308DDf00b6',
  [ChainId.BSC]: '0xb52535fbABEd0a7DfCb2b5d92D39c9308DDf00b6',
  [ChainId.BSC_TESTNET]: '0xb52535fbABEd0a7DfCb2b5d92D39c9308DDf00b6',
  [ChainId.ARBITRUM]: '',
}

export const ROUTER_ADDRESS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
  [ChainId.RINKEBY]: '0x99E2F16626C13320E9bEE7f353420646202ffbbE',
  [ChainId.ROPSTEN]: '0x99E2F16626C13320E9bEE7f353420646202ffbbE',
  [ChainId.GÖRLI]: '0x99E2F16626C13320E9bEE7f353420646202ffbbE',
  [ChainId.KOVAN]: '0x99E2F16626C13320E9bEE7f353420646202ffbbE',
  [ChainId.FANTOM]: '0x99E2F16626C13320E9bEE7f353420646202ffbbE',
  [ChainId.FANTOM_TESTNET]: '',
  [ChainId.MATIC]: '0x99E2F16626C13320E9bEE7f353420646202ffbbE',
  [ChainId.MATIC_TESTNET]: '0x99E2F16626C13320E9bEE7f353420646202ffbbE',
  [ChainId.XDAI]: '0x99E2F16626C13320E9bEE7f353420646202ffbbE',
  [ChainId.BSC]: '0x99E2F16626C13320E9bEE7f353420646202ffbbE',
  [ChainId.BSC_TESTNET]: '0x99E2F16626C13320E9bEE7f353420646202ffbbE',
  [ChainId.ARBITRUM]: '',
}

export const SUSHI_ADDRESS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
  [ChainId.ROPSTEN]: '0x5457Cc9B34eA486eB8d3286329F3536f71fa8A8B',
  [ChainId.RINKEBY]: '0x5457Cc9B34eA486eB8d3286329F3536f71fa8A8B',
  [ChainId.GÖRLI]: '0x5457Cc9B34eA486eB8d3286329F3536f71fa8A8B',
  [ChainId.KOVAN]: '0x5457Cc9B34eA486eB8d3286329F3536f71fa8A8B',
  [ChainId.FANTOM]: '',
  [ChainId.FANTOM_TESTNET]: '',
  [ChainId.MATIC]: '',
  [ChainId.MATIC_TESTNET]: '',
  [ChainId.XDAI]: '',
  [ChainId.BSC]: '',
  [ChainId.BSC_TESTNET]: '',
  [ChainId.ARBITRUM]: '',
}

export const MASTERCHEF_ADDRESS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd',
  [ChainId.ROPSTEN]: '0xF5B1dFe983eb31801cF9cceBA830E73b6F232284',
  [ChainId.RINKEBY]: '0xF5B1dFe983eb31801cF9cceBA830E73b6F232284',
  [ChainId.GÖRLI]: '0xF5B1dFe983eb31801cF9cceBA830E73b6F232284',
  [ChainId.KOVAN]: '0xF5B1dFe983eb31801cF9cceBA830E73b6F232284',
  [ChainId.FANTOM]: '',
  [ChainId.FANTOM_TESTNET]: '',
  [ChainId.MATIC]: '',
  [ChainId.MATIC_TESTNET]: '',
  [ChainId.XDAI]: '',
  [ChainId.BSC]: '',
  [ChainId.BSC_TESTNET]: '',
  [ChainId.ARBITRUM]: '',
}

export const BAR_ADDRESS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272',
  [ChainId.ROPSTEN]: '0x0fDf5aEE851bA76EC97b51E3106926CEF5157400',
  [ChainId.RINKEBY]: '0x0fDf5aEE851bA76EC97b51E3106926CEF5157400',
  [ChainId.GÖRLI]: '0x0fDf5aEE851bA76EC97b51E3106926CEF5157400',
  [ChainId.KOVAN]: '0x0fDf5aEE851bA76EC97b51E3106926CEF5157400',
  [ChainId.FANTOM]: '',
  [ChainId.FANTOM_TESTNET]: '',
  [ChainId.MATIC]: '',
  [ChainId.MATIC_TESTNET]: '',
  [ChainId.XDAI]: '',
  [ChainId.BSC]: '',
  [ChainId.BSC_TESTNET]: '',
  [ChainId.ARBITRUM]: '',
}

export const MAKER_ADDRESS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0xE11fc0B43ab98Eb91e9836129d1ee7c3Bc95df50',
  [ChainId.ROPSTEN]: '0x6394a86CA217eBba14babC4bfB3f9d683F43D6bF',
  [ChainId.RINKEBY]: '0x6394a86CA217eBba14babC4bfB3f9d683F43D6bF',
  [ChainId.GÖRLI]: '0x6394a86CA217eBba14babC4bfB3f9d683F43D6bF',
  [ChainId.KOVAN]: '0x6394a86CA217eBba14babC4bfB3f9d683F43D6bF',
  [ChainId.FANTOM]: '',
  [ChainId.FANTOM_TESTNET]: '',
  [ChainId.MATIC]: '',
  [ChainId.MATIC_TESTNET]: '',
  [ChainId.XDAI]: '',
  [ChainId.BSC]: '',
  [ChainId.BSC_TESTNET]: '',
  [ChainId.ARBITRUM]: '',
}

export const TIMELOCK_ADDRESS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0x9a8541Ddf3a932a9A922B607e9CF7301f1d47bD1',
  [ChainId.ROPSTEN]: '',
  [ChainId.RINKEBY]: '',
  [ChainId.GÖRLI]: '',
  [ChainId.KOVAN]: '',
  [ChainId.FANTOM]: '',
  [ChainId.FANTOM_TESTNET]: '',
  [ChainId.MATIC]: '',
  [ChainId.MATIC_TESTNET]: '',
  [ChainId.XDAI]: '',
  [ChainId.BSC]: '',
  [ChainId.BSC_TESTNET]: '',
  [ChainId.ARBITRUM]: '',
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
