<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { SignalViewerWidget, type SignalOverlays, type SignalSource } from '@mapmanager/signal-viewer'
import type { NicePoolRow } from '@mapmanager/nicepool'
import CollectionTable from './components/CollectionTable.vue'
import AppToolbar from './components/AppToolbar.vue'
import AppInformationPanel from './components/AppInformationPanel.vue'
import ResultsPanel from './components/ResultsPanel.vue'
import { SanPyDerivativeSignalSource, SanPyZarrSignalSource } from './data/sanPyZarrSignalSource'
import { loadSanPyTable, nicePoolRows, type AnalysisRow } from './data/sanPyTable'
import { createDirectoryFetch, directoryPickerSupported, pickTraceCollection } from './data/resourceFetch'
import { loadSanPyCollection, loadSanPyRecording, loadTraceOverlays } from './data/sanPyZarrLoader'
import { overlaySeries, resultIdFromOverlay } from './data/traceOverlays'
import type { LoadedSanPyCollection, SanPyRecording, TraceOverlayDefinition } from './models/traceCollection'

interface ViewerApi {
  setSource(source: SignalSource): Promise<void>
  setOverlays(value: SignalOverlays): void
  setTheme(theme: 'dark' | 'light'): void
  setLegendVisible(visible: boolean): void
}
const url = ref(new URLSearchParams(location.search).get('collection') ?? '')
const source = ref<LoadedSanPyCollection | null>(null); const recording = ref<SanPyRecording | null>(null)
const selectedId = ref<string | null>(null); const sweep = ref(0); const channel = ref(0)
const recordingPath = ref<string | null>(null)
const peaks = ref<AnalysisRow[]>([]); const overlayDefinitions = ref<TraceOverlayDefinition[]>([]); const selectedPeakId = ref<string | null>(null)
const loading = ref(false); const error = ref<string | null>(null); const theme = ref<'dark' | 'light'>('dark')
const viewer = ref<ViewerApi | null>(null)
const derivativeViewer = ref<ViewerApi | null>(null)
const nicePoolOpen = ref(false)
const appInformationOpen = ref(false)
const niceRows = computed<NicePoolRow[]>(() => nicePoolRows(peaks.value))
const sweepNumber = computed({
  get: () => sweep.value + 1,
  set: (value: number) => {
    const maximum = recording.value?.dimensions.sweeps ?? 1
    sweep.value = Math.min(maximum, Math.max(1, Math.trunc(value))) - 1
  },
})

async function openCollection(next: LoadedSanPyCollection): Promise<void> {
  source.value = next; selectedId.value = null; recording.value = null; recordingPath.value = null; peaks.value = []; overlayDefinitions.value = []
  const first = next.collection.members[0]; if (first) await selectRecording(first.id)
}
async function openUrl(): Promise<void> {
  if (!url.value.trim()) return; await perform(async () => { const next = await loadSanPyCollection(url.value); await openCollection(next); history.replaceState(null, '', `?collection=${encodeURIComponent(next.root.href)}`) })
}
async function openFolder(): Promise<void> {
  await perform(async () => { const handle = await pickTraceCollection(); const root = new URL(`https://local.sanpy/${encodeURIComponent(handle.name)}/`); await openCollection(await loadSanPyCollection(root, createDirectoryFetch(handle, root))); history.replaceState(null, '', location.pathname) })
}
async function selectRecording(id: string): Promise<void> {
  const collection = source.value; if (!collection) return
  await perform(async () => {
    const member = collection.collection.members.find((item) => item.id === id); if (!member) throw new Error(`Unknown recording ${id}`)
    recording.value = await loadSanPyRecording(collection, member.recording); recordingPath.value = member.recording; selectedId.value = id; sweep.value = 0; channel.value = 0; selectedPeakId.value = null
    peaks.value = await loadSanPyTable(collection, member.recording, recording.value.resources.analysis_results)
    overlayDefinitions.value = (await loadTraceOverlays(collection, member.recording, recording.value.resources.trace_overlays)).overlays
    await updateViewer()
  })
}
async function updateViewer(): Promise<void> {
  if (!source.value || !recording.value || !recordingPath.value) return
  await nextTick(); const widget = viewer.value; if (!widget) return
  const selection = { sweep: sweep.value, channel: channel.value }
  const traceSource = new SanPyZarrSignalSource(source.value, recordingPath.value, recording.value, selection)
  const derivative = channel.value === recording.value.analysis_channel ? new SanPyDerivativeSignalSource(source.value, recordingPath.value, recording.value, selection) : null
  await Promise.all([widget.setSource(traceSource), derivative ? derivativeViewer.value?.setSource(derivative) : undefined])
  widget.setLegendVisible(false)
  derivativeViewer.value?.setLegendVisible(false)
  widget.setOverlays({ scatterSeries: scatterSeries(), selectedPointId: defaultOverlayPointId(selectedPeakId.value) })
}
function scatterSeries() { return channel.value === recording.value?.analysis_channel ? overlaySeries(peaks.value, overlayDefinitions.value, sweep.value, ['#00e5ff', '#f472b6', '#fbbf24', '#34d399']) : [] }
function defaultOverlayPointId(resultId: string | null): string | null { const overlay = overlayDefinitions.value[0]; return resultId && overlay ? `${resultId}:${overlay.id}` : null }
function selectPeak(id: string | null): void { selectedPeakId.value = resultIdFromOverlay(id); const pointId = id?.includes(':') ? id : defaultOverlayPointId(id); if (viewer.value) viewer.value.setOverlays({ scatterSeries: scatterSeries(), selectedPointId: pointId }) }
function setTheme(): void { theme.value = theme.value === 'dark' ? 'light' : 'dark'; viewer.value?.setTheme(theme.value); derivativeViewer.value?.setTheme(theme.value) }
async function perform(action: () => Promise<void>): Promise<void> { loading.value = true; error.value = null; try { await action() } catch (reason) { if (!(reason instanceof DOMException && reason.name === 'AbortError')) error.value = reason instanceof Error ? reason.message : String(reason) } finally { loading.value = false } }
const footerStatus = computed(() => error.value ? `Error: ${error.value}` : loading.value ? 'Loading…' : source.value ? 'Ready' : 'No collection open')
if (url.value) void openUrl()
</script>

