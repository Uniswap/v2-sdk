import { Token } from './token'
import { ChainId } from '../constants'

export const WETH: { [chainId: number]: Token } = {
  [ChainId.MAINNET]: new Token(ChainId.MAINNET, '0x891CDB91D149F23B1A45D9C5CA78A88D0CB44C18', 6, 'WTRX', 'Wrapped TRX'),
  [ChainId.NILE]: new Token(ChainId.NILE, '0x8f44113A985076431b77f6078f0929f949cB8836', 6, 'WTRX', 'Wrapped TRX'),
  [ChainId.SHASTA]: new Token(ChainId.SHASTA, '0xB970B980C520EC3F49921C2727BFA6DE79E7226A', 6, 'WTRX', 'Wrapped TRX')
}
