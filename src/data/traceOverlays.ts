import type { SignalOverlays } from '@mapmanager/signal-viewer'
import type { AnalysisRow } from './sanPyTable'
import type { TraceOverlayDefinition } from '../models/traceCollection'

type OverlaySeries = SignalOverlays['scatterSeries'][number]
type OverlayPoint = OverlaySeries['points'][number]

export function overlaySeries(
  rows: AnalysisRow[],
  definitions: TraceOverlayDefinition[],
  sweep: number,
  colors: readonly string[],
): OverlaySeries[] {
  return definitions.map((definition, index) => ({
    id: definition.id,
    label: definition.label,
    color: colors[index % colors.length] ?? '#ffffff',
    points: overlayPoints(rows, definition, sweep),
  }))
}

function overlayPoints(
  rows: AnalysisRow[],
  definition: TraceOverlayDefinition,
  sweep: number,
): OverlayPoint[] {
  return rows
    .filter((row) => Number(row[definition.sweep_result]) === sweep)
    .flatMap((row) => {
      const x = Number(row[definition.x_result])
      const y = Number(row[definition.y_result])
      const resultId = String(row[definition.point_id_result] ?? '')
      if (!resultId || !Number.isFinite(x) || !Number.isFinite(y)) return []
      return [{
        id: `${resultId}:${definition.id}`,
        x,
        y,
        kind: definition.id,
        label: `${definition.label} ${resultId}`,
        metadata: row,
      }]
    })
}

export function resultIdFromOverlay(pointId: string | null): string | null {
  if (pointId === null) return null
  const separator = pointId.lastIndexOf(':')
  return separator < 0 ? pointId : pointId.slice(0, separator)
}
