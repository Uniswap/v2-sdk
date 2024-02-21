import { BigNumber } from '@ethersproject/bignumber'
import { ChainId, CurrencyAmount, Price, Token, WETH9 } from '@uniswap/sdk-core'
import { FACTORY_ADDRESS } from '../constants'
import { InsufficientInputAmountError } from '../errors'
import { computePairAddress, Pair } from './pair'

describe('computePairAddress', () => {
  it('should correctly compute the pool address', () => {
    const tokenA = new Token(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 18, 'USDC', 'USD Coin')
    const tokenB = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'DAI Stablecoin')
    const result = computePairAddress({
      factoryAddress: '0x1111111111111111111111111111111111111111',
      tokenA,
      tokenB
    })

    expect(result).toEqual('0xb50b5182D6a47EC53a469395AF44e371d7C76ed4')
  })
  it('should give same result regardless of token order', () => {
    const USDC = new Token(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 18, 'USDC', 'USD Coin')
    const DAI = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'DAI Stablecoin')
    let tokenA = USDC
    let tokenB = DAI
    const resultA = computePairAddress({
      factoryAddress: '0x1111111111111111111111111111111111111111',
      tokenA,
      tokenB
    })

    tokenA = DAI
    tokenB = USDC
    const resultB = computePairAddress({
      factoryAddress: '0x1111111111111111111111111111111111111111',
      tokenA,
      tokenB
    })

    expect(resultA).toEqual(resultB)
  })
})

