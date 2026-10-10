<script setup lang="ts">
import { ChartScatter, File, Info, Tag, SlidersHorizontal } from '@lucide/vue'

defineProps<{ nicePoolOpen: boolean; experimentalMetadataOpen: boolean; fileMetadataOpen: boolean; detectionParametersOpen: boolean; appInformationOpen: boolean; disabled: boolean }>()
defineEmits<{ toggleNicePool: []; toggleExperimentalMetadata: []; toggleFileMetadata: []; toggleDetectionParameters: []; toggleAppInformation: [] }>()
</script>

<template>
  <nav class="app-toolbar" aria-label="Views">
    <button type="button" class="icon-button" :class="{ active: fileMetadataOpen }" :disabled="disabled" aria-label="File metadata" title="File metadata" @click="$emit('toggleFileMetadata')"><File :size="19" aria-hidden="true" /></button>
    <button type="button" class="icon-button" :class="{ active: experimentalMetadataOpen }" :disabled="disabled" aria-label="Experimental metadata" title="Experimental metadata" @click="$emit('toggleExperimentalMetadata')"><Tag :size="19" aria-hidden="true" /></button>
    <button type="button" class="icon-button" :class="{ active: detectionParametersOpen }" :disabled="disabled" aria-label="Detection parameters" title="Detection parameters" @click="$emit('toggleDetectionParameters')"><SlidersHorizontal :size="19" aria-hidden="true" /></button>
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
    <button type="button" class="icon-button" :class="{ active: appInformationOpen }" aria-label="App information" title="App information" @click="$emit('toggleAppInformation')"><Info :size="19" aria-hidden="true" /></button>
  </nav>
</template>