<template><div :class="['app-shell', `app--${theme}`, { 'nicepool-open': nicePoolOpen, 'app-information-open': appInformationOpen }]"><header class="toolbar"><h1>SanPy Web</h1><form @submit.prevent="openUrl"><input v-model="url" type="url" placeholder="https://…/sample.sanpy/" aria-label="Trace collection URL"><button :disabled="loading || !url">Open URL</button></form><button :disabled="loading || !directoryPickerSupported()" @click="openFolder">Open local folder</button><button @click="setTheme">{{ theme === 'dark' ? 'Light' : 'Dark' }} theme</button></header>
<AppToolbar :nice-pool-open="nicePoolOpen" :app-information-open="appInformationOpen" :disabled="!source" @toggle-nice-pool="nicePoolOpen = !nicePoolOpen" @toggle-app-information="appInformationOpen = !appInformationOpen" />
<AppInformationPanel v-if="appInformationOpen" @close="appInformationOpen = false" />
<main class="app-main"><p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="loading" class="status">Loading…</p>
<template v-if="source"><section class="collection"><CollectionTable :members="source.collection.members" :selected-id="selectedId" @select="selectRecording" /></section>
<section v-if="recording" class="recording"><header class="recording-header"><div><h2>{{ recording.name }}</h2><p>{{ recording.dimensions.points.toLocaleString() }} samples · {{ recording.sampling_rate_hz.toLocaleString() }} Hz</p></div><label>Sweep <input v-model.number="sweepNumber" type="number" min="1" :max="recording.dimensions.sweeps" step="1" @change="updateViewer"></label><label>Channel <select v-model.number="channel" @change="updateViewer"><option v-for="item in recording.channels" :key="item.index" :value="item.index">{{ item.index + 1 }} — {{ item.name }}</option></select></label></header><div class="plot-title">Recorded signal and command</div><SignalViewerWidget ref="viewer" class="signal-viewer" @overlay-select="selectPeak" /><template v-if="channel === recording.analysis_channel"><div class="plot-title">Signal derivative</div><SignalViewerWidget ref="derivativeViewer" class="derivative-viewer" /></template></section></template><section v-else class="welcome"><h2>Open a SanPy Zarr collection</h2><p>Load a hosted <code>.sanpy.zarr</code> collection URL or choose a local collection folder.</p></section></main>
<ResultsPanel v-if="nicePoolOpen && source" :rows="niceRows" :selected-peak-id="selectedPeakId" @select="selectPeak" />
<footer class="app-footer"><span>{{ recording?.name ?? 'No recording' }}</span><span>Sweep {{ recording ? sweepNumber : '—' }}</span><span>Channel {{ recording ? channel + 1 : '—' }}</span><span>Peaks {{ peaks.length }}</span><span class="app-footer__status" :class="{ error: error }">{{ footerStatus }}</span></footer></div></template>
