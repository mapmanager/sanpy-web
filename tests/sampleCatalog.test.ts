import { describe, expect, it } from 'vitest'

import { loadSampleCatalog } from '../src/data/sampleCatalog'

const fetchJson = (value: unknown, status = 200) => async () => new Response(JSON.stringify(value), { status })

describe('SanPy sample catalog', () => {
  it('resolves ordered relative sample URLs against the catalog', async () => {
    const samples = await loadSampleCatalog(
      'https://data.mapmanager.net/sanpy-web/samples.json',
      fetchJson([
        { name: 'First', description: 'First sample', url: './samples/first.sanpy.zarr/' },
        { name: 'Second', description: 'Second sample', url: './samples/second.sanpy.zarr/' },
      ]),
    )
    expect(samples.map(({ name }) => name)).toEqual(['First', 'Second'])
    expect(samples[0]?.url).toBe('https://data.mapmanager.net/sanpy-web/samples/first.sanpy.zarr/')
  })

  it('rejects malformed entries and duplicate resolved URLs', async () => {
    await expect(loadSampleCatalog('https://example.test/samples.json', fetchJson([
      { name: '', description: 'Missing name', url: './one/' },
    ]))).rejects.toThrow('entry 0')
    await expect(loadSampleCatalog('https://example.test/samples.json', fetchJson([
      { name: 'One', description: 'One', url: './one/' },
      { name: 'Again', description: 'Again', url: './one/' },
    ]))).rejects.toThrow('duplicate URLs')
  })

  it('reports HTTP failures without inventing catalog entries', async () => {
    await expect(loadSampleCatalog(
      'https://example.test/samples.json',
      fetchJson({}, 404),
    )).rejects.toThrow('HTTP 404')
  })
})
