import { Fetcher } from './fetcher'
import { WETH9 as _WETH9 } from '@reservoir-labs/sdk-core/dist/entities/weth9'
import { BaseProvider } from '@ethersproject/providers'
import { WebSocketProvider } from '@ethersproject/providers'
import { Token, WETH9 } from '@reservoir-labs/sdk-core'

describe('fetcher', () => {
  let provider: BaseProvider = new WebSocketProvider('ws://127.0.0.1:8545')
  const USDC_AVAX = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'

  it('should fetch pairs', async () => {
    const pairs = await Fetcher.fetchAllPairs(43114, provider)

    expect(pairs.length).toEqual(1)
  })

  describe('fetchRelevantPairs', () => {
    it('should not return pairs that have not been created', async () => {
      const relevantPairs = await Fetcher.fetchRelevantPairs(
        43114,
        WETH9[43114],
        new Token(43114, USDC_AVAX, 6),
        provider
      )
      expect(relevantPairs.length).toBeLessThan(6)
    })
  })
})
