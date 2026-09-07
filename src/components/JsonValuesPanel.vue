<script setup lang="ts">
import { computed } from 'vue'
import { X } from '@lucide/vue'

const props = defineProps<{ title: string; values: Record<string, unknown>; recordingName: string }>()
defineEmits<{ close: [] }>()

const entries = computed(() => Object.entries(props.values).sort(([left], [right]) => left.localeCompare(right)))

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script>

<template>
  <aside class="json-values-panel" :aria-label="title">
    <header><div><h2>{{ title }}</h2><p>{{ recordingName }}</p></div><button type="button" class="icon-button" :aria-label="`Close ${title}`" title="Close" @click="$emit('close')"><X :size="17" aria-hidden="true" /></button></header>
    <div class="json-values-panel__body">
      <dl v-if="entries.length"><template v-for="([key, value]) in entries" :key="key"><dt>{{ key }}</dt><dd>{{ displayValue(value) }}</dd></template></dl>
      <p v-else class="empty">No values.</p>
    </div>
  </aside>
</template>
