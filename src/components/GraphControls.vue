<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGraphStore } from '@/stores/graph-store'

const store = useGraphStore()
const { mode, nodeCount } = storeToRefs(store)

const SPHERE_COUNTS = [40, 100, 300, 1000]
const DISC_COUNTS = [1000, 10000, 100000, 250000]

const counts = computed(() => (mode.value === 'sphere' ? SPHERE_COUNTS : DISC_COUNTS))
</script>

<template>
  <section class="controls">
    <h2>View</h2>
    <div class="modes">
      <button
        type="button"
        :class="{ active: mode === 'sphere' }"
        @click="store.setMode('sphere')"
      >
        Sphere
      </button>
      <button
        type="button"
        :class="{ active: mode === 'disc' }"
        @click="store.setMode('disc')"
      >
        Graph
      </button>
    </div>

    <h2>Nodes</h2>
    <div class="buttons">
      <button
        v-for="count in counts"
        :key="count"
        type="button"
        :class="{ active: count === nodeCount }"
        @click="store.regenerate(count)"
      >
        {{ count.toLocaleString('en-US') }}
      </button>
    </div>

    <p class="hint">Drag to orbit, scroll to zoom, click a node to inspect it.</p>
  </section>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

h2 {
  margin: 4px 0 0;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b93a7;
}

.modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

button {
  padding: 8px 10px;
  border: 1px solid #2a2f3d;
  border-radius: 8px;
  background: #161a24;
  color: #e6e9f0;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

button:hover {
  border-color: #3b5bdb;
  background: #1c2233;
}

button.active {
  border-color: #6d74ca;
  background: #232a3d;
}
</style>
