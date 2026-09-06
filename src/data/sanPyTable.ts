import { parquetReadObjects } from 'hyparquet'
import Papa from 'papaparse'
import type { NicePoolRow } from '@mapmanager/nicepool'
import type { LoadedSanPyCollection, SanPyTableResource } from '../models/traceCollection'
import { relativePath } from './sanPyZarrLoader'

export type AnalysisRow = Record<string, unknown>

export async function loadSanPyTable(
  source: LoadedSanPyCollection,
  recordingPath: string,
  resource: SanPyTableResource,
  signal?: AbortSignal,
): Promise<AnalysisRow[]> {
  const tablesUrl = new URL('tables/', new URL(recordingPath, source.root))
  const parquet = resource.representations.parquet
  if (parquet && !relativePath(parquet)) throw new Error('Invalid Parquet table path')
  if (parquet) return verifyRows(await loadParquet(new URL(parquet, tablesUrl), source, signal), resource.rows)
  const csv = resource.representations.csv
  if (csv && !relativePath(csv)) throw new Error('Invalid CSV table path')
  if (csv) return verifyRows(await loadCsv(new URL(csv, tablesUrl), source, signal), resource.rows)
  throw new Error('SanPy analysis-results table has no supported representation')
}

function verifyRows(rows: AnalysisRow[], expected: number): AnalysisRow[] {
  if (rows.length !== expected) throw new Error(`Analysis-results row count mismatch: expected ${expected}, received ${rows.length}`)
  return rows
}

async function loadParquet(
  url: URL,
  source: LoadedSanPyCollection,
  signal?: AbortSignal,
): Promise<AnalysisRow[]> {
  const response = await source.fetch(url, signal ? { signal } : undefined)
  if (!response.ok) throw new Error(`Could not load ${url.href}: HTTP ${response.status}`)
  return await parquetReadObjects({ file: await response.arrayBuffer() }) as AnalysisRow[]
}

async function loadCsv(
  url: URL,
  source: LoadedSanPyCollection,
  signal?: AbortSignal,
): Promise<AnalysisRow[]> {
  const response = await source.fetch(url, signal ? { signal } : undefined)
  if (!response.ok) throw new Error(`Could not load ${url.href}: HTTP ${response.status}`)
  const parsed = Papa.parse<AnalysisRow>(await response.text(), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  })
  if (parsed.errors.length) throw new Error(`Could not parse ${url.href}: ${parsed.errors[0]!.message}`)
  return parsed.data
}

function scalar(value: unknown): string | number | boolean | null {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'bigint') return value.toString()
  return JSON.stringify(value, (_key, nested) => typeof nested === 'bigint' ? nested.toString() : nested)
}

export function nicePoolRows(rows: AnalysisRow[]): NicePoolRow[] {
  const columns = [...new Set(rows.flatMap(Object.keys))]
  return rows.map((row) => Object.fromEntries(columns.map((column) => [column, scalar(row[column])])))
}
