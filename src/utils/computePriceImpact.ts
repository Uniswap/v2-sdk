import { CurrencyAmount } from '../entities/fractions/currencyAmount'
import { Percent } from '../entities/fractions/percent'
import { Price } from '../entities/fractions/price'

/**
 * Returns the percent difference between the mid price and the execution price, i.e. price impact.
 * @param midPrice mid price before the trade
 * @param inputAmount the input amount of the trade
 * @param outputAmount the output amount of the trade
 */
export function computePriceImpact(
  midPrice: Price,
  inputAmount: CurrencyAmount,
  outputAmount: CurrencyAmount
): Percent {
  const quotedOutputAmount = midPrice.quote(inputAmount)
  // calculate price impact := (exactQuote - outputAmount) / exactQuote
  const priceImpact = quotedOutputAmount.subtract(outputAmount).divide(quotedOutputAmount)
  return new Percent(priceImpact.numerator, priceImpact.denominator)
}
