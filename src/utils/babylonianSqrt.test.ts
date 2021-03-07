import JSBI from 'jsbi'
import babylonianSqrt from './babylonianSqrt'

describe('#babylonianSqrt', () => {
  it('correct for 0-1000', () => {
    for (let i = 0; i < 1000; i++) {
      expect(babylonianSqrt(JSBI.BigInt(i))).toEqual(JSBI.BigInt(Math.floor(Math.sqrt(i))))
    }
  })
})
