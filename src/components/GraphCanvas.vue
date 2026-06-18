<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGraphStore } from '@/stores/graph-store'
import { useCamera } from '@/composables/useCamera'
import { useFps } from '@/composables/useFps'
import { usePicking } from '@/composables/usePicking'
import { GraphRenderer } from '@/webgl/renderer'
import { computeLayout, type GraphGeometry } from '@/webgl/layout'
import { mulberry32 } from '@/domain/sample-data'
import type { NodeId } from '@/domain/types'
import StatsOverlay from './StatsOverlay.vue'

const store = useGraphStore()
const { nodes, edges, selectedNodeId, mode, nodeCount } = storeToRefs(store)
const renderedEdges = ref(0)

const camera = useCamera()
const { fps, tick } = useFps()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const error = ref<string | null>(null)

let renderer: GraphRenderer | null = null
let frame = 0
let startTime = 0
let lastNow = 0
let deviceWidth = 1
let deviceHeight = 1
let dpr = 1
let breathe = 1
let dragging = false
const idToIndex = new Map<NodeId, number>()

// Adjacency over the drawn edges, rebuilt with the geometry. Used to compute
// the random highlight subgraph on the CPU when the selection changes.
let adjacency: number[][] = []
let edgeKeyToIndex = new Map<number, number>()
let edgeKeyStride = 1
let edgeCountCpu = 0

function currentTime(): number {
  return (performance.now() - startTime) / 1000
}

function aspect(): number {
  return deviceWidth / deviceHeight
}

function rebuildGeometry(birth: number): void {
  if (!renderer) return
  const geometry = computeLayout(nodes.value, edges.value, mode.value, birth)
  renderedEdges.value = geometry.edgeCount
  idToIndex.clear()
  nodes.value.forEach((node, i) => idToIndex.set(node.id, i))
  renderer.upload(geometry)
  buildAdjacency(geometry)
  applyHighlight()
  camera.fit(geometry.worldRadius)
  camera.reset()
}

function buildAdjacency(geometry: GraphGeometry): void {
  const n = Math.max(geometry.nodeCount, 1)
  edgeKeyStride = n
  edgeCountCpu = geometry.edgeCount
  adjacency = Array.from({ length: geometry.nodeCount }, () => [])
  edgeKeyToIndex = new Map<number, number>()
  for (let e = 0; e < geometry.edgeCount; e++) {
    const a = geometry.edgeStartIdx[e]
    const b = geometry.edgeEndIdx[e]
    adjacency[a].push(b)
    adjacency[b].push(a)
    edgeKeyToIndex.set(Math.min(a, b) * n + Math.max(a, b), e)
  }
}

// Light a random subgraph rooted at the selected node: 1-4 of its neighbours,
// then 1-2 of each of those neighbours' own neighbours. Seeded per node so the
// pattern is stable for a given selection.
function applyHighlight(): void {
  if (!renderer) return
  const flags = new Float32Array(edgeCountCpu)
  const root = selectedIndex()
  if (root >= 0) {
    const prng = mulberry32(root + 1)
    const used = new Set<number>([root])
    const flagEdge = (a: number, b: number): void => {
      const idx = edgeKeyToIndex.get(Math.min(a, b) * edgeKeyStride + Math.max(a, b))
      if (idx !== undefined) flags[idx] = 1
    }
    const pick = (candidates: number[], count: number): number[] => {
      const chosen: number[] = []
      let guard = 0
      while (chosen.length < count && guard < candidates.length * 3) {
        const c = candidates[Math.floor(prng() * candidates.length)]
        if (!used.has(c)) {
          used.add(c)
          chosen.push(c)
        }
        guard += 1
      }
      return chosen
    }
    for (const j of pick(adjacency[root] ?? [], 1 + Math.floor(prng() * 4))) {
      flagEdge(root, j)
      for (const k of pick(adjacency[j] ?? [], 1 + Math.floor(prng() * 2))) flagEdge(j, k)
    }
  }
  renderer.setHighlight(flags)
}

function resize(): void {
  const canvas = canvasEl.value
  if (!canvas || !renderer) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  deviceWidth = Math.max(1, Math.round(rect.width * dpr))
  deviceHeight = Math.max(1, Math.round(rect.height * dpr))
  canvas.width = deviceWidth
  canvas.height = deviceHeight
  renderer.resize(deviceWidth, deviceHeight)
}

function selectedIndex(): number {
  const id = selectedNodeId.value
  if (id === null) return -1
  return idToIndex.get(id) ?? -1
}

function renderLoop(): void {
  if (!renderer) return
  const now = performance.now()
  const dt = lastNow === 0 ? 0 : (now - lastNow) / 1000
  lastNow = now
  tick(now)

  const time = currentTime()
  const isSphere = mode.value === 'sphere'
  if (isSphere && !dragging) camera.autoRotate(dt, 0.18)
  breathe = isSphere ? 1 + 0.03 * Math.sin(time * 0.6) : 1

  renderer.draw({
    modelView: camera.modelView(),
    proj: camera.proj(aspect()),
    resolution: [deviceWidth, deviceHeight],
    time,
    breathe,
    selectedIndex: selectedIndex(),
    edgeAlpha: isSphere ? 0.55 : 0.25,
    lineWidthPx: 1.3 * dpr,
  })
  frame = requestAnimationFrame(renderLoop)
}

let lastX = 0
let lastY = 0

function onPointerDown(event: PointerEvent): void {
  dragging = true
  lastX = event.clientX
  lastY = event.clientY
}

function onWindowPointerMove(event: PointerEvent): void {
  if (!dragging) return
  camera.orbit((event.clientX - lastX) * dpr, (event.clientY - lastY) * dpr)
  lastX = event.clientX
  lastY = event.clientY
}

function onWindowPointerUp(): void {
  dragging = false
}

function onWheel(event: WheelEvent): void {
  event.preventDefault()
  camera.dolly(Math.pow(1.0015, event.deltaY))
}

usePicking({
  canvas: canvasEl,
  dpr: () => dpr,
  pickAt: (x, y) =>
    renderer ? renderer.pick(x, y, camera.modelView(), camera.proj(aspect()), breathe) : null,
  onPick: (index) => {
    if (index === null || index < 0 || index >= nodes.value.length) {
      store.clearSelection()
      return
    }
    store.selectNode(nodes.value[index].id)
  },
})

watch([nodes, edges, mode], () => rebuildGeometry(currentTime()))
watch(selectedNodeId, () => applyHighlight())

onMounted(() => {
  const canvas = canvasEl.value
  if (!canvas) return
  const gl = canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: false })
  if (!gl) {
    error.value = 'WebGL2 is not available in this browser.'
    return
  }

  startTime = performance.now()
  renderer = new GraphRenderer(gl)
  resize()

  if (store.nodeCount === 0) store.regenerate(300)
  else rebuildGeometry(currentTime())

  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onWindowPointerMove)
  window.addEventListener('pointerup', onWindowPointerUp)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  frame = requestAnimationFrame(renderLoop)
})

onUnmounted(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onWindowPointerUp)
  const canvas = canvasEl.value
  if (canvas) {
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('wheel', onWheel)
  }
  renderer?.dispose()
  renderer = null
})
</script>

<template>
  <div class="canvas-wrap">
    <canvas ref="canvasEl" class="graph-canvas"></canvas>
    <StatsOverlay :fps="fps" :node-count="nodeCount" :edge-count="renderedEdges" />
    <p v-if="error" class="canvas-error">{{ error }}</p>
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
