// taken from https://github.com/Uniswap/uniswap-v3-sdk
import { Interface } from '@ethersproject/abi'
import MulticallJson from '../lib/v3-periphery/out/Multicall.sol/Multicall.json'

export abstract class Multicall {
  public static INTERFACE: Interface = new Interface(MulticallJson.abi)

  /**
   * Cannot be constructed.
   */
  private constructor() {}

  public static encodeMulticall(calldatas: string | string[]): string {
    if (!Array.isArray(calldatas)) {
      calldatas = [calldatas]
    }

    return calldatas.length === 1 ? calldatas[0] : Multicall.INTERFACE.encodeFunctionData('multicall', [calldatas])
  }
}
