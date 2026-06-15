import { describe, it, expect } from 'vitest'
import { nodeId, edgeId, describeNode, describeEdge, type Node, type Edge } from '@/domain/types'

describe('node variants', () => {
  it('constructs each node kind', () => {
    const concept: Node = { kind: 'concept', id: nodeId('a'), label: 'A', weight: 0.5 }
    const rule: Node = { kind: 'rule', id: nodeId('b'), premise: ['p'], conclusion: 'c' }
    const relation: Node = {
      kind: 'relation',
      id: nodeId('c'),
      from: nodeId('a'),
      to: nodeId('b'),
      strength: 0.8,
    }

    expect(describeNode(concept)).toBe('A')
    expect(describeNode(rule)).toBe('c')
    expect(describeNode(relation)).toBe('a -> b')
  })
})

describe('edge variants', () => {
  it('describes each edge kind', () => {
    const kinds = ['supports', 'contradicts', 'derives'] as const
    const expected = ['a supports b', 'a contradicts b', 'a derives b']

    kinds.forEach((kind, i) => {
      const edge = { kind, id: edgeId('e'), from: nodeId('a'), to: nodeId('b') } as Edge
      expect(describeEdge(edge)).toBe(expected[i])
    })
  })
})
