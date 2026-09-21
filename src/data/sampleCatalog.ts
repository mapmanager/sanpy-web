export const SANPY_SAMPLE_CATALOG_URL = 'https://data.mapmanager.net/sanpy-web/samples.json'

/** One publicly hosted SanPy Zarr sample advertised to the viewer. */
export interface SanPySample {
  name: string
  description: string
  url: string
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Load and validate the ordered SanPy Web sample catalog. */
export async function loadSampleCatalog(
  catalogUrl: string | URL = SANPY_SAMPLE_CATALOG_URL,
  resourceFetch: typeof fetch = globalThis.fetch,
): Promise<SanPySample[]> {
  const resolvedCatalogUrl = new URL(catalogUrl, globalThis.location?.href ?? 'http://localhost/')
  const response = await resourceFetch(resolvedCatalogUrl)
  if (!response.ok) throw new Error(`Could not load ${resolvedCatalogUrl.href}: HTTP ${response.status}`)
  const document: unknown = await response.json()
  if (!Array.isArray(document)) throw new Error('Invalid SanPy sample catalog: expected an array')
  const samples = document.map((entry, index) => {
    if (!object(entry)
      || typeof entry.name !== 'string' || !entry.name.trim()
      || typeof entry.description !== 'string' || !entry.description.trim()
      || typeof entry.url !== 'string' || !entry.url.trim()) {
      throw new Error(`Invalid SanPy sample catalog entry ${index}`)
    }
    return {
      name: entry.name.trim(),
      description: entry.description.trim(),
      url: new URL(entry.url, resolvedCatalogUrl).href,
    }
  })
  if (new Set(samples.map(({ url }) => url)).size !== samples.length) {
    throw new Error('Invalid SanPy sample catalog: duplicate URLs')
  }
  return samples
}
