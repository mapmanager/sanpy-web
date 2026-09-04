<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { SignalViewerWidget, type SignalOverlays, type SignalSource } from '@mapmanager/signal-viewer'
import type { NicePoolRow } from '@mapmanager/nicepool'
import CollectionTable from './components/CollectionTable.vue'
import ResultsPanel from './components/ResultsPanel.vue'
import { AcqStoreTraceSignalSource, DerivedTraceSignalSource } from './data/acqStoreTraceSource'
import { loadParquet, nicePoolRows, type ParquetRow } from './data/parquet'
import { createDirectoryFetch, directoryPickerSupported, pickTraceCollection } from './data/resourceFetch'
import { loadLegacyAnalysis, loadTraceCollection, loadTraceRecording } from './data/traceCollectionLoader'
import type { LoadedTraceCollection, TraceRecording } from './models/traceCollection'

interface ViewerApi { setSource(source: SignalSource): Promise<void>; setOverlays(value: SignalOverlays): void; setTheme(theme: 'dark' | 'light'): void }
const url = ref(new URLSearchParams(location.search).get('collection') ?? '')
const source = ref<LoadedTraceCollection | null>(null); const recording = ref<TraceRecording | null>(null)
const selectedId = ref<string | null>(null); const sweep = ref(0); const channel = ref(0)
const peaks = ref<ParquetRow[]>([]); const selectedPeakId = ref<string | null>(null)
const loading = ref(false); const error = ref<string | null>(null); const theme = ref<'dark' | 'light'>('dark')
const viewer = ref<ViewerApi | null>(null)
const derivativeViewer = ref<ViewerApi | null>(null)
const niceRows = computed<NicePoolRow[]>(() => nicePoolRows(peaks.value))

async function openCollection(next: LoadedTraceCollection): Promise<void> {
  source.value = next; selectedId.value = null; recording.value = null; peaks.value = []
  const first = next.collection.members[0]; if (first) await selectRecording(first.id)
}
async function openUrl(): Promise<void> {
  if (!url.value.trim()) return; await perform(async () => { const next = await loadTraceCollection(url.value); await openCollection(next); history.replaceState(null, '', `?collection=${encodeURIComponent(next.root.href)}`) })
}
async function openFolder(): Promise<void> {
  await perform(async () => { const handle = await pickTraceCollection(); const root = new URL(`https://local.sanpy/${encodeURIComponent(handle.name)}/`); await openCollection(await loadTraceCollection(root, createDirectoryFetch(handle, root))); history.replaceState(null, '', location.pathname) })
}
async function selectRecording(id: string): Promise<void> {
  const collection = source.value; if (!collection) return
  await perform(async () => {
    const member = collection.collection.members.find((item) => item.id === id); if (!member) throw new Error(`Unknown recording ${id}`)
    recording.value = await loadTraceRecording(collection, member.recording); selectedId.value = id; sweep.value = 0; channel.value = 0; selectedPeakId.value = null
    const analysis = recording.value.resources.analysis ? await loadLegacyAnalysis(collection, recording.value.resources.analysis) : null
    const resource = analysis?.peaks
    peaks.value = resource ? await loadParquet(new URL(resource.path, collection.root), collection.fetch) : []
    await updateViewer()
  })
}
async function updateViewer(): Promise<void> {
  if (!source.value || !recording.value) return
  await nextTick(); const widget = viewer.value; if (!widget) return
  const traceSource = new AcqStoreTraceSignalSource(source.value, recording.value, { sweep: sweep.value, channel: channel.value })
  await Promise.all([widget.setSource(traceSource), derivativeViewer.value?.setSource(new DerivedTraceSignalSource(traceSource))])
  widget.setOverlays({ scatterSeries: scatterSeries(), selectedPointId: selectedPeakId.value })
}
function peakPoints() { return peaks.value.filter((row) => Number(row.acqstore_sweep_index) === sweep.value && Number(row.acqstore_channel_index) === channel.value).flatMap((row) => { const x = Number(row.peakSec); const y = Number(row.peakVal); const id = String(row.acqstore_peak_id ?? ''); return id && Number.isFinite(x) && Number.isFinite(y) ? [{ id, x, y, kind: 'peak', label: `Peak ${String(row.spikeNumber ?? '')}`, metadata: row }] : [] }) }
function thresholdPoints() { return peaks.value.filter((row) => Number(row.acqstore_sweep_index) === sweep.value && Number(row.acqstore_channel_index) === channel.value).flatMap((row) => { const x = Number(row.thresholdSec); const y = Number(row.thresholdVal); const peakId = String(row.acqstore_peak_id ?? ''); return peakId && Number.isFinite(x) && Number.isFinite(y) ? [{ id: `${peakId}:threshold`, x, y, kind: 'threshold', label: `Threshold ${String(row.spikeNumber ?? '')}`, metadata: { peakId, ...row } }] : [] }) }
function scatterSeries() { return [{ id: 'peaks', label: 'Peaks', color: '#00e5ff', points: peakPoints() }, { id: 'thresholds', label: 'Take-off potentials', color: '#f472b6', points: thresholdPoints() }] }
function selectPeak(id: string | null): void { const peakId = id?.endsWith(':threshold') ? id.slice(0, -10) : id; selectedPeakId.value = peakId; if (viewer.value) viewer.value.setOverlays({ scatterSeries: scatterSeries(), selectedPointId: id }) }
function setTheme(): void { theme.value = theme.value === 'dark' ? 'light' : 'dark'; viewer.value?.setTheme(theme.value); derivativeViewer.value?.setTheme(theme.value) }
async function perform(action: () => Promise<void>): Promise<void> { loading.value = true; error.value = null; try { await action() } catch (reason) { if (!(reason instanceof DOMException && reason.name === 'AbortError')) error.value = reason instanceof Error ? reason.message : String(reason) } finally { loading.value = false } }
if (url.value) void openUrl()
</script>

