import { Token, Currency, CurrencyAmount, Percent, TradeType, validateAndParseAddress } from '@reservoir-labs/sdk-core'
import { Pair, Trade } from './entities'
import invariant from 'tiny-invariant'

/**
 * Options for producing the arguments to send call to the router.
 */
export interface TradeOptions {
  /**
   * How much the execution price is allowed to move unfavorably from the trade execution price.
   */
  allowedSlippage: Percent
  /**
   * The account that should receive the output of the swap.
   */
  recipient: string

  /**
   * Whether any of the tokens in the path are fee on transfer tokens, which should be handled with special methods
   */
  feeOnTransfer?: boolean
}

/**
 * The parameters to use in the call to the Uniswap V2 Router to execute a trade.
 */
export interface SwapParameters {
  /**
   * The method to call on the Uniswap V2 Router.
   */
  methodName: string
  /**
   * The arguments to pass to the method, all hex encoded.
   */
  args: (string | string[] | number[])[]
  /**
   * The amount of wei to send in hex.
   */
  value: string
}

function toHex(currencyAmount: CurrencyAmount<Currency>) {
  return `0x${currencyAmount.quotient.toString(16)}`
}

const ZERO_HEX = '0x0'

/**
 * Represents the Uniswap V2 Router, and has static methods for helping execute trades.
 */
export abstract class Router {
  /**
   * Cannot be constructed.
   */
  private constructor() {}
  /**
   * Produces the on-chain method name to call and the hex encoded parameters to pass as arguments for a given trade.
   * @param trade to produce call parameters for
   * @param options options for the call parameters
   */
  public static swapCallParameters(trade: Trade<Currency, Currency, TradeType>, options: TradeOptions): SwapParameters {
    // TODO: where do we insert in the multicall to wrap / unwrap things?
    const etherIn = trade.inputAmount.currency.isNative
    const etherOut = trade.outputAmount.currency.isNative
    // the router does not support both ether in and out
    invariant(!(etherIn && etherOut), 'ETHER_IN_OUT')

    const to: string = validateAndParseAddress(options.recipient)
    const amountIn: string = toHex(trade.maximumAmountIn(options.allowedSlippage))
    const amountOut: string = toHex(trade.minimumAmountOut(options.allowedSlippage))
    const path: string[] = trade.route.path.map((token: Token) => token.address)
    const curveIds: number[] = trade.route.pairs.map((pair: Pair) => pair.curveId)

    let methodName: string
    let args: (string | string[] | number[])[]
    let value: string = ZERO_HEX
    switch (trade.tradeType) {
      case TradeType.EXACT_INPUT:
        methodName = 'swapExactForVariable'
        // uint amountIn, uint amountOutMin, address[] path, uint256[] curveIds, address to
        args = [amountIn, amountOut, path, curveIds, to]
        break
      case TradeType.EXACT_OUTPUT:
        methodName = 'swapVariableForExact'
        // uint amountOut, uint amountInMax, address[] path, uint256[] curveIds, address to
        args = [amountOut, amountIn, path, curveIds, to]
        break
    }
    return {
      methodName,
      args,
      // TODO: should we remove value?
      value
    }
  }
}
