<script setup lang="ts">
import { NicePoolElement, createNicePoolState, registerNicePoolElement, type DatasetInput, type NicePoolPreset, type NicePoolRow } from '@mapmanager/nicepool'
import { nextTick, ref, watch } from 'vue'
import type { AnalysisResultDefinitions } from '../models/traceCollection'
registerNicePoolElement()
const props = defineProps<{ rows: NicePoolRow[]; definitions: AnalysisResultDefinitions; selectedPeakId: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()
const element = ref<NicePoolElement | null>(null)
const warning = ref('')
const presetSpecifications = [
  { name: 'Waveform overview', plots: [['thresholdSec', 'peakVal'], ['thresholdSec', 'thresholdVal']] },
  { name: 'Timing overview', plots: [['thresholdSec', 'isi_ms'], ['thresholdSec', 'spikeFreq_hz']] },
] as const

function buildPresets(dataset: DatasetInput): NicePoolPreset[] {
  const columns = new Set(dataset.rows.flatMap((row) => Object.keys(row)))
  const definedColumns = new Set(Object.keys(props.definitions))
  const missingMessages: string[] = []
  const presets = presetSpecifications.flatMap((specification) => {
    const required = [...new Set(specification.plots.flat())]
    const missing = required.filter((column) => !columns.has(column) || !definedColumns.has(column))
    if (missing.length) {
      missingMessages.push(`${specification.name}: missing ${missing.join(', ')}`)
      return []
    }
    return [{
      schemaVersion: 1 as const,
      name: specification.name,
      state: createNicePoolState(dataset, {
        layout: '2x1',
        plots: specification.plots.map(([xColumn, yColumn]) => ({ plotType: 'scatter', xColumn, yColumn })),
      }),
    }]
  })
  warning.value = missingMessages.length ? `Some plotting presets are unavailable — ${missingMessages.join('; ')}.` : ''
  return presets
}

watch(() => [props.rows, props.definitions] as const, async ([rows]) => {
  await nextTick()
  if (!rows.length || !element.value) return
  const dataset = { rows, rowIdColumn: 'spikeNumber' }
  element.value.setShowPresetEditing(false)
  element.value.setData(dataset)
  const presets = buildPresets(dataset)
  element.value.setNicePoolPresets(presets)
  if (presets[0]) element.value.applyNicePoolPreset(presets[0].name)
}, { immediate: true })
watch(() => props.selectedPeakId, (id) => element.value?.setPrimarySelection(id))
function selection(event: Event): void { const id = (event as CustomEvent<{ primaryRowId: string | null }>).detail.primaryRowId; if (id) emit('select', id) }
</script>
<template><section class="results"><header><h2>Analysis results</h2><span>{{ rows.length }} peaks</span></header><p v-if="warning" class="error" role="alert">{{ warning }}</p><p v-if="!rows.length" class="empty">No detected peaks for this recording.</p><nice-pool v-else ref="element" @nicepool-selection-change="selection" /></section></template>
