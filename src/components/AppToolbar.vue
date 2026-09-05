<script setup lang="ts">
import { ChartScatter } from '@lucide/vue'

defineProps<{ nicePoolOpen: boolean; disabled: boolean }>()
defineEmits<{ toggleNicePool: [] }>()
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
  </nav>
</template>
