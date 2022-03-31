import { Token } from './token'
import { ChainId } from '../constants'

export const WETH: { [chainId: number]: Token } = {
  [ChainId.MAINNET]: new Token(ChainId.MAINNET, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 6, 'WBNB', 'Wrapped BNB'),
  [ChainId.TESTNET]: new Token(ChainId.TESTNET, '0xae13d989dac2f0debff460ac112a837c89baa7cd', 6, 'WBNB', 'Wrapped BNB')
}
