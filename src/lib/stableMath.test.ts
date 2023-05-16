import { calculateStableSpotPrice } from './stableMath'
import {DEFAULT_AMPLIFICATION_COEFFICIENT_PRECISE, /*ONE_ETHER*/} from '../constants'
import { Decimal } from 'decimal.js'
import {decimal} from "./numbers";
import {Price, Token} from "@reservoir-labs/sdk-core";

describe('stableMath', () => {
  const token0 = new Token(1, '0x0000000000000000000000000000000000000001', 18, 't0')
  const token1 = new Token(1, '0x0000000000000000000000000000000000000001', 18, 't0')

  it('calculateStableSpotPrice', () => {
    const scaledReserve0 = '103219283019283019283'
    const scaledReserve1 = '5003210341820391823093'
    const amplificationCoefficient = DEFAULT_AMPLIFICATION_COEFFICIENT_PRECISE

    const result = calculateStableSpotPrice(scaledReserve0, scaledReserve1, amplificationCoefficient.toString())

    expect(result.toString()).toEqual('1.2987033193626902185')
  })

  it('asd', () => {
    const scaledReserve0 = '150006'
    const scaledReserve1 = '0.014163206786684748'
    const amplificationCoefficient = DEFAULT_AMPLIFICATION_COEFFICIENT_PRECISE

    Decimal.set({ toExpPos: 50 })

    const result = calculateStableSpotPrice(scaledReserve1, scaledReserve0, amplificationCoefficient.toString())

    console.log(result)

    const frac = result.toFraction()
    console.log("0", frac[0].toString())
    console.log(frac[1].toString())

    const resultString = result.mul(decimal(10).pow(18)).trunc().valueOf()
    console.log("res", resultString)

    // this is one way to fix the problem
    new Price(token0, token1, frac[1].toString(), frac[0].toString())

    // another way to fix it is to set the expPos to a very large number
    // Decimal.set({ toExpPos: 30 })
  })
})
