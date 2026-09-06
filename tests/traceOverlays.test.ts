import { describe, expect, it } from 'vitest'
import { overlaySeries, resultIdFromOverlay } from '../src/data/traceOverlays'

const definitions = [{
  id: 'peaks',
  label: 'Peaks',
  x_result: 'peakSec',
  y_result: 'peakVal',
  point_id_result: 'spikeNumber',
  sweep_result: 'sweep',
}]

describe('runtime-defined trace overlays', () => {
  it('maps named result columns without hard-coded peak coordinates', () => {
    const rows = [
      { spikeNumber: 7, sweep: 0, peakSec: 1.25, peakVal: 42 },
      { spikeNumber: 8, sweep: 1, peakSec: 2.5, peakVal: 43 },
    ]
    const series = overlaySeries(rows, definitions, 0, ['#fff'])
    expect(series[0]?.points).toEqual([expect.objectContaining({ id: '7:peaks', x: 1.25, y: 42 })])
  })

  it('maps an overlay selection back to its analysis row', () => {
    expect(resultIdFromOverlay('7:peaks')).toBe('7')
    expect(resultIdFromOverlay(null)).toBeNull()
  })
})
