import type {
  LoadedSanPyCollection,
  AnalysisResultDefinitions,
  MetadataDefinitions,
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

function quoted(value: unknown): string {
  return JSON.stringify(value) ?? 'undefined'
}

function relativePathProblem(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return 'missing (expected a relative path)'
  if (typeof value !== 'string' || !relativePath(value)) return `${quoted(value)} (expected a relative path)`
  return null
}

const RECORDING_RESOURCE_PATHS = [
  'data',
  'experimental_metadata',
  'experimental_metadata_definitions',
  'file_metadata',
  'file_metadata_definitions',
  'detection_parameters',
  'detection_parameter_definitions',
  'analysis_result_definitions',
  'trace_overlays',
] as const

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
  const collection = await loadJson<unknown>(new URL('collection.json', resolved), resourceFetch, signal)
  if (!object(collection)) throw new Error('Invalid SanPy Zarr collection manifest in collection.json: expected an object')
  if (collection.format !== 'sanpy-zarr') {
    throw new Error(`Unsupported SanPy Zarr collection format in collection.json: found ${quoted(collection.format)}, expected "sanpy-zarr"`)
  }
  if (collection.version !== SANPY_ZARR_VERSION) {
    throw new Error(`Unsupported SanPy Zarr collection version in collection.json: found ${quoted(collection.version)}, expected ${quoted(SANPY_ZARR_VERSION)}`)
  }
  if (!Array.isArray(collection.members)) throw new Error('Invalid SanPy Zarr collection members in collection.json: expected an array')
  const ids = new Set<unknown>()
  for (const member of collection.members) {
    if (!object(member)) throw new Error('Invalid SanPy Zarr member in collection.json: expected an object')
    if (!member.id) throw new Error('Invalid SanPy Zarr member id in collection.json: missing')
    if (ids.has(member.id)) throw new Error(`Invalid SanPy Zarr member id in collection.json: duplicate ${quoted(member.id)}`)
    const problem = relativePathProblem(member.recording)
    if (problem) throw new Error(`Invalid SanPy Zarr member recording in collection.json for ${quoted(member.id)}: ${problem}`)
    ids.add(member.id)
  }
  return { root: resolved, fetch: resourceFetch, collection: collection as unknown as SanPyCollection }
}

export async function loadSanPyRecording(
  source: LoadedSanPyCollection,
  path: string,
  signal?: AbortSignal,
): Promise<SanPyRecording> {
  const recording = await loadJson<unknown>(new URL(path, source.root), source.fetch, signal)
  if (!object(recording)) throw new Error(`Invalid SanPy Zarr recording manifest in ${path}: expected an object`)
  if (recording.format !== 'sanpy-zarr-recording') {
    throw new Error(`Unsupported SanPy Zarr recording format in ${path}: found ${quoted(recording.format)}, expected "sanpy-zarr-recording"`)
  }
  if (recording.version !== SANPY_ZARR_VERSION) {
    throw new Error(`Unsupported SanPy Zarr recording version in ${path}: found ${quoted(recording.version)}, expected ${quoted(SANPY_ZARR_VERSION)}`)
  }
  if (!object(recording.resources)) {
    throw new Error(`Invalid SanPy Zarr recording resource "resources" in ${path}: missing (expected an object)`)
  }
  for (const key of RECORDING_RESOURCE_PATHS) {
    const problem = relativePathProblem(recording.resources[key])
    if (problem) throw new Error(`Invalid SanPy Zarr recording resource ${quoted(key)} in ${path}: ${problem}`)
  }
  const analysis = recording.resources.analysis_results
  if (!object(analysis)) {
    const problem = analysis === undefined || analysis === null
      ? 'missing (expected a table resource)'
      : `${quoted(analysis)} (expected a table resource)`
    throw new Error(`Invalid SanPy Zarr recording resource "analysis_results" in ${path}: ${problem}`)
  }
  if (!object(analysis.representations)) {
    throw new Error(`Invalid SanPy Zarr table resource "representations" in ${path}: missing (expected an object)`)
  }
  for (const [key, value] of Object.entries(analysis.representations)) {
    if (value === undefined) continue
    const problem = relativePathProblem(value)
    if (problem) throw new Error(`Invalid SanPy Zarr table resource ${quoted(key)} in ${path}: ${problem}`)
  }
  return recording as unknown as SanPyRecording
}

