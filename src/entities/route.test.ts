import { Token, CurrencyAmount } from '@uniswap/sdk-core'
import { ONE as _ONE, WONE as WONE9 } from '@zuzu-cat/defira-sdk-core'
import { Pair, Route } from './index'

describe('Route', () => {
  const CHAIN_ID = 1666600000
  const ONE = _ONE.onChain(CHAIN_ID)
  const token0 = new Token(CHAIN_ID, '0x0000000000000000000000000000000000000001', 18, 't0')
  const token1 = new Token(CHAIN_ID, '0x0000000000000000000000000000000000000002', 18, 't1')
  const wone = WONE9[CHAIN_ID]
  const pair_0_1 = new Pair(CurrencyAmount.fromRawAmount(token0, '100'), CurrencyAmount.fromRawAmount(token1, '200'))
  const pair_0_wone = new Pair(CurrencyAmount.fromRawAmount(token0, '100'), CurrencyAmount.fromRawAmount(wone, '100'))
  const pair_1_wone = new Pair(CurrencyAmount.fromRawAmount(token1, '175'), CurrencyAmount.fromRawAmount(wone, '100'))

  it('constructs a path from the tokens', () => {
    const route = new Route([pair_0_1], token0, token1)
    expect(route.pairs).toEqual([pair_0_1])
    expect(route.path).toEqual([token0, token1])
    expect(route.input).toEqual(token0)
    expect(route.output).toEqual(token1)
    expect(route.chainId).toEqual(CHAIN_ID)
  })

  it('can have a token as both input and output', () => {
    const route = new Route([pair_0_wone, pair_0_1, pair_1_wone], wone, wone)
    expect(route.pairs).toEqual([pair_0_wone, pair_0_1, pair_1_wone])
    expect(route.input).toEqual(wone)
    expect(route.output).toEqual(wone)
  })

  it('supports ONE input', () => {
    const route = new Route([pair_0_wone], ONE, token0)
    expect(route.pairs).toEqual([pair_0_wone])
    expect(route.input).toEqual(ONE)
    expect(route.output).toEqual(token0)
  })

  it('supports ONE output', () => {
    const route = new Route([pair_0_wone], token0, ONE)
    expect(route.pairs).toEqual([pair_0_wone])
    expect(route.input).toEqual(token0)
    expect(route.output).toEqual(ONE)
  })
})
