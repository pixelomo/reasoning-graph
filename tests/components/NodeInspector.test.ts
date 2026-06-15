import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import NodeInspector from '@/components/NodeInspector.vue'
import { useGraphStore } from '@/stores/graph-store'

describe('NodeInspector', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows an empty message when nothing is selected', () => {
    render(NodeInspector)
    expect(screen.getByText('No node selected.')).toBeTruthy()
  })

  it('shows details for the selected node', async () => {
    const store = useGraphStore()
    store.regenerate(10)
    const concept = store.nodes.find((n) => n.kind === 'concept')
    if (!concept) throw new Error('expected a concept node in the sample')

    store.selectNode(concept.id)
    render(NodeInspector)

    expect(screen.getByText(concept.id)).toBeTruthy()
    expect(screen.getByText('concept')).toBeTruthy()
  })

  it('clears the selection from the inspector button', async () => {
    const store = useGraphStore()
    store.regenerate(10)
    store.selectNode(store.nodes[0].id)
    render(NodeInspector)

    const button = screen.getByRole('button', { name: /clear selection/i })
    button.click()

    expect(store.selectedNode).toBeNull()
  })
})