export async function loadSanPyMetadata(
  source: LoadedSanPyCollection,
  recordingPath: string,
  path: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const recordingUrl = new URL(recordingPath, source.root)
  const metadata = await loadJson<unknown>(new URL(path, recordingUrl), source.fetch, signal)
  if (!object(metadata)) throw new Error('Invalid SanPy metadata document')
  return metadata
}

export async function loadMetadataDefinitions(
  source: LoadedSanPyCollection,
  recordingPath: string,
  path: string,
  signal?: AbortSignal,
): Promise<MetadataDefinitions> {
  const recordingUrl = new URL(recordingPath, source.root)
  const definitions = await loadJson<unknown>(new URL(path, recordingUrl), source.fetch, signal)
  if (!object(definitions)) throw new Error('Invalid metadata-definitions document')
  for (const [key, definition] of Object.entries(definitions)) {
    if (!object(definition) || typeof definition.display_name !== 'string' || !definition.display_name) {
      throw new Error(`Invalid metadata definition ${JSON.stringify(key)}`)
    }
    if (definition.choices !== undefined
      && (!Array.isArray(definition.choices) || definition.choices.some((choice) => typeof choice !== 'string'))) {
      throw new Error(`Invalid metadata definition ${JSON.stringify(key)}`)
    }
  }
  return definitions as MetadataDefinitions
}

export async function loadDetectionParameters(
  source: LoadedSanPyCollection,
  recordingPath: string,
  path: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const recordingUrl = new URL(recordingPath, source.root)
  const parameters = await loadJson<unknown>(new URL(path, recordingUrl), source.fetch, signal)
  if (!object(parameters)) throw new Error('Invalid SanPy detection-parameters document')
  return parameters
}

export async function loadDetectionParameterDefinitions(
  source: LoadedSanPyCollection,
  recordingPath: string,
  path: string,
  signal?: AbortSignal,
): Promise<MetadataDefinitions> {
  const recordingUrl = new URL(recordingPath, source.root)
  const definitions = await loadJson<unknown>(new URL(path, recordingUrl), source.fetch, signal)
  if (!object(definitions)) throw new Error('Invalid detection-parameter definitions document')
  return Object.fromEntries(Object.entries(definitions).map(([key, definition]) => {
    if (!object(definition) || typeof definition.humanName !== 'string' || !definition.humanName) {
      throw new Error(`Invalid detection-parameter definition ${JSON.stringify(key)}`)
    }
    return [key, { display_name: definition.humanName }]
  }))
}

export async function loadAnalysisResultDefinitions(
  source: LoadedSanPyCollection,
  recordingPath: string,
  path: string,
  signal?: AbortSignal,
): Promise<AnalysisResultDefinitions> {
  const recordingUrl = new URL(recordingPath, source.root)
  const definitions = await loadJson<unknown>(new URL(path, recordingUrl), source.fetch, signal)
  if (!object(definitions)) throw new Error('Invalid SanPy analysis-result definitions document')
  for (const [name, value] of Object.entries(definitions)) {
    if (!object(value)
      || typeof value.axis_label !== 'string'
      || !value.axis_label
      || typeof value.category !== 'string'
      || typeof value.is_categorical !== 'boolean'
      || typeof value.show_in_plot_menu !== 'boolean') {
      throw new Error(`Invalid SanPy analysis-result definition ${JSON.stringify(name)}`)
    }
  }
  return definitions as AnalysisResultDefinitions
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
