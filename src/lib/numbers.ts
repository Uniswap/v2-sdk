import { Decimal } from 'decimal.js'
import { BigNumber } from '@ethersproject/bignumber'

const SCALING_FACTOR = 1e18

// 78 is the length of max uint256
// this is to ensure that all the decimals outputs in string are given in raw form instead of in exponential form
// which can caues problems for BigInt
Decimal.set({ toExpPos: 78 })

export type BigNumberish = string | number | BigNumber

export const decimal = (x: BigNumberish | Decimal): Decimal => new Decimal(x.toString())

export const fp = (x: BigNumberish | Decimal): BigNumber => bn(toFp(x))

export const toFp = (x: BigNumberish | Decimal): Decimal => decimal(x).mul(SCALING_FACTOR)

export const fromFp = (x: BigNumberish | Decimal): Decimal => decimal(x).div(SCALING_FACTOR)

export const bn = (x: BigNumberish | Decimal): BigNumber => {
  if (BigNumber.isBigNumber(x)) return x
  const stringified = parseScientific(x.toString())
  const integer = stringified.split('.')[0]
  return BigNumber.from(integer)
}

export const maxUint = (e: number): BigNumber =>
  bn(2)
    .pow(e)
    .sub(1)

export const maxInt = (e: number): BigNumber =>
  bn(2)
    .pow(bn(e).sub(1))
    .sub(1)

export const minInt = (e: number): BigNumber =>
  bn(2)
    .pow(bn(e).sub(1))
    .mul(-1)

export const pct = (x: BigNumberish, pct: BigNumberish): BigNumber => bn(decimal(x).mul(decimal(pct)))

export const max = (a: BigNumberish, b: BigNumberish): BigNumber => {
  a = bn(a)
  b = bn(b)

  return a.gt(b) ? a : b
}

export const min = (a: BigNumberish, b: BigNumberish): BigNumber => {
  a = bn(a)
  b = bn(b)

  return a.lt(b) ? a : b
}

function parseScientific(num: string): string {
  // If the number is not in scientific notation return it as it is
  if (!/\d+\.?\d*e[+-]*\d+/i.test(num)) return num

  // Remove the sign
  const numberSign = Math.sign(Number(num))
  num = Math.abs(Number(num)).toString()

  // Parse into coefficient and exponent
  const [coefficient, exponent] = num.toLowerCase().split('e')
  let zeros = Math.abs(Number(exponent))
  const exponentSign = Math.sign(Number(exponent))
  const [integer, decimals] = (coefficient.indexOf('.') != -1 ? coefficient : `${coefficient}.`).split('.')

  if (exponentSign === -1) {
    zeros -= integer.length
    num =
      zeros < 0
        ? integer.slice(0, zeros) + '.' + integer.slice(zeros) + decimals
        : '0.' + '0'.repeat(zeros) + integer + decimals
  } else {
    if (decimals) zeros -= decimals.length
    num =
      zeros < 0
        ? integer + decimals.slice(0, zeros) + '.' + decimals.slice(zeros)
        : integer + decimals + '0'.repeat(zeros)
  }

  return numberSign < 0 ? '-' + num : num
}

export function randomFromInterval(min: number, max: number): number {
  // min and max included
  return Math.random() * (max - min) + min
}

export function within1(x: Decimal, y: Decimal): boolean {
  if (x.gt(y)) {
    if (
      fp(x)
        .sub(fp(y))
        .lte(1)
    ) {
      return true
    }
  } else if (
    fp(y)
      .sub(fp(x))
      .lte(1)
  ) {
    return true
  }
  return false
}
