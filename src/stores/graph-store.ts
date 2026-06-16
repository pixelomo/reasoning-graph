// Goal: one store that owns the graph data, the current selection, and the view
// mode. State is exposed as refs, derived values as computeds, mutations as
// plain functions. Components read from it; the canvas reads from it.
import { defineStore } from 'pinia'
import { shallowRef, ref, computed } from 'vue'
import type { Node, Edge, NodeId } from '@/domain/types'
import { generateSampleGraph } from '@/domain/sample-data'  
import type { LayoutMode } from '@/webgl/layout'

export const useGraphStore = defineStore('graph', () => {
  // shallowRef for nodes/edges: arrays can hold 100k+ objects. 
  const nodes = shallowRef<Node[]>([])
  const edges = shallowRef<Edge[]>([])
  // ref for the small scalars: selectedNodeId, mode, seed.
  const selectedNodeId = ref<NodeId | null>(null)
  const mode = ref<LayoutMode>('sphere')
  // seed is not returned, it is private to the store, only touched by regenerate and setMode
  const seed = ref(1)

  // computed for derived values: selectedNode, nodeCount, edgeCount.
  // find the node whose id === selectedNodeId, else null
  const selectedNode = computed(() => {
    return nodes.value.find((node) => node.id === selectedNodeId.value) ?? null
  })

  const nodeCount = computed(() => nodes.value.length)
  const edgeCount = computed(() => edges.value.length)

  // bump seed, build a fresh graph, assign nodes/edges, clear selection
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
    clearSelection
  }
})

