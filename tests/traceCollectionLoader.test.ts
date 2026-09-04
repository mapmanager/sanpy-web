import { describe, expect, it } from 'vitest'
import { loadTraceCollection } from '../src/data/traceCollectionLoader'

const valid = { format:'acqstore-trace-collection', version:'0.1', id:'collection', name:'Sample', members:[{ id:'r1', name:'one.abf', recording:'recordings/r1/recording.json', summary:{ num_sweeps:1,num_channels:1,samples_per_sweep:10,samples_per_second:10000,num_peaks:0,protocol:'',acquisition_datetime:'' } }] }
const fetchJson = (value: unknown) => async () => new Response(JSON.stringify(value), { status: 200 })
describe('loadTraceCollection', () => {
  it('accepts the 0.1 producer contract', async () => expect((await loadTraceCollection('https://example.test/sample.sanpy/', fetchJson(valid))).collection.name).toBe('Sample'))
  it('rejects traversal paths', async () => expect(loadTraceCollection('https://example.test/', fetchJson({ ...valid, members:[{ ...valid.members[0], recording:'../secret' }] }))).rejects.toThrow('Invalid'))
  it('rejects unsupported versions', async () => expect(loadTraceCollection('https://example.test/', fetchJson({ ...valid, version:'1.0' }))).rejects.toThrow('Unsupported'))
})