describe('Pair', () => {
  const USDC = new Token(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 18, 'USDC', 'USD Coin')
  const DAI = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'DAI Stablecoin')

  const USDC_SEPOLIA = new Token(11155111, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 18, 'USDC', 'USD Coin')
  const DAI_SEPOLIA = new Token(11155111, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'DAI Stablecoin')

  describe('constructor', () => {
    it('cannot be used for tokens on different chains', () => {
      expect(
        () => new Pair(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(WETH9[3], '100'))
      ).toThrow('CHAIN_IDS')
    })
  })

  describe('#getAddress', () => {
    it('returns the correct address', () => {
      expect(Pair.getAddress(USDC, DAI)).toEqual('0xAE461cA67B15dc8dc81CE7615e0320dA1A9aB8D5')
    })

    it('returns the default address for a testnet not in the map', () => {
      expect(Pair.getAddress(USDC_SEPOLIA, DAI_SEPOLIA)).toEqual(
        computePairAddress({
          factoryAddress: FACTORY_ADDRESS,
          tokenA: USDC_SEPOLIA,
          tokenB: DAI_SEPOLIA
        })
      )
    })
  })

  describe('#token0', () => {
    it('always is the token that sorts before', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '100')).token0
      ).toEqual(DAI)
      expect(
        new Pair(CurrencyAmount.fromRawAmount(DAI, '100'), CurrencyAmount.fromRawAmount(USDC, '100')).token0
      ).toEqual(DAI)
    })
  })
  describe('#token1', () => {
    it('always is the token that sorts after', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '100')).token1
      ).toEqual(USDC)
      expect(
        new Pair(CurrencyAmount.fromRawAmount(DAI, '100'), CurrencyAmount.fromRawAmount(USDC, '100')).token1
      ).toEqual(USDC)
    })
  })
  describe('#reserve0', () => {
    it('always comes from the token that sorts before', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '101')).reserve0
      ).toEqual(CurrencyAmount.fromRawAmount(DAI, '101'))
      expect(
        new Pair(CurrencyAmount.fromRawAmount(DAI, '101'), CurrencyAmount.fromRawAmount(USDC, '100')).reserve0
      ).toEqual(CurrencyAmount.fromRawAmount(DAI, '101'))
    })
  })
  describe('#reserve1', () => {
    it('always comes from the token that sorts after', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '101')).reserve1
      ).toEqual(CurrencyAmount.fromRawAmount(USDC, '100'))
      expect(
        new Pair(CurrencyAmount.fromRawAmount(DAI, '101'), CurrencyAmount.fromRawAmount(USDC, '100')).reserve1
      ).toEqual(CurrencyAmount.fromRawAmount(USDC, '100'))
    })
  })

  describe('#token0Price', () => {
    it('returns price of token0 in terms of token1', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(USDC, '101'), CurrencyAmount.fromRawAmount(DAI, '100')).token0Price
      ).toEqual(new Price(DAI, USDC, '100', '101'))
      expect(
        new Pair(CurrencyAmount.fromRawAmount(DAI, '100'), CurrencyAmount.fromRawAmount(USDC, '101')).token0Price
      ).toEqual(new Price(DAI, USDC, '100', '101'))
    })
  })

  describe('#token1Price', () => {
    it('returns price of token1 in terms of token0', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(USDC, '101'), CurrencyAmount.fromRawAmount(DAI, '100')).token1Price
      ).toEqual(new Price(USDC, DAI, '101', '100'))
      expect(
        new Pair(CurrencyAmount.fromRawAmount(DAI, '100'), CurrencyAmount.fromRawAmount(USDC, '101')).token1Price
      ).toEqual(new Price(USDC, DAI, '101', '100'))
    })
  })

  describe('#priceOf', () => {
    const pair = new Pair(CurrencyAmount.fromRawAmount(USDC, '101'), CurrencyAmount.fromRawAmount(DAI, '100'))
    it('returns price of token in terms of other token', () => {
      expect(pair.priceOf(DAI)).toEqual(pair.token0Price)
      expect(pair.priceOf(USDC)).toEqual(pair.token1Price)
    })

    it('throws if invalid token', () => {
      expect(() => pair.priceOf(WETH9[1])).toThrow('TOKEN')
    })
  })

  describe('#reserveOf', () => {
    it('returns reserves of the given token', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '101')).reserveOf(USDC)
      ).toEqual(CurrencyAmount.fromRawAmount(USDC, '100'))
      expect(
        new Pair(CurrencyAmount.fromRawAmount(DAI, '101'), CurrencyAmount.fromRawAmount(USDC, '100')).reserveOf(USDC)
      ).toEqual(CurrencyAmount.fromRawAmount(USDC, '100'))
    })

    it('throws if not in the pair', () => {
      expect(() =>
        new Pair(CurrencyAmount.fromRawAmount(DAI, '101'), CurrencyAmount.fromRawAmount(USDC, '100')).reserveOf(
          WETH9[1]
        )
      ).toThrow('TOKEN')
    })
  })

  describe('#chainId', () => {
    it('returns the token0 chainId', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '100')).chainId
      ).toEqual(1)
      expect(
        new Pair(CurrencyAmount.fromRawAmount(DAI, '100'), CurrencyAmount.fromRawAmount(USDC, '100')).chainId
      ).toEqual(1)
    })
  })
  describe('#involvesToken', () => {
    expect(
      new Pair(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '100')).involvesToken(USDC)
    ).toEqual(true)
    expect(
      new Pair(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '100')).involvesToken(DAI)
    ).toEqual(true)
    expect(
      new Pair(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '100')).involvesToken(
        WETH9[1]
      )
    ).toEqual(false)
  })
  describe('getInputAmount and getOutputAmount', () => {
    const BLASTBuyFeeBps = BigNumber.from(400)
    const BLASTSellFeeBps = BigNumber.from(10000)
    const BLAST = new Token(
      ChainId.MAINNET,
      '0x3ed643e9032230f01c6c36060e305ab53ad3b482',
      18,
      'BLAST',
      'BLAST',
      false,
      BLASTBuyFeeBps,
      BLASTSellFeeBps
    )
    const BLAST_WIHTOUT_TAX = new Token(
      ChainId.MAINNET,
      '0x3ed643e9032230f01c6c36060e305ab53ad3b482',
      18,
      'BLAST',
      'BLAST',
      false
    )
    const BLASTERSBuyFeeBps = BigNumber.from(300)
    const BLASTERSSellFeeBps = BigNumber.from(350)
    const BLASTERS = new Token(
      ChainId.MAINNET,
      '0xab98093C7232E98A47D7270CE0c1c2106f61C73b',
      9,
      'BLAST',
      'BLASTERS',
      false,
      BLASTERSBuyFeeBps,
      BLASTERSSellFeeBps
    )
    const BLASTERS_WITHOUT_TAX = new Token(
      ChainId.MAINNET,
      '0xab98093C7232E98A47D7270CE0c1c2106f61C73b',
      9,
      'BLAST',
      'BLASTERS',
      false
    )

    let calculateFotFees: boolean = false

    describe('when calculating FOT fees', () => {
      beforeEach(() => {
        calculateFotFees = true
      })

      describe('getOutputAmount', () => {
        it('getOutputAmount for input token BLASTERS and output token BLAST', () => {
          const reserveBlasterAmount = CurrencyAmount.fromRawAmount(BLASTERS, '10000')
          const reserveBlastAmount = CurrencyAmount.fromRawAmount(BLAST, '10000')

          const pair = new Pair(reserveBlasterAmount, reserveBlastAmount)

          const inputBlastersAmount = CurrencyAmount.fromRawAmount(BLASTERS_WITHOUT_TAX, '100')
          const [outputBlastAmount] = pair.getOutputAmount(inputBlastersAmount, calculateFotFees)

          // Theoretical amount out:
          // (10000 * 997 * 100 * (1 - 3.5%) / (10000 * 1000 + 997 * 100 * (1 - 3.5%))) * (1 - 4%)
          // = 91.48
          //
          // However in practice, we have round down of precisions in multiple steps
          // hence the amount out will be slightly less than 91.48:
          //
          // inputAmount = 100
          // percentAfterSellFeesInDecimal = fraction(9650, 10000)
          // inputAmountAfterTax = 100 * fraction(9650, 10000) = 96.5 = 96 (rounded down)
          // inputAmountWithFeeAndAfterTax = 96 * 997 = 95712
          // numerator = 95712 * 10000 = 957120000
          // denominator = 10000 * 1000 + 95712 = 10095712
          // outputAmount = 957120000 / 10095712 = 94.8046061536 = 94 (rounded down)
          // buyFeePercentInDecimal = fraction(400, 10000)
          // percentAfterBuyFeesInDecimal = fraction(9600, 10000)
          // outputAmountAfterTax = 94 * fraction(9600, 10000)
          //                     = 94 * 0.96
          //                     = 90.24
          //                     = 90 (rounded down)
          const expectedOutputBlastAmount = '0.00000000000000009'
          expect(outputBlastAmount.toExact()).toEqual(expectedOutputBlastAmount)
        })

        it('getInputAmount for input token BLASTERS and output token BLAST', () => {
          const reserveBlasterAmount = CurrencyAmount.fromRawAmount(BLASTERS, '10000')
          const reserveBlastAmount = CurrencyAmount.fromRawAmount(BLAST, '10000')

          const pair = new Pair(reserveBlasterAmount, reserveBlastAmount)

          const outputBlastAmount = CurrencyAmount.fromRawAmount(BLAST_WIHTOUT_TAX, '91')
          const [inputBlasterAmount] = pair.getInputAmount(outputBlastAmount, calculateFotFees)

          // Theoretical amount in:
          // 10000 * 100 * (1 - 4%) * 1000 / ((10000 - 100 * (1 - 4%)) * 997) / (1 - 3.5%)
          // = 100.7483934892
          //
          // However in practice, we have round up of precisions in multiple steps
          // hence the amount out will be slightly more than 100.7483934892:
          //
          // buyFeePercentInDecimal = fraction(400, 10000)
          // percentAfterBuyFeesInDecimal = 1 - fraction(400, 10000) = fraction(9600, 10000)
          // outputAmountBeforeTax = 91 / fraction(960000, 10000) + 1
          //                     = 91 / 0.96 + 1
          //                     = 94.7916666667 + 1
          //                     = 94 (rounded down) + 1
          //                     = 95 (rounded up)
          // numerator = 10000 * 95 * 1000 = 950000000
          // denominator = (10000 - 95) * 997 = 9875285
          // inputAmount = 950000000 / 9875285 + 1
          //             = 96.1997552476 + 1
          //             = 96 (rounded down) + 1
          //             = 97 (rounded up)
          // sellFeePercentInDecimal = fraction(350, 10000)
          // percentAfterSellFeesInDecimal = 1 - fraction(350, 10000) = fraction(9650, 10000)
          // inputAmountBeforeTax = (97 / fraction(9650, 10000)) + 1
          //                     = (97 / 0.965) + 1
          //                     = 100.518134715 + 1
          //                     = 100 (rounded down) + 1
          //                     = 101
          const expectedInputBlasterAmount = '0.000000101'
          expect(inputBlasterAmount.toExact()).toEqual(expectedInputBlasterAmount)
        })
      })
    })

    describe('when NOT calculating FOT fees', () => {
      beforeEach(() => {
        calculateFotFees = false
      })

      describe('getOutputAmount', () => {
        it('getOutputAmount for input token BLASTERS and output token BLAST', () => {
          const reserveBlasterAmount = CurrencyAmount.fromRawAmount(BLASTERS, '10000')
          const reserveBlastAmount = CurrencyAmount.fromRawAmount(BLAST, '10000')

          const pair = new Pair(reserveBlasterAmount, reserveBlastAmount)

          const inputBlastersAmount = CurrencyAmount.fromRawAmount(BLASTERS_WITHOUT_TAX, '100')
          const [outputBlastAmount] = pair.getOutputAmount(inputBlastersAmount, calculateFotFees)

          const expectedOutputBlastAmount = '0.000000000000000098'
          expect(outputBlastAmount.toExact()).toEqual(expectedOutputBlastAmount)
        })

        it('getInputAmount for input token BLASTERS and output token BLAST', () => {
          const reserveBlasterAmount = CurrencyAmount.fromRawAmount(BLASTERS, '10000')
          const reserveBlastAmount = CurrencyAmount.fromRawAmount(BLAST, '10000')

          const pair = new Pair(reserveBlasterAmount, reserveBlastAmount)

          const outputBlastAmount = CurrencyAmount.fromRawAmount(BLAST_WIHTOUT_TAX, '91')
          const [inputBlasterAmount] = pair.getInputAmount(outputBlastAmount, calculateFotFees)

          const expectedInputBlasterAmount = '0.000000093'
          expect(inputBlasterAmount.toExact()).toEqual(expectedInputBlasterAmount)
        })
      })
    })
  })
  describe('miscellaneous', () => {
    it('getLiquidityMinted:0', async () => {
      const tokenA = new Token(3, '0x0000000000000000000000000000000000000001', 18)
      const tokenB = new Token(3, '0x0000000000000000000000000000000000000002', 18)
      const pair = new Pair(CurrencyAmount.fromRawAmount(tokenA, '0'), CurrencyAmount.fromRawAmount(tokenB, '0'))

      expect(() => {
        pair.getLiquidityMinted(
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '0'),
          CurrencyAmount.fromRawAmount(tokenA, '1000'),
          CurrencyAmount.fromRawAmount(tokenB, '1000')
        )
      }).toThrow(InsufficientInputAmountError)

      expect(() => {
        pair.getLiquidityMinted(
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '0'),
          CurrencyAmount.fromRawAmount(tokenA, '1000000'),
          CurrencyAmount.fromRawAmount(tokenB, '1')
        )
      }).toThrow(InsufficientInputAmountError)

      const liquidity = pair.getLiquidityMinted(
        CurrencyAmount.fromRawAmount(pair.liquidityToken, '0'),
        CurrencyAmount.fromRawAmount(tokenA, '1001'),
        CurrencyAmount.fromRawAmount(tokenB, '1001')
      )

      expect(liquidity.quotient.toString()).toEqual('1')
    })

    it('getLiquidityMinted:!0', async () => {
      const tokenA = new Token(3, '0x0000000000000000000000000000000000000001', 18)
      const tokenB = new Token(3, '0x0000000000000000000000000000000000000002', 18)
      const pair = new Pair(
        CurrencyAmount.fromRawAmount(tokenA, '10000'),
        CurrencyAmount.fromRawAmount(tokenB, '10000')
      )

      expect(
        pair
          .getLiquidityMinted(
            CurrencyAmount.fromRawAmount(pair.liquidityToken, '10000'),
            CurrencyAmount.fromRawAmount(tokenA, '2000'),
            CurrencyAmount.fromRawAmount(tokenB, '2000')
          )
          .quotient.toString()
      ).toEqual('2000')
    })

    it('getLiquidityValue:!feeOn', async () => {
      const tokenA = new Token(3, '0x0000000000000000000000000000000000000001', 18)
      const tokenB = new Token(3, '0x0000000000000000000000000000000000000002', 18)
      const pair = new Pair(CurrencyAmount.fromRawAmount(tokenA, '1000'), CurrencyAmount.fromRawAmount(tokenB, '1000'))

      {
        const liquidityValue = pair.getLiquidityValue(
          tokenA,
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '1000'),
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '1000'),
          false
        )
        expect(liquidityValue.currency.equals(tokenA)).toBe(true)
        expect(liquidityValue.quotient.toString()).toBe('1000')
      }

      // 500
      {
        const liquidityValue = pair.getLiquidityValue(
          tokenA,
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '1000'),
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '500'),
          false
        )
        expect(liquidityValue.currency.equals(tokenA)).toBe(true)
        expect(liquidityValue.quotient.toString()).toBe('500')
      }

      // tokenB
      {
        const liquidityValue = pair.getLiquidityValue(
          tokenB,
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '1000'),
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '1000'),
          false
        )
        expect(liquidityValue.currency.equals(tokenB)).toBe(true)
        expect(liquidityValue.quotient.toString()).toBe('1000')
      }
    })

    it('getLiquidityValue:feeOn', async () => {
      const tokenA = new Token(3, '0x0000000000000000000000000000000000000001', 18)
      const tokenB = new Token(3, '0x0000000000000000000000000000000000000002', 18)
      const pair = new Pair(CurrencyAmount.fromRawAmount(tokenA, '1000'), CurrencyAmount.fromRawAmount(tokenB, '1000'))

      const liquidityValue = pair.getLiquidityValue(
        tokenA,
        CurrencyAmount.fromRawAmount(pair.liquidityToken, '500'),
        CurrencyAmount.fromRawAmount(pair.liquidityToken, '500'),
        true,
        '250000' // 500 ** 2
      )
      expect(liquidityValue.currency.equals(tokenA)).toBe(true)
      expect(liquidityValue.quotient.toString()).toBe('917') // ceiling(1000 - (500 * (1 / 6)))
    })
  })
})
