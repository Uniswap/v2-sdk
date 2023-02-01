import { Decimal } from 'decimal.js'
import { BigNumber } from '@ethersproject/bignumber'

const SCALING_FACTOR = 1e18

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

export const bnSum = (bnArr: BigNumberish[]): BigNumber => {
  return bn(bnArr.reduce((prev, curr) => bn(prev).add(bn(curr)), 0))
}

export const arrayAdd = (arrA: BigNumberish[], arrB: BigNumberish[]): BigNumber[] =>
  arrA.map((a, i) => bn(a).add(bn(arrB[i])))

export const arrayFpMul = (arrA: BigNumberish[], arrB: BigNumberish[]): BigNumber[] =>
  arrA.map((a, i) => fpMul(a, arrB[i]))

export const arraySub = (arrA: BigNumberish[], arrB: BigNumberish[]): BigNumber[] =>
  arrA.map((a, i) => bn(a).sub(bn(arrB[i])))

export const fpMul = (a: BigNumberish, b: BigNumberish): BigNumber =>
  bn(a)
    .mul(b)
    .div(FP_SCALING_FACTOR)

export const fpDiv = (a: BigNumberish, b: BigNumberish): BigNumber =>
  bn(a)
    .mul(FP_SCALING_FACTOR)
    .div(b)

export const divCeil = (x: BigNumber, y: BigNumber): BigNumber =>
  // ceil(x/y) == (x + y - 1) / y
  x
    .add(y)
    .sub(1)
    .div(y)

const FP_SCALING_FACTOR = bn(SCALING_FACTOR)
export const FP_ZERO = fp(0)
export const FP_ONE = fp(1)
export const FP_100_PCT = fp(1)

export function printGas(gas: number | BigNumber): string {
  if (typeof gas !== 'number') {
    gas = gas.toNumber()
  }

  return `${(gas / 1000).toFixed(1)}k`
}

export function scaleUp(n: BigNumber, scalingFactor: BigNumber): BigNumber {
  if (scalingFactor == bn(1)) {
    return n
  }

  return n.mul(scalingFactor)
}

export function scaleDown(n: BigNumber, scalingFactor: BigNumber): BigNumber {
  if (scalingFactor == bn(1)) {
    return n
  }

  return n.div(scalingFactor)
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
