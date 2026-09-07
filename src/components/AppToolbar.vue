<script setup lang="ts">
import { ChartScatter, FileJson, Info, SlidersHorizontal } from '@lucide/vue'

defineProps<{ nicePoolOpen: boolean; metadataOpen: boolean; detectionParametersOpen: boolean; appInformationOpen: boolean; disabled: boolean }>()
defineEmits<{ toggleNicePool: []; toggleMetadata: []; toggleDetectionParameters: []; toggleAppInformation: [] }>()
</script>

<template>
  <nav class="app-toolbar" aria-label="Views">
    <button
      type="button"
      class="icon-button"
      :class="{ active: nicePoolOpen }"
      :disabled="disabled"
      aria-label="NicePool"
      title="NicePool"
      @click="$emit('toggleNicePool')"
    >
      <ChartScatter :size="19" aria-hidden="true" />
    </button>
    <button type="button" class="icon-button" :class="{ active: metadataOpen }" :disabled="disabled" aria-label="SanPy metadata" title="SanPy metadata" @click="$emit('toggleMetadata')"><FileJson :size="19" aria-hidden="true" /></button>
    <button type="button" class="icon-button" :class="{ active: detectionParametersOpen }" :disabled="disabled" aria-label="Detection parameters" title="Detection parameters" @click="$emit('toggleDetectionParameters')"><SlidersHorizontal :size="19" aria-hidden="true" /></button>
    <button type="button" class="icon-button" :class="{ active: appInformationOpen }" aria-label="App information" title="App information" @click="$emit('toggleAppInformation')"><Info :size="19" aria-hidden="true" /></button>
  </nav>
</template>
