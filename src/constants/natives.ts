import {
  Avalanche,
  Binance,
  Celo,
  Ether,
  Fantom,
  Harmony,
  Heco,
  Matic,
  Okex,
  xDai,
} from '../entities/natives'

import { ChainId } from '../enums'

export const NATIVE = {
  [ChainId.MAINNET]: Ether.onChain(ChainId.MAINNET),
  [ChainId.ROPSTEN]: Ether.onChain(ChainId.ROPSTEN),
  [ChainId.RINKEBY]: Ether.onChain(ChainId.RINKEBY),
  [ChainId.GÖRLI]: Ether.onChain(ChainId.GÖRLI),
  [ChainId.KOVAN]: Ether.onChain(ChainId.KOVAN),
  [ChainId.FANTOM]: Fantom.onChain(ChainId.FANTOM),
  [ChainId.FANTOM_TESTNET]: Fantom.onChain(ChainId.FANTOM_TESTNET),
  [ChainId.MATIC]: Matic.onChain(ChainId.MATIC),
  [ChainId.MATIC_TESTNET]: Matic.onChain(ChainId.MATIC_TESTNET),
  [ChainId.XDAI]: xDai.onChain(ChainId.XDAI),
  [ChainId.BSC]: Binance.onChain(ChainId.BSC),
  [ChainId.BSC_TESTNET]: Binance.onChain(ChainId.BSC_TESTNET),
  // [ChainId.MOONBEAM_TESTNET]: Currency.GLMR,
  [ChainId.AVALANCHE]: Avalanche.onChain(ChainId.AVALANCHE),
  [ChainId.AVALANCHE_TESTNET]: Avalanche.onChain(ChainId.AVALANCHE_TESTNET),
  [ChainId.HECO]: Heco.onChain(ChainId.HECO),
  [ChainId.HECO_TESTNET]: Heco.onChain(ChainId.HECO_TESTNET),
  [ChainId.HARMONY]: Harmony.onChain(ChainId.HARMONY),
  [ChainId.HARMONY_TESTNET]: Harmony.onChain(ChainId.HARMONY_TESTNET),
  [ChainId.OKEX]: Okex.onChain(ChainId.OKEX),
  [ChainId.OKEX_TESTNET]: Okex.onChain(ChainId.OKEX_TESTNET),
  [ChainId.CELO]: Celo.onChain(ChainId.CELO),
}
