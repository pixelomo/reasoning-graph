<script setup lang="ts">
import GraphCanvas from '@/components/GraphCanvas.vue'
import GraphControls from '@/components/GraphControls.vue'
import NodeInspector from '@/components/NodeInspector.vue'
</script>

<template>
  <div class="layout">
    <main class="canvas-area">
      <GraphCanvas />
    </main>
    <aside class="sidebar">
      <header class="brand">
        <h1>Reasoning Graph</h1>
        <p>WebGL2 instanced rendering with GPU picking</p>
      </header>
      <GraphControls />
      <NodeInspector />
    </aside>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  width: 100vw;
  height: 100vh;
}

.canvas-area {
  position: relative;
  min-width: 0;
  background: #0a0c12;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 20px;
  background: #0e1118;
  border-left: 1px solid #1c2130;
  overflow-y: auto;
}

.brand h1 {
  margin: 0 0 4px;
  font-size: 18px;
  color: #f4f6fb;
}

.brand p {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}
</style>
