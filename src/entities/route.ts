import { ChainId, Currency, ETHER, Price, Token, WETH9 } from '@uniswap/sdk-core'
import invariant from 'tiny-invariant'

import { Pair } from './pair'

export class Route {
  public readonly pairs: Pair[]
  public readonly path: Token[]
  public readonly input: Currency
  public readonly output: Currency

  public get midPrice(): Price {
    const prices: Price[] = []
    for (const [i, pair] of this.pairs.entries()) {
      prices.push(
        this.path[i].equals(pair.token0)
          ? new Price(pair.reserve0.currency, pair.reserve1.currency, pair.reserve0.raw, pair.reserve1.raw)
          : new Price(pair.reserve1.currency, pair.reserve0.currency, pair.reserve1.raw, pair.reserve0.raw)
      )
    }
    return prices.slice(1).reduce((accumulator, currentValue) => accumulator.multiply(currentValue), prices[0])
  }

  public constructor(pairs: Pair[], input: Currency, output?: Currency) {
    invariant(pairs.length > 0, 'PAIRS')
    const chainId: ChainId | number = pairs[0].chainId
    invariant(
      pairs.every(pair => pair.chainId === chainId),
      'CHAIN_IDS'
    )

    const weth: Token | undefined = WETH9[chainId as ChainId]

    invariant(
      (input instanceof Token && pairs[0].involvesToken(input)) ||
        (input === ETHER && weth && pairs[0].involvesToken(weth)),
      'INPUT'
    )
    invariant(
      typeof output === 'undefined' ||
        (output instanceof Token && pairs[pairs.length - 1].involvesToken(output)) ||
        (output === ETHER && weth && pairs[pairs.length - 1].involvesToken(weth)),
      'OUTPUT'
    )

    const path: Token[] = [input instanceof Token ? input : weth]
    for (const [i, pair] of pairs.entries()) {
      const currentInput = path[i]
      invariant(currentInput.equals(pair.token0) || currentInput.equals(pair.token1), 'PATH')
      const output = currentInput.equals(pair.token0) ? pair.token1 : pair.token0
      path.push(output)
    }

    this.pairs = pairs
    this.path = path
    this.input = input
    this.output = output ?? path[path.length - 1]
  }

  public get chainId(): ChainId | number {
    return this.pairs[0].chainId
  }
}
