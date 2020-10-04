import JSBI from 'jsbi'
//import { bytecode } from '@eggswap/core/build/contracts/UniswapV2Pair.json'
//import { keccak256 } from '@ethersproject/solidity'

//const COMPUTED_INIT_CODE_HASH = keccak256(['bytes'], [`${bytecode}`])

// exports for external consumption
export type BigintIsh = JSBI | bigint | string

export enum ChainId {
  MAINNET = 1,
  EXPANSE = 2,
  ROPSTEN = 3,
  RINKEBY = 4,
  GÖRLI = 5,
  KOVAN = 42,
  LOCAL = 1337
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

//export const FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'

export const FACTORY_ADDRESS = {
  1: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  2: '0xb709d6d184B51dC811cAa1B4841f8bdC700cF84b',
  3: '0xb709d6d184B51dC811cAa1B4841f8bdC700cF84b',
  4: '0xb709d6d184B51dC811cAa1B4841f8bdC700cF84b',
  5: '0xb709d6d184B51dC811cAa1B4841f8bdC700cF84b',
  42: '0xb709d6d184B51dC811cAa1B4841f8bdC700cF84b',
  1337: '0xb709d6d184B51dC811cAa1B4841f8bdC700cF84b'
}

//export const INIT_CODE_HASH = COMPUTED_INIT_CODE_HASH;
//export const INIT_CODE_HASH = '0xc0c875d9c0f62295072f21084a19a575ff5ef887aa5ed8ce83ccfc708901071a'

export const INIT_CODE_HASH = {
  1: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
  2: '0xc0c875d9c0f62295072f21084a19a575ff5ef887aa5ed8ce83ccfc708901071a',
  3: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
  4: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
  5: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
  42: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
  1337: '0xc0c875d9c0f62295072f21084a19a575ff5ef887aa5ed8ce83ccfc708901071a'
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
