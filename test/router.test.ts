import invariant from 'tiny-invariant'
import { ChainId, CurrencyAmount, ETHER, Pair, Percent, Route, Router, Token, TokenAmount, Trade, WETH } from '../src'
import JSBI from 'jsbi'

function checkDeadline(deadline: string[] | string): void {
  expect(typeof deadline).toBe('string')
  invariant(typeof deadline === 'string')
  // less than 5 seconds on the deadline
  expect(new Date().getTime() / 1000 - parseInt(deadline)).toBeLessThanOrEqual(5)
}

describe('Router', () => {
  const token0 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000001', 18, 't0')
  const token1 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000002', 18, 't1')

  const pair_0_1 = new Pair(new TokenAmount(token0, JSBI.BigInt(1000)), new TokenAmount(token1, JSBI.BigInt(1000)))

  const pair_weth_0 = new Pair(new TokenAmount(WETH[ChainId.MAINNET], '1000'), new TokenAmount(token0, '1000'))

  describe('#swapCallParameters', () => {
    it('exact in ether to token1', () => {
      const result = Router.swapCallParameters(
        Trade.exactIn(new Route([pair_weth_0, pair_0_1], ETHER, token1), CurrencyAmount.ether(JSBI.BigInt(100))),
        { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
      )
      expect(result.methodName).toEqual('swapExactETHForTokens')
      expect(result.args.slice(0, -1)).toEqual([
        '0x51',
        [WETH[ChainId.MAINNET].address, token0.address, token1.address],
        '0x0000000000000000000000000000000000000004'
      ])
      checkDeadline(result.args[result.args.length - 1])
    })
  })
})
