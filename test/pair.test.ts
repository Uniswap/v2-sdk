import { Token, Pair } from '../src/entities'
import { ChainId } from '../src/constants'

describe('Pair', () => {
  describe('#getAddress', () => {
    it('returns the correct address', () => {
      const usdc = new Token(ChainId.MAINNET, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 18, 'USDC', 'USD Coin')
      const dai = new Token(ChainId.MAINNET, '0x6b175474e89094c44da98b954eedeac495271d0f', 18, 'DAI', 'DAI Stablecoin')
      expect(Pair.getAddress(usdc, dai))
        .toEqual('0x910FA6BE0358EBA8C27d31EFFB40103A02938b66')
    })
  })
})
