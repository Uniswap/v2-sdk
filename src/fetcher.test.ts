import { Fetcher } from './fetcher'
import { WETH9 as _WETH9 } from '@reservoir-labs/sdk-core/dist/entities/weth9'
import { BaseProvider } from '@ethersproject/providers'
import { WebSocketProvider } from '@ethersproject/providers'

describe('fetcher', () => {
  let provider: BaseProvider = new WebSocketProvider('ws://127.0.0.1:8545')

  it('should fetch pairs', async () => {
    const pairs = await Fetcher.fetchAllPairs(43114, provider)

    expect(pairs.length).toEqual(1)
  })
})
