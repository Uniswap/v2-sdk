import JSBI from 'jsbi'
import { Fraction, Percent } from '@reservoir-labs/sdk-core'
import { ONE, ZERO } from '../constants'

// accurate to 1 basis point
export const calculateSlippageAmount = (value: JSBI, slippage: Percent): { lower: JSBI; upper: JSBI } => {
  if (slippage.lessThan(ZERO)) {
    throw Error(`Unexpected slippage value: ${slippage}`)
  }
  return {
    lower: new Fraction(ONE)
      .add(slippage)
      .invert()
      .multiply(value).quotient,
    upper: new Fraction(ONE).add(slippage).multiply(value).quotient
  }
}
