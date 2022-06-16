import { Token, Price, CurrencyAmount } from '@uniswap/sdk-core'
import { WONE as WONE5 } from '@zuzu-cat/defira-sdk-core'
import { InsufficientInputAmountError } from '../errors'
import { computePairAddress, Pair } from './pair'
import { INIT_CODE_HASH, FACTORY_ADDRESS } from '../constants'

describe('computePairAddress', () => {
  it('should correctly compute the pool address', () => {
    const CHAIN_ID = 1666600000
    const WONE = new Token(CHAIN_ID, '0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a', 18, 'WONE', 'Wrapped ONE')
    const ETH = new Token(CHAIN_ID, '0x6983D1E6DEf3690C4d616b13597A09e6193EA013', 18, '1ETH', 'ETH')
    const result = computePairAddress({
      factoryAddress: FACTORY_ADDRESS,
      initHashCode: INIT_CODE_HASH,
      tokenA: WONE,
      tokenB: ETH
    })

    expect(result).toEqual('0xBc132b3A5A345069846c5e6f49FE28FeC01E7c47')
  })
  it('should give same result regardless of token order', () => {
    const CHAIN_ID = 1666600000
    const WONE = new Token(CHAIN_ID, '0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a', 18, 'WONE', 'Wrapped ONE')
    const ETH = new Token(CHAIN_ID, '0x6983D1E6DEf3690C4d616b13597A09e6193EA013', 18, '1ETH', 'ETH')
    let tokenA = WONE
    let tokenB = ETH
    const resultA = computePairAddress({
      factoryAddress: FACTORY_ADDRESS,
      initHashCode: INIT_CODE_HASH,
      tokenA,
      tokenB
    })

    tokenA = ETH
    tokenB = WONE
    const resultB = computePairAddress({
      factoryAddress: FACTORY_ADDRESS,
      initHashCode: INIT_CODE_HASH,
      tokenA,
      tokenB
    })

    expect(resultA).toEqual(resultB)
  })
})

