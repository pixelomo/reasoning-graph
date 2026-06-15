import { defineStore } from 'pinia'
import { shallowRef, ref, computed } from 'vue'
import type { Node, Edge, NodeId } from '@/domain/types'
import { generateSampleGraph } from '@/domain/sample-data'
import type { LayoutMode } from '@/webgl/layout'

const DEFAULT_COUNT: Record<LayoutMode, number> = {
  sphere: 300,
  disc: 10000,
}

export const useGraphStore = defineStore('graph', () => {
  const nodes = shallowRef<Node[]>([])
  const edges = shallowRef<Edge[]>([])
  const selectedNodeId = ref<NodeId | null>(null)
  const mode = ref<LayoutMode>('sphere')
  const seed = ref(1)

  const selectedNode = computed<Node | null>(() => {
    const id = selectedNodeId.value
    if (id === null) return null
    return nodes.value.find((node) => node.id === id) ?? null
  })

  const nodeCount = computed(() => nodes.value.length)
  const edgeCount = computed(() => edges.value.length)

  function regenerate(count: number): void {
    seed.value += 1
    const graph = generateSampleGraph(count, seed.value)
    nodes.value = graph.nodes
    edges.value = graph.edges
    selectedNodeId.value = null
  }

  function setMode(next: LayoutMode): void {
    if (mode.value === next) return
    mode.value = next
    regenerate(DEFAULT_COUNT[next])
  }

  function selectNode(id: NodeId): void {
    selectedNodeId.value = id
  }

  function clearSelection(): void {
    selectedNodeId.value = null
  }

  return {
    nodes,
    edges,
    selectedNodeId,
    selectedNode,
    mode,
    nodeCount,
    edgeCount,
    regenerate,
    setMode,
    selectNode,
    clearSelection,
  }
})
