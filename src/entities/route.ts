import invariant from 'tiny-invariant'
import { Currency, Price, Token } from '@reservoir-labs/sdk-core'

import { Pair } from './pair'
import { calculateStableSpotPrice } from '../lib/stableMath'

export class Route<TInput extends Currency, TOutput extends Currency> {
  public readonly pairs: Pair[]
  public readonly path: Token[]
  public readonly input: TInput
  public readonly output: TOutput

  public constructor(pairs: Pair[], input: TInput, output: TOutput) {
    invariant(pairs.length > 0, 'PAIRS')
    const chainId: number = pairs[0].chainId
    invariant(
      pairs.every(pair => pair.chainId === chainId),
      'CHAIN_IDS'
    )

    const wrappedInput = input.wrapped
    invariant(pairs[0].involvesToken(wrappedInput), 'INPUT')
    invariant(typeof output === 'undefined' || pairs[pairs.length - 1].involvesToken(output.wrapped), 'OUTPUT')

    const path: Token[] = [wrappedInput]
    for (const [i, pair] of pairs.entries()) {
      const currentInput = path[i]
      invariant(currentInput.equals(pair.token0) || currentInput.equals(pair.token1), 'PATH')
      const output = currentInput.equals(pair.token0) ? pair.token1 : pair.token0
      path.push(output)
    }

    this.pairs = pairs
    this.path = path
    this.input = input
    this.output = output
  }

  private _midPrice: Price<TInput, TOutput> | null = null

  public get midPrice(): Price<TInput, TOutput> {
    if (this._midPrice !== null) return this._midPrice
    const prices: Price<Currency, Currency>[] = []
    for (const [i, pair] of this.pairs.entries()) {
      prices.push(this._getPrice(this.path[i], pair))
    }
    const reduced = prices.slice(1).reduce((accumulator, currentValue) => accumulator.multiply(currentValue), prices[0])
    return (this._midPrice = new Price(this.input, this.output, reduced.denominator, reduced.numerator))
  }

  private _getPrice(token: Token, pair: Pair): Price<Currency, Currency> {
    invariant(pair, 'PAIR NULL')
    let price
    if (pair.curveId === 0) {
      price = token.equals(pair.token0)
        ? new Price(pair.reserve0.currency, pair.reserve1.currency, pair.reserve0.quotient, pair.reserve1.quotient)
        : new Price(pair.reserve1.currency, pair.reserve0.currency, pair.reserve1.quotient, pair.reserve0.quotient)
    } else {
      if (token.equals(pair.token0)) {
        const stableSpotPrice = calculateStableSpotPrice(
          pair.reserve0.toExact(),
          pair.reserve1.toExact(),
          pair.amplificationCoefficient!.toString()
        )
        // we express the price as a fraction with the numerator at index 0 and denominator at index 1
        // to feed into the `Price` constructor
        const frac = stableSpotPrice.toFraction()
        price = new Price(pair.reserve0.currency, pair.reserve1.currency, frac[1].toString(), frac[0].toString())
      } else {
        const stableSpotPrice = calculateStableSpotPrice(
          pair.reserve1.toExact(),
          pair.reserve0.toExact(),
          pair.amplificationCoefficient!.toString()
        )
        const frac = stableSpotPrice.toFraction()
        price = new Price(pair.reserve1.currency, pair.reserve0.currency, frac[1].toString(), frac[0].toString())
      }
    }
    return price
  }

  public get chainId(): number {
    return this.pairs[0].chainId
  }
}
