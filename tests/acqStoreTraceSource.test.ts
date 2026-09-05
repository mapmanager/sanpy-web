import { describe, expect, it } from 'vitest'
import { chooseMinMaxFactor } from '../src/data/acqStoreTraceSource'

describe('chooseMinMaxFactor', () => {
  const factors = [16, 256, 4096]
  it('uses exact samples when the visible range fits', () => expect(chooseMinMaxFactor(1600, 2000, factors)).toBeUndefined())
  it('chooses the finest adequate pyramid', () => expect(chooseMinMaxFactor(20_000, 1000, factors)).toBe(256))
  it('uses the coarsest level for long ranges', () => expect(chooseMinMaxFactor(1_200_000, 1000, factors)).toBe(4096))
})
