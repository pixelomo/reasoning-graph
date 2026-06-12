import { Node, Edge, nodeId, edgeId } from './types'

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const edgeKinds = ['supports', 'contradicts', 'derives'] as const

export function generateSampleGraph(
  nodeCount: number,
  seed: number,
): { nodes: Node[]; edges: Edge[] } {
  const prng = mulberry32(seed)
  const nodes: Node[] = []
  const edges: Edge[] = []

  for (let i = 0; i < nodeCount; i++) {
    switch (i % 3) {
      case 0:
        nodes.push({ id: nodeId(`node-${i}`), kind: 'concept', label: `Concept ${i}`, weight: prng() })
        break
      case 1:
        nodes.push({ id: nodeId(`node-${i}`), kind: 'rule', premise: [`Premise ${i}`], conclusion: `Conclusion ${i}` })
        break
      case 2:
        nodes.push({
          id: nodeId(`node-${i}`),
          kind: 'relation',
          from: nodes[Math.floor(prng() * (i - 1))].id,
          to: nodes[Math.floor(prng() * (i - 1))].id,
          strength: prng(),
        })
        break
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const connectionCount = 1 + Math.floor(prng() * 3)
    for (let c = 0; c < connectionCount; c++) {
      const j = Math.floor(prng() * nodes.length)
      if (j === i) continue
      edges.push({
        id: edgeId(`edge-${i}-${c}`),
        kind: edgeKinds[Math.floor(prng() * edgeKinds.length)],
        from: nodes[i].id,
        to: nodes[j].id,
      })
    }
  }

  return { nodes, edges }
}
