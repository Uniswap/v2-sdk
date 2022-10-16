import JSBI from 'jsbi'

export enum AppName {
  UNISWAP = 'uniswap',
  SUSHISWAP = 'sushiswap',
  QUICKSWAP = 'quickswap',
  TRISOLARIS = 'trisolaris',
  PANCAKESWAP = 'pancakeswap',
  APESWAP = 'apeswap',
  TRADERJOEXYZ = 'traderjoexyz'
}

class FactoryProps {
  public factoryAddress: string
  public pairInitCodeHash: string
  public constructor(factoryAddress: string, pairInitCodeHash: string) {
    this.factoryAddress = factoryAddress
    this.pairInitCodeHash = pairInitCodeHash
  }
}

export const FACTORY_PROPS: { [chainId: number]: { [appName: string]: FactoryProps } } = {
  [1]: {
    [AppName.UNISWAP]: new FactoryProps(
      '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
    )
  },
  [137]: {
    [AppName.SUSHISWAP]: new FactoryProps(
      '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303'
    ),
    [AppName.QUICKSWAP]: new FactoryProps(
      '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
    )
  },
  [1313161554]: {
    [AppName.TRISOLARIS]: new FactoryProps(
      '0xc66F594268041dB60507F00703b152492fb176E7',
      '0x754e1d90e536e4c1df81b7f030f47b4ca80c87120e145c294f098c83a6cb5ace'
    )
  }
}

export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000)

// exports for internal consumption
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)
export const FIVE = JSBI.BigInt(5)
export const _997 = JSBI.BigInt(997)
export const _1000 = JSBI.BigInt(1000)
