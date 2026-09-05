<script setup lang="ts">
import { X } from '@lucide/vue'
import { appInformation } from '../config/buildInfo'
defineEmits<{ close: [] }>()
</script>

<template>
  <aside class="app-information" aria-label="App information">
    <header><h2>App information</h2><button type="button" class="icon-button" aria-label="Close app information" @click="$emit('close')"><X :size="17" aria-hidden="true" /></button></header>
    <div class="app-information__body">
      <p>Sanpy-Web is a static browser-based viewer for viewing <a href="https://cudmore.github.io/SanPy/" target="_blank" rel="noopener noreferrer">SanPy</a> analysis. It loads <a href="https://mapmanager.github.io/acqstore/" target="_blank" rel="noopener noreferrer">AcqStore</a> Trace Collection packages.</p>
      <p>Created by Robert Cudmore. If interested in extending this website, contact <a href="mailto:robert.cudmore@gmail.com">robert.cudmore@gmail.com</a>.</p>
      <dl><template v-for="(value, label) in appInformation" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></template></dl>
    </div>
  </aside>
</template>
