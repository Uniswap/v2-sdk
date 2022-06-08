import JSBI from 'jsbi'
import { Pair, Route, Trade } from './entities'
import { Router } from './router'
import invariant from 'tiny-invariant'
import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core'
import { WONE as WONE5, ONE as _ONE } from '@zuzu-cat/defira-sdk-core'

function checkDeadline(deadline: string[] | string): void {
  expect(typeof deadline).toBe('string')
  invariant(typeof deadline === 'string')
  // less than 5 seconds on the deadline
  expect(new Date().getTime() / 1000 - parseInt(deadline)).toBeLessThanOrEqual(5)
}

describe('Router', () => {
  const CHAIN_ID = 1666600000
  const ONE = _ONE.onChain(CHAIN_ID)
  const token0 = new Token(CHAIN_ID, '0x0000000000000000000000000000000000000001', 18, 't0')
  const token1 = new Token(CHAIN_ID, '0x0000000000000000000000000000000000000002', 18, 't1')

  const pair_0_1 = new Pair(
    CurrencyAmount.fromRawAmount(token0, JSBI.BigInt(1000)),
    CurrencyAmount.fromRawAmount(token1, JSBI.BigInt(1000))
  )

  const pair_wone_0 = new Pair(
    CurrencyAmount.fromRawAmount(WONE5[CHAIN_ID], '1000'),
    CurrencyAmount.fromRawAmount(token0, '1000')
  )

  describe('#swapCallParameters', () => {
    describe('exact in', () => {
      it.only('ether to token1', () => {
        const result = Router.swapCallParameters(
          Trade.exactIn(
            new Route([pair_wone_0, pair_0_1], ONE, token1),
            CurrencyAmount.fromRawAmount(_ONE.onChain(CHAIN_ID), JSBI.BigInt(100))
          ),
          { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapExactETHForTokens')
        expect(result.args.slice(0, -1)).toEqual([
          '0x51',
          [WONE5[CHAIN_ID].address, token0.address, token1.address],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x64')
        checkDeadline(result.args[result.args.length - 1])
      })

      it('deadline specified', () => {
        const result = Router.swapCallParameters(
          Trade.exactIn(
            new Route([pair_wone_0, pair_0_1], ONE, token1),
            CurrencyAmount.fromRawAmount(_ONE.onChain(CHAIN_ID), JSBI.BigInt(100))
          ),
          {
            deadline: 50,
            recipient: '0x0000000000000000000000000000000000000004',
            allowedSlippage: new Percent('1', '100')
          }
        )
        expect(result.methodName).toEqual('swapExactETHForTokens')
        expect(result.args).toEqual([
          '0x51',
          [WONE5[CHAIN_ID].address, token0.address, token1.address],
          '0x0000000000000000000000000000000000000004',
          '0x32'
        ])
        expect(result.value).toEqual('0x64')
      })

      it('token1 to ether', () => {
        const result = Router.swapCallParameters(
          Trade.exactIn(
            new Route([pair_0_1, pair_wone_0], token1, ONE),
            CurrencyAmount.fromRawAmount(token1, JSBI.BigInt(100))
          ),
          { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapExactTokensForETH')
        expect(result.args.slice(0, -1)).toEqual([
          '0x64',
          '0x51',
          [token1.address, token0.address, WONE5[CHAIN_ID].address],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
        checkDeadline(result.args[result.args.length - 1])
      })
      it('token0 to token1', () => {
        const result = Router.swapCallParameters(
          Trade.exactIn(new Route([pair_0_1], token0, token1), CurrencyAmount.fromRawAmount(token0, JSBI.BigInt(100))),
          { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapExactTokensForTokens')
        expect(result.args.slice(0, -1)).toEqual([
          '0x64',
          '0x59',
          [token0.address, token1.address],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
        checkDeadline(result.args[result.args.length - 1])
      })
    })
    describe('exact out', () => {
      it('ether to token1', () => {
        const result = Router.swapCallParameters(
          Trade.exactOut(
            new Route([pair_wone_0, pair_0_1], ONE, token1),
            CurrencyAmount.fromRawAmount(token1, JSBI.BigInt(100))
          ),
          { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapETHForExactTokens')
        expect(result.args.slice(0, -1)).toEqual([
          '0x64',
          [WONE5[CHAIN_ID].address, token0.address, token1.address],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x80')
        checkDeadline(result.args[result.args.length - 1])
      })
      it('token1 to ether', () => {
        const result = Router.swapCallParameters(
          Trade.exactOut(
            new Route([pair_0_1, pair_wone_0], token1, ONE),
            CurrencyAmount.fromRawAmount(_ONE.onChain(CHAIN_ID), JSBI.BigInt(100))
          ),
          { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapTokensForExactETH')
        expect(result.args.slice(0, -1)).toEqual([
          '0x64',
          '0x80',
          [token1.address, token0.address, WONE5[CHAIN_ID].address],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
        checkDeadline(result.args[result.args.length - 1])
      })
      it('token0 to token1', () => {
        const result = Router.swapCallParameters(
          Trade.exactOut(new Route([pair_0_1], token0, token1), CurrencyAmount.fromRawAmount(token1, JSBI.BigInt(100))),
          { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapTokensForExactTokens')
        expect(result.args.slice(0, -1)).toEqual([
          '0x64',
          '0x71',
          [token0.address, token1.address],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
        checkDeadline(result.args[result.args.length - 1])
      })
    })
    describe('supporting fee on transfer', () => {
      describe('exact in', () => {
        it('ether to token1', () => {
          const result = Router.swapCallParameters(
            Trade.exactIn(
              new Route([pair_wone_0, pair_0_1], ONE, token1),
              CurrencyAmount.fromRawAmount(_ONE.onChain(CHAIN_ID), JSBI.BigInt(100))
            ),
            {
              ttl: 50,
              recipient: '0x0000000000000000000000000000000000000004',
              allowedSlippage: new Percent('1', '100'),
              feeOnTransfer: true
            }
          )
          expect(result.methodName).toEqual('swapExactETHForTokensSupportingFeeOnTransferTokens')
          expect(result.args.slice(0, -1)).toEqual([
            '0x51',
            [WONE5[CHAIN_ID].address, token0.address, token1.address],
            '0x0000000000000000000000000000000000000004'
          ])
          expect(result.value).toEqual('0x64')
          checkDeadline(result.args[result.args.length - 1])
        })
        it('token1 to ether', () => {
          const CHAIN_ID = 1666600000
          const result = Router.swapCallParameters(
            Trade.exactIn(
              new Route([pair_0_1, pair_wone_0], token1, ONE),
              CurrencyAmount.fromRawAmount(token1, JSBI.BigInt(100))
            ),
            {
              ttl: 50,
              recipient: '0x0000000000000000000000000000000000000004',
              allowedSlippage: new Percent('1', '100'),
              feeOnTransfer: true
            }
          )
          expect(result.methodName).toEqual('swapExactTokensForETHSupportingFeeOnTransferTokens')
          expect(result.args.slice(0, -1)).toEqual([
            '0x64',
            '0x51',
            [token1.address, token0.address, WONE5[CHAIN_ID].address],
            '0x0000000000000000000000000000000000000004'
          ])
          expect(result.value).toEqual('0x0')
          checkDeadline(result.args[result.args.length - 1])
        })
        it('token0 to token1', () => {
          const result = Router.swapCallParameters(
            Trade.exactIn(
              new Route([pair_0_1], token0, token1),
              CurrencyAmount.fromRawAmount(token0, JSBI.BigInt(100))
            ),
            {
              ttl: 50,
              recipient: '0x0000000000000000000000000000000000000004',
              allowedSlippage: new Percent('1', '100'),
              feeOnTransfer: true
            }
          )
          expect(result.methodName).toEqual('swapExactTokensForTokensSupportingFeeOnTransferTokens')
          expect(result.args.slice(0, -1)).toEqual([
            '0x64',
            '0x59',
            [token0.address, token1.address],
            '0x0000000000000000000000000000000000000004'
          ])
          expect(result.value).toEqual('0x0')
          checkDeadline(result.args[result.args.length - 1])
        })
      })
      describe('exact out', () => {
        it('ether to token1', () => {
          expect(() =>
            Router.swapCallParameters(
              Trade.exactOut(
                new Route([pair_wone_0, pair_0_1], ONE, token1),
                CurrencyAmount.fromRawAmount(token1, JSBI.BigInt(100))
              ),
              {
                ttl: 50,
                recipient: '0x0000000000000000000000000000000000000004',
                allowedSlippage: new Percent('1', '100'),
                feeOnTransfer: true
              }
            )
          ).toThrow('EXACT_OUT_FOT')
        })
        it('token1 to ether', () => {
          expect(() =>
            Router.swapCallParameters(
              Trade.exactOut(
                new Route([pair_0_1, pair_wone_0], token1, ONE),
                CurrencyAmount.fromRawAmount(_ONE.onChain(CHAIN_ID), JSBI.BigInt(100))
              ),
              {
                ttl: 50,
                recipient: '0x0000000000000000000000000000000000000004',
                allowedSlippage: new Percent('1', '100'),
                feeOnTransfer: true
              }
            )
          ).toThrow('EXACT_OUT_FOT')
        })
        it('token0 to token1', () => {
          expect(() =>
            Router.swapCallParameters(
              Trade.exactOut(
                new Route([pair_0_1], token0, token1),
                CurrencyAmount.fromRawAmount(token1, JSBI.BigInt(100))
              ),
              {
                ttl: 50,
                recipient: '0x0000000000000000000000000000000000000004',
                allowedSlippage: new Percent('1', '100'),
                feeOnTransfer: true
              }
            )
          ).toThrow('EXACT_OUT_FOT')
        })
      })
    })
  })
})
