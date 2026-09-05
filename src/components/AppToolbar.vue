<script setup lang="ts">
import { ChartScatter, Info } from '@lucide/vue'

defineProps<{ nicePoolOpen: boolean; appInformationOpen: boolean; disabled: boolean }>()
defineEmits<{ toggleNicePool: []; toggleAppInformation: [] }>()
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
    <button type="button" class="icon-button" :class="{ active: appInformationOpen }" aria-label="App information" title="App information" @click="$emit('toggleAppInformation')"><Info :size="19" aria-hidden="true" /></button>
  </nav>
</template>
