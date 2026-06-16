<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGraphStore } from '@/stores/graph-store'
import { useFps } from '@/composables/useFps'
import StatsOverlay from './StatsOverlay.vue'

const store = useGraphStore()
const { nodeCount, edgeCount } = storeToRefs(store)
const { fps } = useFps()       
const canvasEl = ref<HTMLCanvasElement | null>(null)
</script>

<template>
  <div class="canvas-wrap">
    <canvas ref="canvasEl" class="graph-canvas"></canvas>
    <StatsOverlay :fps="fps" :node-count="nodeCount" :edge-count="edgeCount" />
  </div>
</template>

<style scoped>
.canvas-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.graph-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
}

.graph-canvas:active {
  cursor: grabbing;
}

.canvas-error {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  color: #f0f0f0;
}
</style>