<template><main :class="['app', `app--${theme}`]"><header class="toolbar"><div><h1>SanPy Web</h1><p>Electrophysiology trace viewer</p></div><form @submit.prevent="openUrl"><input v-model="url" type="url" placeholder="https://…/sample.sanpy/" aria-label="Trace collection URL"><button :disabled="loading || !url">Open URL</button></form><button :disabled="loading || !directoryPickerSupported()" @click="openFolder">Open local folder</button><button @click="setTheme">{{ theme === 'dark' ? 'Light' : 'Dark' }} theme</button></header>
<p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="loading" class="status">Loading…</p>
<template v-if="source"><section class="collection"><header><h2>{{ source.collection.name }}</h2><span>{{ source.collection.members.length }} recordings</span></header><CollectionTable :members="source.collection.members" :selected-id="selectedId" @select="selectRecording" /></section>
<section v-if="recording" class="recording"><header class="recording-header"><div><h2>{{ recording.name }}</h2><p>{{ recording.dimensions.samples.toLocaleString() }} samples · {{ recording.sampling.rate_hz.toLocaleString() }} Hz</p></div><label>Sweep <select v-model.number="sweep" @change="updateViewer"><option v-for="index in recording.dimensions.sweeps" :key="index" :value="index - 1">{{ index }}</option></select></label><label>Channel <select v-model.number="channel" @change="updateViewer"><option v-for="item in recording.channels" :key="item.index" :value="item.index">{{ item.index + 1 }} — {{ item.name }}</option></select></label></header><div class="plot-title">Recorded signal and command</div><SignalViewerWidget ref="viewer" class="signal-viewer" @overlay-select="selectPeak" /><div class="plot-title">Signal derivative</div><SignalViewerWidget ref="derivativeViewer" class="derivative-viewer" /></section>
<ResultsPanel :rows="niceRows" :selected-peak-id="selectedPeakId" @select="selectPeak" /></template><section v-else class="welcome"><h2>Open a SanPy trace collection</h2><p>Load a hosted <code>.sanpy</code> package URL or choose a local package folder.</p></section></main></template>
