import { BigintIsh, Price, sqrt, Token, CurrencyAmount } from '@reservoir-labs/sdk-core'
import invariant from 'tiny-invariant'
import JSBI from 'jsbi'
import { keccak256, pack } from '@ethersproject/solidity'
import { getCreate2Address } from '@ethersproject/address'

import { FACTORY_ADDRESS, MINIMUM_LIQUIDITY, FIVE, FEE_ACCURACY, ONE, ZERO } from '../constants'
import { InsufficientReservesError, InsufficientInputAmountError } from '../errors'
import ConstantProductPair from '../abis/ConstantProductPair.json'
import StablePair from '../abis/StablePair.json'
import { defaultAbiCoder } from '@ethersproject/abi'
import { calcInGivenOut, calcOutGivenIn } from '../lib/balancer-math'

export const computePairAddress = ({
  factoryAddress,
  tokenA,
  tokenB,
  curveId
}: {
  factoryAddress: string
  tokenA: Token
  tokenB: Token
  curveId: number
}): string => {
  const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA] // does safety checks

  let initCode: any

  switch (curveId) {
    case 0:
      initCode = ConstantProductPair.bytecode.object
      break
    case 1:
      initCode = StablePair.bytecode.object
      break
  }

  const encodedTokenAddresses = defaultAbiCoder.encode(['address', 'address'], [token0.address, token1.address])
  const initCodeWithTokens = pack(['bytes', 'bytes'], [initCode, encodedTokenAddresses])

  // N.B: we do not use a salt as the initCode is unique with token0 and token1 appended to it
  return getCreate2Address(
    factoryAddress,
    // TODO: to replace this zero bytes32 with a constant instead of using a string literal
    pack(['bytes32'], ['0x0000000000000000000000000000000000000000000000000000000000000000']),
    keccak256(['bytes'], [initCodeWithTokens])
  )
}
export class Pair {
  public readonly liquidityToken: Token
  private readonly tokenAmounts: [CurrencyAmount<Token>, CurrencyAmount<Token>]

  private readonly curveId: number

  // TODO: does the frontend dev need to know about the platformFee as well?
  // not necessary for the swap function, but for the misc info about yield yes
  public readonly swapFee: JSBI

  // 0 for ConstantProductPair, non-zero for StablePair
  public readonly amplificationCoefficient: JSBI

  public static getAddress(tokenA: Token, tokenB: Token, curveId: number): string {
    return computePairAddress({ factoryAddress: FACTORY_ADDRESS, tokenA, tokenB, curveId })
  }

  public constructor(
    currencyAmountA: CurrencyAmount<Token>,
    tokenAmountB: CurrencyAmount<Token>,
    curveId: number,
    swapFee: JSBI = JSBI.BigInt(3000),
    amplificationCoefficient: JSBI = JSBI.BigInt(0)
  ) {
    invariant(curveId == 0 || curveId == 1, 'INVALID_CURVE_ID')
    const tokenAmounts = currencyAmountA.currency.sortsBefore(tokenAmountB.currency) // does safety checks
      ? [currencyAmountA, tokenAmountB]
      : [tokenAmountB, currencyAmountA]
    this.liquidityToken = new Token(
      tokenAmounts[0].currency.chainId,
      Pair.getAddress(tokenAmounts[0].currency, tokenAmounts[1].currency, curveId),
      18,
      'RES-LP',
      'Reservoir LP Token'
    )
    this.tokenAmounts = tokenAmounts as [CurrencyAmount<Token>, CurrencyAmount<Token>]
    this.curveId = curveId
    this.swapFee = swapFee
    this.amplificationCoefficient = amplificationCoefficient
  }

  /**
   * Returns true if the token is either token0 or token1
   * @param token to check
   */
  public involvesToken(token: Token): boolean {
    return token.equals(this.token0) || token.equals(this.token1)
  }

  /**
   * Returns the current mid price of the pair in terms of token0, i.e. the ratio of reserve1 to reserve0
   */
  // TODO: refactor this to take into account stable curve?
  public get token0Price(): Price<Token, Token> {
    const result = this.tokenAmounts[1].divide(this.tokenAmounts[0])
    return new Price(this.token0, this.token1, result.denominator, result.numerator)
  }

  /**
   * Returns the current mid price of the pair in terms of token1, i.e. the ratio of reserve0 to reserve1
   */
  // TODO: refactor this to take into account stable curve?
  public get token1Price(): Price<Token, Token> {
    const result = this.tokenAmounts[0].divide(this.tokenAmounts[1])
    return new Price(this.token1, this.token0, result.denominator, result.numerator)
  }

