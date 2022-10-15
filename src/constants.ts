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
  public initCodeHash: string
  public constructor(factoryAddress: string, initCodeHash: string) {
    this.factoryAddress = factoryAddress
    this.initCodeHash = initCodeHash
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
      '0x8912bec8495aa7a7b156c25c603d9c2579a4a447b205457adfb360021fc67963'
    ),
    [AppName.QUICKSWAP]: new FactoryProps(
      '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      '0xe54ba6cde2b5c88ab883218c9847d0f1a3e0d14a4eedd70e4bfd304578bfbce4'
    )
  },
  [1313161554]: {
    [AppName.TRISOLARIS]: new FactoryProps(
      '0xc66F594268041dB60507F00703b152492fb176E7',
      '0xc4a5c12be15a4a9fa6029ac83707cd15bcaf9b03436b05bd8852835fb12bb216'
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
