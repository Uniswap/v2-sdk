import { calculateStableSpotPrice } from './stableMath'
import { DEFAULT_AMPLIFICATION_COEFFICIENT_PRECISE } from '../constants'

describe('stableMath', () => {
  it('calculateStableSpotPrice', () => {
    const scaledReserve0 = '103219283019283019283'
    const scaledReserve1 = '5003210341820391823093'
    const amplificationCoefficient = DEFAULT_AMPLIFICATION_COEFFICIENT_PRECISE

    const result = calculateStableSpotPrice(scaledReserve0, scaledReserve1, amplificationCoefficient.toString())

    expect(result.toString()).toEqual('1.2987033193626902185')
  })
})
