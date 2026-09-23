<script setup lang="ts">
import { BookOpen, Moon, Sun } from '@lucide/vue'
import { computed, nextTick, ref, watch } from 'vue'
import { SignalViewerWidget, type SignalOverlays, type SignalSource, type SignalSourceInstallOptions, type SignalViewport } from '@mapmanager/signal-viewer'
import type { NicePoolRow } from '@mapmanager/nicepool'
import CollectionTable from './components/CollectionTable.vue'
import AppToolbar from './components/AppToolbar.vue'
import AppInformationPanel from './components/AppInformationPanel.vue'
import JsonValuesPanel from './components/JsonValuesPanel.vue'
import ResizableSection from './components/ResizableSection.vue'
import ResultsPanel from './components/ResultsPanel.vue'
import { SanPyDerivativeSignalSource, SanPyZarrSignalSource, type RightAxisSignal } from './data/sanPyZarrSignalSource'
import { loadSanPyTable, nicePoolRows, type AnalysisRow } from './data/sanPyTable'
import { createDirectoryFetch, directoryPickerSupported, pickTraceCollection } from './data/resourceFetch'
import { loadSampleCatalog, type SanPySample } from './data/sampleCatalog'
import { loadAnalysisResultDefinitions, loadDetectionParameters, loadSanPyCollection, loadSanPyMetadata, loadSanPyRecording, loadTraceOverlays } from './data/sanPyZarrLoader'
import { overlaySeries, resultIdFromOverlay } from './data/traceOverlays'
import type { AnalysisResultDefinitions, LoadedSanPyCollection, SanPyRecording, TraceOverlayDefinition } from './models/traceCollection'

interface ViewerApi {
  setSource(source: SignalSource, options?: SignalSourceInstallOptions): Promise<void>
  setOverlays(value: SignalOverlays): void
  setTheme(theme: 'dark' | 'light'): void
  setLegendVisible(visible: boolean): void
  setAxisRange(axis: 'right', range: 'auto'): void
  setViewport(viewport: SignalViewport): Promise<void>
  getViewport(): SignalViewport | null
}
const url = ref(new URLSearchParams(location.search).get('collection') ?? '')
const samples = ref<SanPySample[]>([])
const catalogError = ref<string | null>(null)
const source = ref<LoadedSanPyCollection | null>(null); const recording = ref<SanPyRecording | null>(null)
const selectedId = ref<string | null>(null); const sweep = ref(0); const channel = ref(0)
const recordingPath = ref<string | null>(null)
const peaks = ref<AnalysisRow[]>([]); const overlayDefinitions = ref<TraceOverlayDefinition[]>([]); const selectedPeakId = ref<string | null>(null)
const loading = ref(false); const error = ref<string | null>(null); const darkTheme = ref(true)
const theme = computed<'dark' | 'light'>(() => darkTheme.value ? 'dark' : 'light')
const viewer = ref<ViewerApi | null>(null)
const derivativeViewer = ref<ViewerApi | null>(null)
const nicePoolOpen = ref(false)
const NICEPOOL_MIN_WIDTH = 0
const NICEPOOL_MAX_WIDTH = 1200
const NICEPOOL_DEFAULT_WIDTH = 720
const NICEPOOL_CLOSE_WIDTH = 8
const nicePoolWidth = ref(NICEPOOL_DEFAULT_WIDTH)
const nicePoolResizing = ref(false)
let nicePoolDrag: { pointerId: number; startX: number; startWidth: number } | null = null
const appInformationOpen = ref(false)
const metadataOpen = ref(false)
const metadata = ref<Record<string, unknown>>({})
const detectionParametersOpen = ref(false)
const detectionParameters = ref<Record<string, unknown>>({})
const analysisResultDefinitions = ref<AnalysisResultDefinitions>({})
const rightAxisSignal = ref<RightAxisSignal>('command')
let synchronizingViewport = false
let recordingLoadController: AbortController | null = null
let performGeneration = 0
const niceRows = computed<NicePoolRow[]>(() => nicePoolRows(peaks.value))
const rightAxisChoices = computed(() => {
  const choices: Array<{ value: RightAxisSignal; label: string }> = []
  if (recording.value?.command_channels[channel.value]) choices.push({ value: 'command', label: recording.value.command_channels[channel.value]!.name })
  if (channel.value === recording.value?.analysis_channel) choices.push({ value: 'derivative', label: 'Derivative' })
  if (!choices.length) choices.push({ value: 'none', label: 'None' })
  return choices
})
const sweepNumber = computed({
  get: () => sweep.value + 1,
  set: (value: number) => {
    const maximum = recording.value?.dimensions.sweeps ?? 1
    sweep.value = Math.min(maximum, Math.max(1, Math.trunc(value))) - 1
  },
})

