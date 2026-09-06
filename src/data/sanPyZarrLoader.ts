import type {
  LoadedSanPyCollection,
  ResourceFetch,
  SanPyCollection,
  SanPyRecording,
  TraceOverlayDocument,
} from '../models/traceCollection'
import { SANPY_ZARR_VERSION } from '../models/traceCollection'

function rootUrl(value: string | URL): URL {
  const base = typeof window === 'undefined' ? 'http://localhost/' : window.location.href
  return new URL(String(value).replace(/\/?$/, '/'), base)
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function relativePath(value: string): boolean {
  return !!value && !value.startsWith('/') && !value.includes('\\') && !value.split('/').includes('..')
}

export async function loadJson<T>(
  url: URL,
  resourceFetch: ResourceFetch,
  signal?: AbortSignal,
): Promise<T> {
  const response = await resourceFetch(url, signal ? { signal } : undefined)
  if (!response.ok) throw new Error(`Could not load ${url.href}: HTTP ${response.status}`)
  return await response.json() as T
}

export async function loadSanPyCollection(
  root: string | URL,
  resourceFetch: ResourceFetch = (input, init) => globalThis.fetch(input, init),
  signal?: AbortSignal,
): Promise<LoadedSanPyCollection> {
  const resolved = rootUrl(root)
  const collection = await loadJson<SanPyCollection>(new URL('collection.json', resolved), resourceFetch, signal)
  if (!object(collection) || collection.format !== 'sanpy-zarr' || collection.version !== SANPY_ZARR_VERSION || !Array.isArray(collection.members)) {
    throw new Error('Unsupported or invalid SanPy Zarr collection manifest')
  }
  const ids = new Set<string>()
  for (const member of collection.members) {
    if (!member.id || ids.has(member.id) || !relativePath(member.recording)) {
      throw new Error('Invalid SanPy Zarr member identity or path')
    }
    ids.add(member.id)
  }
  return { root: resolved, fetch: resourceFetch, collection }
}

export async function loadSanPyRecording(
  source: LoadedSanPyCollection,
  path: string,
  signal?: AbortSignal,
): Promise<SanPyRecording> {
  const recording = await loadJson<SanPyRecording>(new URL(path, source.root), source.fetch, signal)
  if (recording.format !== 'sanpy-zarr-recording' || recording.version !== SANPY_ZARR_VERSION) {
    throw new Error('Unsupported SanPy Zarr recording manifest')
  }
  if (!relativePath(recording.resources.data) || !relativePath(recording.resources.trace_overlays)) {
    throw new Error('Invalid SanPy Zarr recording resource path')
  }
  const representations = recording.resources.analysis_results.representations
  if (Object.values(representations).some((path) => path !== undefined && !relativePath(path))) {
    throw new Error('Invalid SanPy Zarr table resource path')
  }
  return recording
}

export async function loadTraceOverlays(
  source: LoadedSanPyCollection,
  recordingPath: string,
  path: string,
  signal?: AbortSignal,
): Promise<TraceOverlayDocument> {
  const recordingUrl = new URL(recordingPath, source.root)
  const document = await loadJson<TraceOverlayDocument>(new URL(path, recordingUrl), source.fetch, signal)
  if (!object(document) || !Array.isArray(document.overlays)) {
    throw new Error('Invalid SanPy trace-overlay document')
  }
  const ids = new Set<string>()
  for (const overlay of document.overlays) {
    const fields = [overlay.id, overlay.label, overlay.x_result, overlay.y_result, overlay.point_id_result, overlay.sweep_result]
    if (fields.some((value) => typeof value !== 'string' || !value) || ids.has(overlay.id)) {
      throw new Error('Invalid SanPy trace-overlay definition')
    }
    ids.add(overlay.id)
  }
  return document
}
