<script setup lang="ts">
import type { TraceCollectionMember } from '../models/traceCollection'
defineProps<{ members: TraceCollectionMember[]; selectedId: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()
</script>
<template><div class="table-scroll"><table><thead><tr><th>File</th><th>Sweeps</th><th>Channels</th><th>Samples</th><th>Rate</th><th>Peaks</th><th>Protocol</th></tr></thead><tbody><tr v-for="member in members" :key="member.id" :class="{ selected: member.id === selectedId }" tabindex="0" @click="emit('select', member.id)" @keydown.enter="emit('select', member.id)"><td>{{ member.name }}</td><td>{{ member.summary.num_sweeps }}</td><td>{{ member.summary.num_channels }}</td><td>{{ member.summary.samples_per_sweep.toLocaleString() }}</td><td>{{ member.summary.samples_per_second.toLocaleString() }} Hz</td><td>{{ member.summary.num_peaks }}</td><td>{{ member.summary.protocol || '—' }}</td></tr></tbody></table></div></template>

