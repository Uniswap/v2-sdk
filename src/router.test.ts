import JSBI from 'jsbi'
import { Pair, Route, Trade } from './entities'
import { Router } from './router'
import { CurrencyAmount, Percent, Ether, Token, WETH9 } from '@reservoir-labs/sdk-core'

describe('Router', () => {
  const ETHER = Ether.onChain(1)
  const token0 = new Token(1, '0x0000000000000000000000000000000000000001', 18, 't0')
  const token1 = new Token(1, '0x0000000000000000000000000000000000000002', 18, 't1')

  const pair_0_1 = new Pair(
    CurrencyAmount.fromRawAmount(token0, JSBI.BigInt(1000)),
    CurrencyAmount.fromRawAmount(token1, JSBI.BigInt(1000)),
    0
  )

  const pair_weth_0 = new Pair(
    CurrencyAmount.fromRawAmount(WETH9[1], '1000'),
    CurrencyAmount.fromRawAmount(token0, '1000'),
    0
  )

  describe('#swapCallParameters', () => {
    describe('exact in', () => {
      it('ether to token1', () => {
        const result = Router.swapCallParameters(
          Trade.exactIn(
            new Route([pair_weth_0, pair_0_1], ETHER, token1),
            CurrencyAmount.fromRawAmount(Ether.onChain(1), JSBI.BigInt(100))
          ),
          { recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapExactForVariable')
        expect(result.args).toEqual([
          '0x64',
          '0x51',
          [WETH9[1].address, token0.address, token1.address],
          [0, 0],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
      })

      it('token1 to ether', () => {
        const result = Router.swapCallParameters(
          Trade.exactIn(
            new Route([pair_0_1, pair_weth_0], token1, ETHER),
            CurrencyAmount.fromRawAmount(token1, JSBI.BigInt(100))
          ),
          { recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapExactForVariable')
        expect(result.args).toEqual([
          '0x64',
          '0x51',
          [token1.address, token0.address, WETH9[1].address],
          [0, 0],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
      })
      it('token0 to token1', () => {
        const result = Router.swapCallParameters(
          Trade.exactIn(new Route([pair_0_1], token0, token1), CurrencyAmount.fromRawAmount(token0, JSBI.BigInt(100))),
          { recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapExactForVariable')
        expect(result.args).toEqual([
          '0x64',
          '0x59',
          [token0.address, token1.address],
          [0],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
      })
    })
    describe('exact out', () => {
      it('ether to token1', () => {
        const result = Router.swapCallParameters(
          Trade.exactOut(
            new Route([pair_weth_0, pair_0_1], ETHER, token1),
            CurrencyAmount.fromRawAmount(token1, JSBI.BigInt(100))
          ),
          { recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapVariableForExact')
        expect(result.args).toEqual([
          '0x64',
          '0x80',
          [WETH9[1].address, token0.address, token1.address],
          [0, 0],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
      })
      it('token1 to ether', () => {
        const result = Router.swapCallParameters(
          Trade.exactOut(
            new Route([pair_0_1, pair_weth_0], token1, ETHER),
            CurrencyAmount.fromRawAmount(Ether.onChain(1), JSBI.BigInt(100))
          ),
          { recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapVariableForExact')
        expect(result.args).toEqual([
          '0x64',
          '0x80',
          [token1.address, token0.address, WETH9[1].address],
          [0, 0],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
      })
      it('token0 to token1', () => {
        const result = Router.swapCallParameters(
          Trade.exactOut(new Route([pair_0_1], token0, token1), CurrencyAmount.fromRawAmount(token1, JSBI.BigInt(100))),
          { recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapVariableForExact')
        expect(result.args).toEqual([
          '0x64',
          '0x71',
          [token0.address, token1.address],
          [0],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
      })
    })
  })
})
