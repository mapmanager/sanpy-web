import type { SignalViewport } from '@mapmanager/signal-viewer'

export interface ViewportTarget {
  setViewport(viewport: SignalViewport): Promise<void>
}

/** Mirror viewport changes serially while retaining the latest requested range. */
export function createViewportMirror(): (
  target: ViewportTarget | null,
  viewport: SignalViewport,
) => Promise<void> {
  let active = false
  let pending: { target: ViewportTarget; viewport: SignalViewport } | null = null

  return async (target, viewport) => {
    if (!target) return
    pending = { target, viewport: { ...viewport } }
    if (active) return
    active = true
    try {
      while (pending) {
        const next = pending
        pending = null
        await next.target.setViewport(next.viewport)
      }
    } finally {
      active = false
    }
  }
}