  /**
   * Return the price of the given token in terms of the other token in the pair.
   * @param token token to return price of
   */
  public priceOf(token: Token): Price<Token, Token> {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0) ? this.token0Price : this.token1Price
  }

  /**
   * Returns the chain ID of the tokens in the pair.
   */
  public get chainId(): number {
    return this.token0.chainId
  }

  public get token0(): Token {
    return this.tokenAmounts[0].currency
  }

  public get token1(): Token {
    return this.tokenAmounts[1].currency
  }

  public get reserve0(): CurrencyAmount<Token> {
    return this.tokenAmounts[0]
  }

  public get reserve1(): CurrencyAmount<Token> {
    return this.tokenAmounts[1]
  }

  public reserveOf(token: Token): CurrencyAmount<Token> {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0) ? this.reserve0 : this.reserve1
  }

  public getOutputAmount(inputAmount: CurrencyAmount<Token>): [CurrencyAmount<Token>, Pair] {
    invariant(this.involvesToken(inputAmount.currency), 'TOKEN')
    if (JSBI.equal(this.reserve0.quotient, ZERO) || JSBI.equal(this.reserve1.quotient, ZERO)) {
      throw new InsufficientReservesError()
    }
    const inputReserve = this.reserveOf(inputAmount.currency)
    const outputReserve = this.reserveOf(inputAmount.currency.equals(this.token0) ? this.token1 : this.token0)
    const inputAmountWithFee = JSBI.multiply(inputAmount.quotient, JSBI.subtract(FEE_ACCURACY, this.swapFee))
    let outputAmount

    if (this.curveId == 0) {
      const numerator = JSBI.multiply(inputAmountWithFee, outputReserve.quotient)
      const denominator = JSBI.add(JSBI.multiply(inputReserve.quotient, FEE_ACCURACY), inputAmountWithFee)
      outputAmount = CurrencyAmount.fromRawAmount(
        inputAmount.currency.equals(this.token0) ? this.token1 : this.token0,
        JSBI.divide(numerator, denominator)
      )
      if (JSBI.equal(outputAmount.quotient, ZERO)) {
        throw new InsufficientInputAmountError()
      }
    } else if (this.curveId == 1) {
      const scaledBalances = this._scaleAmounts([inputReserve, outputReserve])
      const scaledInputAmount = this._scaleAmounts([inputAmount])

      outputAmount = calcOutGivenIn(
        scaledBalances.map(bal => bal.toString()),
        this.amplificationCoefficient.toString(),
        0,
        1,
        scaledInputAmount[0].toString()
      )

      outputAmount = CurrencyAmount.fromRawAmount(
        inputAmount.currency.equals(this.token0) ? this.token1 : this.token0,
        JSBI.BigInt(outputAmount.toString())
      )
    }

    // @ts-ignore
    return [outputAmount, new Pair(inputReserve.add(inputAmount), outputReserve.subtract(outputAmount), this.curveId)]
  }

  public getInputAmount(outputAmount: CurrencyAmount<Token>): [CurrencyAmount<Token>, Pair] {
    invariant(this.involvesToken(outputAmount.currency), 'TOKEN')
    if (
      JSBI.equal(this.reserve0.quotient, ZERO) ||
      JSBI.equal(this.reserve1.quotient, ZERO) ||
      JSBI.greaterThanOrEqual(outputAmount.quotient, this.reserveOf(outputAmount.currency).quotient)
    ) {
      throw new InsufficientReservesError()
    }

    let outputReserve = this.reserveOf(outputAmount.currency)
    let inputReserve = this.reserveOf(outputAmount.currency.equals(this.token0) ? this.token1 : this.token0)
    let inputAmount

    if (this.curveId == 0) {
      const numerator = JSBI.multiply(JSBI.multiply(inputReserve.quotient, outputAmount.quotient), FEE_ACCURACY)
      const denominator = JSBI.multiply(
        JSBI.subtract(outputReserve.quotient, outputAmount.quotient),
        JSBI.subtract(FEE_ACCURACY, this.swapFee)
      )
      inputAmount = CurrencyAmount.fromRawAmount(
        outputAmount.currency.equals(this.token0) ? this.token1 : this.token0,
        JSBI.add(JSBI.divide(numerator, denominator), ONE)
      )
    } else if (this.curveId == 1) {
      const scaledBalances = this._scaleAmounts([inputReserve, outputReserve])
      const scaledOutputAmount = this._scaleAmounts([outputAmount])

      inputAmount = calcInGivenOut(
        scaledBalances.map(bal => bal.toString()),
        this.amplificationCoefficient.toString(),
        0,
        1,
        scaledOutputAmount[0].toString()
      )

      inputAmount = CurrencyAmount.fromRawAmount(
        outputAmount.currency.equals(this.token0) ? this.token1 : this.token0,
        JSBI.BigInt(inputAmount.toString())
      )
        .multiply(JSBI.add(FEE_ACCURACY, this.swapFee)) // add fee
        .divide(FEE_ACCURACY)
    }

    // @ts-ignore
    return [inputAmount, new Pair(inputReserve.add(inputAmount), outputReserve.subtract(outputAmount), this.curveId)]
  }

  private _scaleAmounts(amounts: CurrencyAmount<Token>[]): JSBI[] {
    return amounts.map(amount => {
      return JSBI.multiply(
        JSBI.multiply(JSBI.BigInt(amount.toExact()), JSBI.BigInt(amount.decimalScale)),
        JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(18 - amount.currency.decimals))
      )
    })
  }

  // TODO: refactor this for stablePair calculations?
  public getLiquidityMinted(
    totalSupply: CurrencyAmount<Token>,
    tokenAmountA: CurrencyAmount<Token>,
    tokenAmountB: CurrencyAmount<Token>
  ): CurrencyAmount<Token> {
    invariant(totalSupply.currency.equals(this.liquidityToken), 'LIQUIDITY')
    const tokenAmounts = tokenAmountA.currency.sortsBefore(tokenAmountB.currency) // does safety checks
      ? [tokenAmountA, tokenAmountB]
      : [tokenAmountB, tokenAmountA]
    invariant(tokenAmounts[0].currency.equals(this.token0) && tokenAmounts[1].currency.equals(this.token1), 'TOKEN')

    let liquidity: JSBI
    if (JSBI.equal(totalSupply.quotient, ZERO)) {
      liquidity = JSBI.subtract(
        sqrt(JSBI.multiply(tokenAmounts[0].quotient, tokenAmounts[1].quotient)),
        MINIMUM_LIQUIDITY
      )
    } else {
      const amount0 = JSBI.divide(JSBI.multiply(tokenAmounts[0].quotient, totalSupply.quotient), this.reserve0.quotient)
      const amount1 = JSBI.divide(JSBI.multiply(tokenAmounts[1].quotient, totalSupply.quotient), this.reserve1.quotient)
      liquidity = JSBI.lessThanOrEqual(amount0, amount1) ? amount0 : amount1
    }
    if (!JSBI.greaterThan(liquidity, ZERO)) {
      throw new InsufficientInputAmountError()
    }
    return CurrencyAmount.fromRawAmount(this.liquidityToken, liquidity)
  }

  // TODO: KIV, might need to refactor for the stablePair
  public getLiquidityValue(
    token: Token,
    totalSupply: CurrencyAmount<Token>,
    liquidity: CurrencyAmount<Token>,
    feeOn: boolean = false,
    kLast?: BigintIsh
  ): CurrencyAmount<Token> {
    invariant(this.involvesToken(token), 'TOKEN')
    invariant(totalSupply.currency.equals(this.liquidityToken), 'TOTAL_SUPPLY')
    invariant(liquidity.currency.equals(this.liquidityToken), 'LIQUIDITY')
    invariant(JSBI.lessThanOrEqual(liquidity.quotient, totalSupply.quotient), 'LIQUIDITY')

    let totalSupplyAdjusted: CurrencyAmount<Token>
    if (!feeOn) {
      totalSupplyAdjusted = totalSupply
    } else {
      invariant(!!kLast, 'K_LAST')
      const kLastParsed = JSBI.BigInt(kLast)
      if (!JSBI.equal(kLastParsed, ZERO)) {
        const rootK = sqrt(JSBI.multiply(this.reserve0.quotient, this.reserve1.quotient))
        const rootKLast = sqrt(kLastParsed)
        if (JSBI.greaterThan(rootK, rootKLast)) {
          const numerator = JSBI.multiply(totalSupply.quotient, JSBI.subtract(rootK, rootKLast))
          const denominator = JSBI.add(JSBI.multiply(rootK, FIVE), rootKLast)
          const feeLiquidity = JSBI.divide(numerator, denominator)
          totalSupplyAdjusted = totalSupply.add(CurrencyAmount.fromRawAmount(this.liquidityToken, feeLiquidity))
        } else {
          totalSupplyAdjusted = totalSupply
        }
      } else {
        totalSupplyAdjusted = totalSupply
      }
    }

    return CurrencyAmount.fromRawAmount(
      token,
      JSBI.divide(JSBI.multiply(liquidity.quotient, this.reserveOf(token).quotient), totalSupplyAdjusted.quotient)
    )
  }
}
