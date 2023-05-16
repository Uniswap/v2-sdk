import { calculateStableSpotPrice } from './stableMath'
import { DEFAULT_AMPLIFICATION_COEFFICIENT_PRECISE /*ONE_ETHER*/ } from '../constants'
import { Price, Token } from '@reservoir-labs/sdk-core'

describe('stableMath', () => {
  const token0 = new Token(1, '0x0000000000000000000000000000000000000001', 18, 't0')
  const token1 = new Token(1, '0x0000000000000000000000000000000000000001', 18, 't0')

  it('calculateStableSpotPrice', () => {
    const scaledReserve0 = '103219283019283019283'
    const scaledReserve1 = '5003210341820391823093'
    const amplificationCoefficient = DEFAULT_AMPLIFICATION_COEFFICIENT_PRECISE

    const result = calculateStableSpotPrice(scaledReserve0, scaledReserve1, amplificationCoefficient.toString())

    expect(result.toString()).toEqual('1.2987033193626896932')
  })

  it('output of calculateStableSpotPrice feeds nicely into Price', () => {
    const scaledReserve0 = '150006'
    const scaledReserve1 = '0.014163206786684748'
    const amplificationCoefficient = DEFAULT_AMPLIFICATION_COEFFICIENT_PRECISE

    const result = calculateStableSpotPrice(scaledReserve1, scaledReserve0, amplificationCoefficient.toString())
    const frac = result.toFraction()

    // this is one way to fix the problem
    const price = new Price(token0, token1, frac[1].toString(), frac[0].toString())

    expect(price.toFixed(10)).toEqual('5051125.1559835484')
  })
})
