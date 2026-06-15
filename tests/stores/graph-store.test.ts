import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGraphStore } from '@/stores/graph-store'

describe('graph store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts empty with no selection', () => {
    const store = useGraphStore()
    expect(store.nodeCount).toBe(0)
    expect(store.edgeCount).toBe(0)
    expect(store.selectedNode).toBeNull()
  })

  it('regenerate populates nodes and edges', () => {
    const store = useGraphStore()
    store.regenerate(50)
    expect(store.nodeCount).toBe(50)
    expect(store.edgeCount).toBeGreaterThan(0)
  })

  it('regenerate is deterministic for a fixed sequence', () => {
    const a = useGraphStore()
    a.regenerate(20)
    const firstIds = a.nodes.map((n) => n.id)

    setActivePinia(createPinia())
    const b = useGraphStore()
    b.regenerate(20)
    const secondIds = b.nodes.map((n) => n.id)

    expect(secondIds).toEqual(firstIds)
  })

  it('selectNode resolves the selectedNode computed', () => {
    const store = useGraphStore()
    store.regenerate(10)
    const target = store.nodes[3]
    store.selectNode(target.id)
    expect(store.selectedNode).toEqual(target)
  })

  it('clearSelection resets selection', () => {
    const store = useGraphStore()
    store.regenerate(10)
    store.selectNode(store.nodes[0].id)
    store.clearSelection()
    expect(store.selectedNode).toBeNull()
  })

  it('regenerate clears any existing selection', () => {
    const store = useGraphStore()
    store.regenerate(10)
    store.selectNode(store.nodes[0].id)
    store.regenerate(10)
    expect(store.selectedNodeId).toBeNull()
  })
})
