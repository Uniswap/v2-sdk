// ADAPTED FROM BALANCER https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pvt/helpers/src/models/pools/stable/math.ts

import { Decimal } from 'decimal.js'
import { BigNumber } from '@ethersproject/bignumber'

import { BigNumberish, decimal, bn, fp, fromFp, within1 } from './numbers'

const A_PRECISION = decimal(100)
const MAX_LOOP_LIMIT = 256

export function calculateInvariant(
  xp0: BigNumberish,
  xp1: BigNumberish,
  amplificationCoefficient: BigNumberish
): BigNumber {
  return calculateApproxInvariant(xp0, xp1, amplificationCoefficient)
}

export function calculateApproxInvariant(
  xp0: BigNumberish,
  xp1: BigNumberish,
  amplificationCoefficient: BigNumberish
): BigNumber {
  const bal0 = decimal(xp0)
  const bal1 = decimal(xp1)
  // console.log("xp0", xp0.toString())
  // console.log("bal0", bal0.toString())

  const sum = bal0.add(bal1)

  // console.log("sum is", sum.toString())

  if (sum.isZero()) {
    return bn(0)
  }

  // we multiply by 2 as there are only 2 coins in a pair
  const N_A = decimal(amplificationCoefficient).mul(2)

  let inv = sum
  let prevInv = decimal(0)
  for (let i = 0; i < MAX_LOOP_LIMIT; ++i) {
    let dP = inv
      .mul(inv)
      .div(bal0)
      .mul(inv)
      .div(bal1)
      .div(4)

    prevInv = inv
    inv = N_A.mul(sum)
      .div(A_PRECISION)
      .add(dP.mul(2))
      .mul(inv)
      .div(
        N_A.minus(A_PRECISION)
          .mul(inv)
          .div(A_PRECISION)
          .add(dP.mul(3))
      )

    if (within1(inv, prevInv)) {
      break
    }
  }
  return fp(inv)
}

export function calcOutGivenIn(
  reserveIn: BigNumberish,
  reserveOut: BigNumberish,
  amplificationCoefficient: BigNumberish,
  fpTokenAmountIn: BigNumberish
): Decimal {
  const invariant = fromFp(calculateInvariant(reserveIn, reserveOut, amplificationCoefficient))

  // console.log("invariant", invariant.toString())
  // console.log("reserve out", reserveOut.toString())
  // console.log("reserve in", reserveIn.toString())

  let balanceIn = decimal(reserveIn).add(decimal(fpTokenAmountIn))
  // console.log("bal in", balanceIn.toString())

  const finalBalanceOut = _getTokenBalanceGivenInvariantAndAllOtherBalances(
    balanceIn,
    decimal(amplificationCoefficient),
    invariant
  )

  // console.log("final balance out", finalBalanceOut.toString())
  // console.log("decimal(reserveOut).sub(finalBalanceOut)", decimal(reserveOut).sub(finalBalanceOut).toString())
  return decimal(reserveOut).sub(finalBalanceOut)
}

export function calcInGivenOut(
  reserveIn: BigNumberish,
  reserveOut: BigNumberish,
  amplificationCoefficient: BigNumberish,
  fpTokenAmountOut: BigNumberish
): Decimal {
  const invariant = fromFp(calculateInvariant(reserveIn, reserveOut, amplificationCoefficient))
  let balanceOut = decimal(reserveOut).sub(decimal(fpTokenAmountOut))

  const finalBalanceIn = _getTokenBalanceGivenInvariantAndAllOtherBalances(
    balanceOut,
    decimal(amplificationCoefficient),
    invariant
  )

  return finalBalanceIn.sub(decimal(reserveIn))
}

function _getTokenBalanceGivenInvariantAndAllOtherBalances(
  balanceIn: Decimal,
  amplificationCoefficient: Decimal,
  invariant: Decimal
): Decimal {
  const N_A = amplificationCoefficient.mul(2)

  let c = invariant.mul(invariant).div(balanceIn.mul(2))
  c = c
    .mul(invariant)
    .mul(A_PRECISION)
    .div(N_A.mul(2))

  let b = balanceIn.add(invariant.mul(A_PRECISION).div(N_A))
  let yPrev
  let y = invariant

  for (let i = 0; i < MAX_LOOP_LIMIT; ++i) {
    yPrev = y
    y = y
      .mul(y)
      .add(c)
      .div(
        y
          .mul(2)
          .add(b)
          .sub(invariant)
      )
    if (within1(yPrev, y)) {
      break
    }
  }
  return y
}
