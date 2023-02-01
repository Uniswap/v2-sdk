// ADAPTED FROM BALANCER https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pvt/helpers/src/models/pools/stable/math.ts

import { Decimal } from 'decimal.js'
import { BigNumber } from '@ethersproject/bignumber'

import { BigNumberish, decimal, bn, fp, fromFp, toFp } from './numbers'

export function calculateInvariant(fpRawBalances: BigNumberish[], amplificationParameter: BigNumberish): BigNumber {
  return calculateApproxInvariant(fpRawBalances, amplificationParameter)
}

export function calculateApproxInvariant(
  fpRawBalances: BigNumberish[],
  amplificationParameter: BigNumberish
): BigNumber {
  const totalCoins = fpRawBalances.length
  const balances = fpRawBalances.map(fromFp)

  const sum = balances.reduce((a, b) => a.add(b), decimal(0))

  if (sum.isZero()) {
    return bn(0)
  }

  let inv = sum
  let prevInv = decimal(0)
  const ampTimesTotal = decimal(amplificationParameter).mul(totalCoins)

  for (let i = 0; i < 255; i++) {
    let P_D = balances[0].mul(totalCoins)
    for (let j = 1; j < totalCoins; j++) {
      P_D = P_D.mul(balances[j])
        .mul(totalCoins)
        .div(inv)
    }

    prevInv = inv
    inv = decimal(totalCoins)
      .mul(inv)
      .mul(inv)
      .add(ampTimesTotal.mul(sum).mul(P_D))
      .div(
        decimal(totalCoins)
          .add(1)
          .mul(inv)
          .add(ampTimesTotal.sub(1).mul(P_D))
      )

    // converge with precision of integer 1
    if (inv.gt(prevInv)) {
      if (
        fp(inv)
          .sub(fp(prevInv))
          .lte(1)
      ) {
        break
      }
    } else if (
      fp(prevInv)
        .sub(fp(inv))
        .lte(1)
    ) {
      break
    }
  }

  return fp(inv)
}

export function calcOutGivenIn(
  fpBalances: BigNumberish[],
  amplificationParameter: BigNumberish,
  tokenIndexIn: number,
  tokenIndexOut: number,
  fpTokenAmountIn: BigNumberish
): Decimal {
  const invariant = fromFp(calculateInvariant(fpBalances, amplificationParameter))

  const balances = fpBalances.map(fromFp)
  balances[tokenIndexIn] = balances[tokenIndexIn].add(fromFp(fpTokenAmountIn))

  const finalBalanceOut = _getTokenBalanceGivenInvariantAndAllOtherBalances(
    balances,
    decimal(amplificationParameter),
    invariant,
    tokenIndexOut
  )

  return toFp(balances[tokenIndexOut].sub(finalBalanceOut))
}

export function calcInGivenOut(
  fpBalances: BigNumberish[],
  amplificationParameter: BigNumberish,
  tokenIndexIn: number,
  tokenIndexOut: number,
  fpTokenAmountOut: BigNumberish
): Decimal {
  const invariant = fromFp(calculateInvariant(fpBalances, amplificationParameter))

  const balances = fpBalances.map(fromFp)
  balances[tokenIndexOut] = balances[tokenIndexOut].sub(fromFp(fpTokenAmountOut))

  const finalBalanceIn = _getTokenBalanceGivenInvariantAndAllOtherBalances(
    balances,
    decimal(amplificationParameter),
    invariant,
    tokenIndexIn
  )

  return toFp(finalBalanceIn.sub(balances[tokenIndexIn]))
}

function _getTokenBalanceGivenInvariantAndAllOtherBalances(
  balances: Decimal[],
  amplificationParameter: Decimal | BigNumberish,
  invariant: Decimal,
  tokenIndex: number
): Decimal {
  let sum = decimal(0)
  let mul = decimal(1)
  const numTokens = balances.length

  for (let i = 0; i < numTokens; i++) {
    if (i != tokenIndex) {
      sum = sum.add(balances[i])
      mul = mul.mul(balances[i])
    }
  }

  // const a = 1;
  amplificationParameter = decimal(amplificationParameter)
  const b = invariant
    .div(amplificationParameter.mul(numTokens))
    .add(sum)
    .sub(invariant)
  const c = invariant
    .pow(numTokens + 1)
    .mul(-1)
    .div(
      amplificationParameter.mul(
        decimal(numTokens)
          .pow(numTokens + 1)
          .mul(mul)
      )
    )

  return b
    .mul(-1)
    .add(
      b
        .pow(2)
        .sub(c.mul(4))
        .squareRoot()
    )
    .div(2)
}
