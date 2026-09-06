<script setup lang="ts">
import { NicePoolElement, registerNicePoolElement, type NicePoolRow } from '@mapmanager/nicepool'
import { nextTick, ref, watch } from 'vue'
registerNicePoolElement()
const props = defineProps<{ rows: NicePoolRow[]; selectedPeakId: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()
const element = ref<NicePoolElement | null>(null)
watch(() => props.rows, async (rows) => { await nextTick(); if (rows.length) element.value?.setData({ rows, rowIdColumn: 'spikeNumber' }) }, { immediate: true })
watch(() => props.selectedPeakId, (id) => element.value?.setPrimarySelection(id))
function selection(event: Event): void { const id = (event as CustomEvent<{ primaryRowId: string | null }>).detail.primaryRowId; if (id) emit('select', id) }
</script>
<template><section class="results"><header><h2>Analysis results</h2><span>{{ rows.length }} peaks</span></header><p v-if="!rows.length" class="empty">No detected peaks for this recording.</p><nice-pool v-else ref="element" @nicepool-selection-change="selection" /></section></template>