describe('Pair', () => {
  const CHAIN_ID1 = 1666600000
  const CHAIN_ID2 = 1666600002
  const CHAIN_ID3 = 1666700000
  const WONE = new Token(CHAIN_ID1, '0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a', 18, 'WONE', 'Wrapped ONE')
  const ETH = new Token(CHAIN_ID1, '0x6983D1E6DEf3690C4d616b13597A09e6193EA013', 18, '1ETH', 'ETH')
  const USDC = new Token(CHAIN_ID1, '0x0000000000000000000000000000000000000001', 18, 'USDC', 'USD Coin')
  const USDC2 = new Token(CHAIN_ID2, '0x0000000000000000000000000000000000000001', 18, 'USDC', 'USD Coin')

  describe('constructor', () => {
    it('cannot be used for tokens on different chains but the same network', () => {
      expect(
        () => new Pair(CurrencyAmount.fromRawAmount(WONE, '100'), CurrencyAmount.fromRawAmount(WONE5[CHAIN_ID2], '100'))
      ).toThrow('CHAIN_IDS')
    })
    it('cannot be used for tokens on different chains and different networks', () => {
      expect(
        () => new Pair(CurrencyAmount.fromRawAmount(ETH, '100'), CurrencyAmount.fromRawAmount(WONE5[CHAIN_ID3], '100'))
      ).toThrow('CHAIN_IDS')
    })
  })

  describe('#getAddress', () => {
    it('returns the correct address', () => {
      expect(Pair.getAddress(WONE, ETH)).toEqual('0xBc132b3A5A345069846c5e6f49FE28FeC01E7c47')
    })
  })

  describe('#token0', () => {
    it('always is the token that sorts before', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(ETH, '100'), CurrencyAmount.fromRawAmount(WONE, '100')).token0
      ).toEqual(ETH)
      expect(
        new Pair(CurrencyAmount.fromRawAmount(WONE, '100'), CurrencyAmount.fromRawAmount(ETH, '100')).token0
      ).toEqual(ETH)
    })
  })
  describe('#token1', () => {
    it('always is the token that sorts after', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(ETH, '100'), CurrencyAmount.fromRawAmount(WONE, '100')).token1
      ).toEqual(WONE)
      expect(
        new Pair(CurrencyAmount.fromRawAmount(WONE, '100'), CurrencyAmount.fromRawAmount(ETH, '100')).token1
      ).toEqual(WONE)
    })
  })
  describe('#reserve0', () => {
    it('always comes from the token that sorts before', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(ETH, '100'), CurrencyAmount.fromRawAmount(WONE, '101')).reserve0
      ).toEqual(CurrencyAmount.fromRawAmount(ETH, '100'))
      expect(
        new Pair(CurrencyAmount.fromRawAmount(WONE, '101'), CurrencyAmount.fromRawAmount(ETH, '100')).reserve0
      ).toEqual(CurrencyAmount.fromRawAmount(ETH, '100'))
    })
  })
  describe('#reserve1', () => {
    it('always comes from the token that sorts after', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(ETH, '100'), CurrencyAmount.fromRawAmount(WONE, '101')).reserve1
      ).toEqual(CurrencyAmount.fromRawAmount(WONE, '101'))
      expect(
        new Pair(CurrencyAmount.fromRawAmount(WONE, '101'), CurrencyAmount.fromRawAmount(ETH, '100')).reserve1
      ).toEqual(CurrencyAmount.fromRawAmount(WONE, '101'))
    })
  })

  describe('#token0Price', () => {
    it('returns price of token0 in terms of token1', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(ETH, '101'), CurrencyAmount.fromRawAmount(WONE, '100')).token0Price
      ).toEqual(new Price(ETH, WONE, '101', '100'))
      expect(
        new Pair(CurrencyAmount.fromRawAmount(WONE, '100'), CurrencyAmount.fromRawAmount(ETH, '101')).token0Price
      ).toEqual(new Price(ETH, WONE, '101', '100'))
    })
  })

  describe('#token1Price', () => {
    it('returns price of token1 in terms of token0', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(ETH, '101'), CurrencyAmount.fromRawAmount(WONE, '100')).token1Price
      ).toEqual(new Price(WONE, ETH, '100', '101'))
      expect(
        new Pair(CurrencyAmount.fromRawAmount(WONE, '100'), CurrencyAmount.fromRawAmount(ETH, '101')).token1Price
      ).toEqual(new Price(WONE, ETH, '100', '101'))
    })
  })

  describe('#priceOf', () => {
    const pair = new Pair(CurrencyAmount.fromRawAmount(ETH, '101'), CurrencyAmount.fromRawAmount(WONE, '100'))
    it('returns price of token in terms of other token', () => {
      expect(pair.priceOf(ETH)).toEqual(pair.token0Price)
      expect(pair.priceOf(WONE)).toEqual(pair.token1Price)
    })

    it('throws if invalid token', () => {
      expect(() => pair.priceOf(USDC)).toThrow('TOKEN')
    })
  })

  describe('#reserveOf', () => {
    it('returns reserves of the given token', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(ETH, '100'), CurrencyAmount.fromRawAmount(WONE, '101')).reserveOf(ETH)
      ).toEqual(CurrencyAmount.fromRawAmount(ETH, '100'))
      expect(
        new Pair(CurrencyAmount.fromRawAmount(WONE, '101'), CurrencyAmount.fromRawAmount(ETH, '100')).reserveOf(ETH)
      ).toEqual(CurrencyAmount.fromRawAmount(ETH, '100'))
    })

    it('throws if not in the pair', () => {
      expect(() =>
        new Pair(CurrencyAmount.fromRawAmount(WONE, '101'), CurrencyAmount.fromRawAmount(ETH, '100')).reserveOf(USDC2)
      ).toThrow('TOKEN')
    })
  })

  describe('#chainId', () => {
    it('returns the token0 chainId', () => {
      expect(
        new Pair(CurrencyAmount.fromRawAmount(ETH, '100'), CurrencyAmount.fromRawAmount(WONE, '100')).chainId
      ).toEqual(CHAIN_ID1)
      expect(
        new Pair(CurrencyAmount.fromRawAmount(WONE, '100'), CurrencyAmount.fromRawAmount(ETH, '100')).chainId
      ).toEqual(CHAIN_ID1)
    })
  })
  describe('#involvesToken', () => {
    expect(
      new Pair(CurrencyAmount.fromRawAmount(ETH, '100'), CurrencyAmount.fromRawAmount(WONE, '100')).involvesToken(ETH)
    ).toEqual(true)
    expect(
      new Pair(CurrencyAmount.fromRawAmount(ETH, '100'), CurrencyAmount.fromRawAmount(WONE, '100')).involvesToken(WONE)
    ).toEqual(true)
    expect(
      new Pair(CurrencyAmount.fromRawAmount(ETH, '100'), CurrencyAmount.fromRawAmount(WONE, '100')).involvesToken(USDC)
    ).toEqual(false)
  })
  describe('miscellaneous', () => {
    it('getLiquidityMinted:0', async () => {
      const CHAIN_ID = 1666600002
      const tokenA = new Token(CHAIN_ID, '0x0000000000000000000000000000000000000001', 18)
      const tokenB = new Token(CHAIN_ID, '0x0000000000000000000000000000000000000002', 18)
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
      const CHAIN_ID = 1666600000
      const tokenA = new Token(CHAIN_ID, '0x0000000000000000000000000000000000000001', 18)
      const tokenB = new Token(CHAIN_ID, '0x0000000000000000000000000000000000000002', 18)
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
      const CHAIN_ID = 1666600000
      const tokenA = new Token(CHAIN_ID, '0x0000000000000000000000000000000000000001', 18)
      const tokenB = new Token(CHAIN_ID, '0x0000000000000000000000000000000000000002', 18)
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
      const CHAIN_ID = 1666600000
      const tokenA = new Token(CHAIN_ID, '0x0000000000000000000000000000000000000001', 18)
      const tokenB = new Token(CHAIN_ID, '0x0000000000000000000000000000000000000002', 18)
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
