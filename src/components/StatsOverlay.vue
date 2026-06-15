<script setup lang="ts">
defineProps<{
  fps: number
  nodeCount: number
  edgeCount: number
}>()

function format(value: number): string {
  return value.toLocaleString('en-US')
}
</script>

<template>
  <div class="stats" role="status" aria-live="polite">
    <span class="stat"><strong>{{ fps }}</strong> fps</span>
    <span class="stat"><strong>{{ format(nodeCount) }}</strong> nodes</span>
    <span class="stat"><strong>{{ format(edgeCount) }}</strong> edges</span>
  </div>
</template>

<style scoped>
.stats {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 14px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(12, 14, 20, 0.7);
  backdrop-filter: blur(6px);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  color: #cdd3df;
  pointer-events: none;
}

.stat strong {
  color: #fff;
}
</style>
