import { describe, expect, it, vi } from 'vitest'

import { createViewportMirror } from '../src/viewportLink'

describe('linked signal viewports', () => {
  it('applies the latest range requested while an earlier update is loading', async () => {
    let finishFirst!: () => void
    const firstRequest = new Promise<void>((resolve) => { finishFirst = resolve })
    const setViewport = vi.fn()
      .mockImplementationOnce(() => firstRequest)
      .mockResolvedValue(undefined)
    const mirror = createViewportMirror()

    const first = mirror({ setViewport }, { xMin: 0, xMax: 100 })
    await mirror({ setViewport }, { xMin: 10, xMax: 90 })
    await mirror({ setViewport }, { xMin: 20, xMax: 80 })

    expect(setViewport).toHaveBeenCalledTimes(1)
    finishFirst()
    await first

    expect(setViewport).toHaveBeenCalledTimes(2)
    expect(setViewport).toHaveBeenLastCalledWith({ xMin: 20, xMax: 80 })
  })
})
