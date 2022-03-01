import invariant from 'tiny-invariant'

export class Currency {
  readonly decimals: number
  readonly symbol?: string
  readonly name?: string

  public static readonly ETHER: Currency = new Currency(6, 'TRX', 'Tron')

  protected constructor(decimals: number, symbol?: string, name?: string) {
    invariant(decimals >= 0 && decimals < 255 && Number.isInteger(decimals), 'DECIMALS')
    this.decimals = decimals
    this.name = name
    this.symbol = symbol
  }

  public equals(other: Currency): boolean {
    if (this === other) {
      return true
    }
    return this.name === other.name && this.symbol === other.symbol
  }
}

const ETHER = Currency.ETHER
export { ETHER }