async function openCollection(next: LoadedSanPyCollection): Promise<void> {
  source.value = next; selectedId.value = null; recording.value = null; recordingPath.value = null; peaks.value = []; overlayDefinitions.value = []; metadata.value = {}; detectionParameters.value = {}; analysisResultDefinitions.value = {}
  const first = next.collection.members[0]; if (first) await selectRecording(first.id)
}
async function openUrl(): Promise<void> {
  if (!url.value.trim()) return; await perform(async () => { const next = await loadSanPyCollection(url.value); await openCollection(next); history.replaceState(null, '', `?collection=${encodeURIComponent(next.root.href)}`) })
}
async function openSample(event: Event): Promise<void> {
  url.value = (event.target as HTMLSelectElement).value
  await openUrl()
}
async function openFolder(): Promise<void> {
  await perform(async () => { const handle = await pickTraceCollection(); const root = new URL(`https://local.sanpy/${encodeURIComponent(handle.name)}/`); await openCollection(await loadSanPyCollection(root, createDirectoryFetch(handle, root))); history.replaceState(null, '', location.pathname) })
}
async function selectRecording(id: string): Promise<void> {
  const collection = source.value; if (!collection) return
  recordingLoadController?.abort()
  const controller = new AbortController()
  recordingLoadController = controller
  await perform(async () => {
    const member = collection.collection.members.find((item) => item.id === id); if (!member) throw new Error(`Unknown recording ${id}`)
    const nextRecording = await loadSanPyRecording(collection, member.recording, controller.signal)
    const [nextPeaks, nextMetadata, nextDetectionParameters, nextDefinitions, nextOverlays] = await Promise.all([
      loadSanPyTable(collection, member.recording, nextRecording.resources.analysis_results, controller.signal),
      loadSanPyMetadata(collection, member.recording, nextRecording.resources.sanpy_metadata, controller.signal),
      loadDetectionParameters(collection, member.recording, nextRecording.resources.detection_parameters, controller.signal),
      loadAnalysisResultDefinitions(collection, member.recording, nextRecording.resources.analysis_result_definitions, controller.signal),
      loadTraceOverlays(collection, member.recording, nextRecording.resources.trace_overlays, controller.signal),
    ])
    if (controller.signal.aborted) return
    recording.value = nextRecording; recordingPath.value = member.recording; selectedId.value = id; sweep.value = 0; channel.value = 0; selectedPeakId.value = null
    peaks.value = nextPeaks; metadata.value = nextMetadata; detectionParameters.value = nextDetectionParameters
    analysisResultDefinitions.value = nextDefinitions; overlayDefinitions.value = nextOverlays.overlays
    await updateViewer()
  })
  if (recordingLoadController === controller) recordingLoadController = null
}
async function setPrimaryViewerSource(widget: ViewerApi, preserveViewport: boolean): Promise<void> {
  if (!source.value || !recording.value || !recordingPath.value) return
  const selection = { sweep: sweep.value, channel: channel.value }
  const previousViewport = preserveViewport ? widget.getViewport() : null
  const traceSource = new SanPyZarrSignalSource(source.value, recordingPath.value, recording.value, selection, rightAxisSignal.value)
  await widget.setSource(traceSource, {
    overlays: { scatterSeries: scatterSeries(), selectedPointId: defaultOverlayPointId(selectedPeakId.value) },
    ...(previousViewport ? { initialViewport: previousViewport } : {}),
  })
}
async function updateViewer(): Promise<void> {
  if (!source.value || !recording.value || !recordingPath.value) return
  await nextTick(); const widget = viewer.value; if (!widget) return
  const selection = { sweep: sweep.value, channel: channel.value }
  if (!rightAxisChoices.value.some(({ value }) => value === rightAxisSignal.value)) rightAxisSignal.value = rightAxisChoices.value[0]!.value
  const derivative = channel.value === recording.value.analysis_channel ? new SanPyDerivativeSignalSource(source.value, recordingPath.value, recording.value, selection) : null
  await Promise.all([
    setPrimaryViewerSource(widget, false),
    derivative ? derivativeViewer.value?.setSource(derivative) : undefined,
  ])
}
function scatterSeries() { return channel.value === recording.value?.analysis_channel ? overlaySeries(peaks.value, overlayDefinitions.value, sweep.value, ['#00e5ff', '#f472b6', '#fbbf24', '#34d399']) : [] }
function defaultOverlayPointId(resultId: string | null): string | null { const overlay = overlayDefinitions.value[0]; return resultId && overlay ? `${resultId}:${overlay.id}` : null }
function selectPeak(id: string | null): void { selectedPeakId.value = resultIdFromOverlay(id); const pointId = id?.includes(':') ? id : defaultOverlayPointId(id); if (viewer.value) viewer.value.setOverlays({ scatterSeries: scatterSeries(), selectedPointId: pointId }) }
function configureViewer(widget: ViewerApi | null): void { if (widget) { widget.setTheme(theme.value); widget.setLegendVisible(false) } }
watch(viewer, configureViewer)
watch(derivativeViewer, configureViewer)
watch(theme, async (value) => { await nextTick(); viewer.value?.setTheme(value); derivativeViewer.value?.setTheme(value) })
async function mirrorViewport(target: ViewerApi | null, viewport: SignalViewport): Promise<void> {
  if (!target || synchronizingViewport) return
  synchronizingViewport = true
  try { await target.setViewport(viewport) } finally { synchronizingViewport = false }
}
function toggleMetadata(): void { metadataOpen.value = !metadataOpen.value; if (metadataOpen.value) { detectionParametersOpen.value = false; appInformationOpen.value = false } }
function toggleDetectionParameters(): void { detectionParametersOpen.value = !detectionParametersOpen.value; if (detectionParametersOpen.value) { metadataOpen.value = false; appInformationOpen.value = false } }
function toggleAppInformation(): void { appInformationOpen.value = !appInformationOpen.value; if (appInformationOpen.value) { metadataOpen.value = false; detectionParametersOpen.value = false } }
function resizeNicePool(requested: number): void { nicePoolWidth.value = Math.min(NICEPOOL_MAX_WIDTH, Math.max(NICEPOOL_MIN_WIDTH, requested)) }
function toggleNicePool(): void {
  nicePoolOpen.value = !nicePoolOpen.value
  if (nicePoolOpen.value && nicePoolWidth.value < NICEPOOL_CLOSE_WIDTH) nicePoolWidth.value = NICEPOOL_DEFAULT_WIDTH
}
function finishNicePoolResize(): void {
  nicePoolDrag = null
  nicePoolResizing.value = false
  if (nicePoolWidth.value < NICEPOOL_CLOSE_WIDTH) {
    nicePoolOpen.value = false
    nicePoolWidth.value = NICEPOOL_DEFAULT_WIDTH
  }
}
function nicePoolPointerDown(event: PointerEvent): void {
  nicePoolDrag = { pointerId: event.pointerId, startX: event.clientX, startWidth: nicePoolWidth.value }
  nicePoolResizing.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function nicePoolPointerMove(event: PointerEvent): void {
  if (nicePoolDrag?.pointerId === event.pointerId) resizeNicePool(nicePoolDrag.startWidth - (event.clientX - nicePoolDrag.startX))
}
function nicePoolPointerUp(event: PointerEvent): void { if (nicePoolDrag?.pointerId === event.pointerId) finishNicePoolResize() }
function nicePoolKeyDown(event: KeyboardEvent): void {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const step = event.shiftKey ? 40 : 10
  if (event.key === 'ArrowLeft') resizeNicePool(nicePoolWidth.value + step)
  else if (event.key === 'ArrowRight') resizeNicePool(nicePoolWidth.value - step)
  else if (event.key === 'Home') resizeNicePool(NICEPOOL_MIN_WIDTH)
  else resizeNicePool(NICEPOOL_MAX_WIDTH)
  if (nicePoolWidth.value < NICEPOOL_CLOSE_WIDTH) finishNicePoolResize()
}
async function changeRightAxis(event: Event): Promise<void> {
  rightAxisSignal.value = (event.target as HTMLSelectElement).value as RightAxisSignal
  const widget = viewer.value
  if (!widget) return
  await setPrimaryViewerSource(widget, true)
  if (rightAxisSignal.value !== 'none') widget.setAxisRange('right', 'auto')
}
async function perform(action: () => Promise<void>): Promise<void> {
  const generation = ++performGeneration
  loading.value = true; error.value = null
  try {
    await action()
  } catch (reason) {
    if (generation === performGeneration && !(reason instanceof DOMException && reason.name === 'AbortError')) {
      error.value = reason instanceof Error ? reason.message : String(reason)
    }
  } finally {
    if (generation === performGeneration) loading.value = false
  }
}
const footerStatus = computed(() => error.value ? `Error: ${error.value}` : loading.value ? 'Loading…' : source.value ? 'Ready' : 'No collection open')
async function initialize(): Promise<void> {
  const explicitCollection = Boolean(url.value)
  if (explicitCollection) void openUrl()
  try {
    samples.value = await loadSampleCatalog()
  } catch (reason) {
    catalogError.value = reason instanceof Error ? reason.message : String(reason)
  }
  if (!explicitCollection && samples.value[0]) {
    url.value = samples.value[0].url
    await openUrl()
  }
}
void initialize()
</script>

<template>
  <div :class="['app-shell', `app--${theme}`, { 'nicepool-open': nicePoolOpen, 'nicepool-resizing': nicePoolResizing, 'left-panel-open': appInformationOpen || metadataOpen || detectionParametersOpen }]" :style="{ '--nicepool-open-width': `${nicePoolWidth}px` }">
    <header class="toolbar"><h1>SanPy Web</h1><label v-if="samples.length" class="sample-picker">Sample<select :value="samples.some((sample) => sample.url === url) ? url : ''" :disabled="loading" @change="openSample"><option value="" disabled>Choose a sample…</option><option v-for="sample in samples" :key="sample.url" :value="sample.url">{{ sample.name }}</option></select></label><form @submit.prevent="openUrl"><input v-model="url" type="url" placeholder="https://…/sample.sanpy/" aria-label="Trace collection URL"><button :disabled="loading || !url">Open URL</button></form><button :disabled="loading || !directoryPickerSupported()" @click="openFolder">Open local folder</button><label class="theme-switch"><Sun class="theme-switch__icon" :class="{ active: !darkTheme }" :size="16" aria-hidden="true" /><input v-model="darkTheme" type="checkbox" role="switch" aria-label="Use dark theme"><span class="theme-switch__track" aria-hidden="true"><span /></span><Moon class="theme-switch__icon" :class="{ active: darkTheme }" :size="16" aria-hidden="true" /></label><a class="icon-button" href="https://mapmanager.github.io/sanpy-web/docs/" target="_blank" rel="noreferrer" aria-label="Open the SanPy Web documentation" title="Documentation"><BookOpen :size="19" aria-hidden="true" /></a></header>
    <AppToolbar :nice-pool-open="nicePoolOpen" :metadata-open="metadataOpen" :detection-parameters-open="detectionParametersOpen" :app-information-open="appInformationOpen" :disabled="!source" @toggle-nice-pool="toggleNicePool" @toggle-metadata="toggleMetadata" @toggle-detection-parameters="toggleDetectionParameters" @toggle-app-information="toggleAppInformation" />
    <AppInformationPanel v-if="appInformationOpen" @close="appInformationOpen = false" />
    <JsonValuesPanel v-if="metadataOpen && recording" title="File metadata" :values="metadata" :recording-name="recording.name" @close="metadataOpen = false" />
    <JsonValuesPanel v-if="detectionParametersOpen && recording" title="Detection parameters" :values="detectionParameters" :recording-name="recording.name" @close="detectionParametersOpen = false" />
    <main class="app-main">
      <p v-if="error" class="error" role="alert">{{ error }}</p><p v-else-if="catalogError && !source" class="catalog-warning" role="status">Sample catalog unavailable. You can still open a URL or local folder.</p>
      <template v-if="source">
        <ResizableSection label="Resize collection table" :initial-height="200" :maximum-height="600"><section class="collection"><CollectionTable :members="source.collection.members" :selected-id="selectedId" @select="selectRecording" /></section></ResizableSection>
        <section v-if="recording" class="recording">
          <header class="recording-header"><div><h2>{{ recording.name }}</h2></div><label>Sweep <input v-model.number="sweepNumber" type="number" min="1" :max="recording.dimensions.sweeps" step="1" @change="updateViewer()"></label><label>Channel <select v-model.number="channel" @change="updateViewer()"><option v-for="item in recording.channels" :key="item.index" :value="item.index">{{ item.index + 1 }} — {{ item.name }}</option></select></label></header>
          <div class="plot-title">Recorded signal and command</div>
          <ResizableSection label="Resize recorded signal" :initial-height="150" :maximum-height="900">
            <SignalViewerWidget ref="viewer" class="signal-viewer" @overlay-select="selectPeak" @view-change="mirrorViewport(derivativeViewer, $event)">
              <template #options><fieldset><legend>Right axis</legend><label><span class="option-label">Signal</span><select :value="rightAxisSignal" @change="changeRightAxis"><option v-for="choice in rightAxisChoices" :key="choice.value" :value="choice.value">{{ choice.label }}</option></select></label></fieldset></template>
            </SignalViewerWidget>
          </ResizableSection>
          <template v-if="channel === recording.analysis_channel"><div class="plot-title">Signal derivative</div><SignalViewerWidget ref="derivativeViewer" class="derivative-viewer" @view-change="mirrorViewport(viewer, $event)" /></template>
        </section>
      </template>
      <section v-else class="welcome"><h2>Open a SanPy Zarr collection</h2><p>Load a hosted <code>.sanpy.zarr</code> collection URL or choose a local collection folder.</p></section>
    </main>
    <div v-if="nicePoolOpen" class="resize-handle resize-handle--vertical resize-handle--nicepool" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Resize NicePool" :aria-valuemin="NICEPOOL_MIN_WIDTH" :aria-valuemax="NICEPOOL_MAX_WIDTH" :aria-valuenow="Math.round(nicePoolWidth)" @pointerdown="nicePoolPointerDown" @pointermove="nicePoolPointerMove" @pointerup="nicePoolPointerUp" @pointercancel="nicePoolPointerUp" @keydown="nicePoolKeyDown"><span aria-hidden="true" /></div>
    <ResultsPanel v-if="nicePoolOpen && source" :rows="niceRows" :definitions="analysisResultDefinitions" :selected-peak-id="selectedPeakId" :theme="theme" @select="selectPeak" />
    <footer class="app-footer"><span>{{ recording?.name ?? 'No recording' }}</span><span>Sweep {{ recording ? sweepNumber : '—' }}</span><span>Channel {{ recording ? channel + 1 : '—' }}</span><span>Peaks {{ peaks.length }}</span><span class="app-footer__status" :class="{ error: error }">{{ footerStatus }}</span></footer>
  </div>
</template>
