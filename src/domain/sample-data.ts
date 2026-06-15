// import our types and helper functions
import { Node, Edge, nodeId, edgeId } from './types'

// mulberry32 generates distinct random numbers from a seed
function mulberry32(a: number) {
  return function () {
    // seed
    let t = (a += 0x6d2b79f5)
    // bitwise operations to generate a random number
    t = Math.imul(t ^ (t >>> 15), t | 1)  
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    // return a random number between 0 and 1
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// an array of the three edge kind strings, locked to literal types by `as const`
const edgeKinds = ['supports', 'contradicts', 'derives'] as const

// Function to generate a sample graph given a number of nodes and a PRNG seed
export function generateSampleGraph(
  nodeCount: number, // how many nodes to create
  seed: number,      // PRNG seed for deterministic output
): { nodes: Node[]; edges: Edge[] } {
  // mulberry32 returns a closure. prng() gives the next float in [0, 1) each call.
  const prng = mulberry32(seed)
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Generate each node
  for (let i = 0; i < nodeCount; i++) {
    // push one of three node kinds to the nodes array
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

  // Generate edges for the sample graph
  for (let i = 0; i < nodes.length; i++) {
    const connectionCount = 1 + Math.floor(prng() * 3)
    for (let c = 0; c < connectionCount; c++) {
      // pick a random target node index
      const j = Math.floor(prng() * nodes.length)
      if (j === i) continue
      // create an edge between the two nodes
      edges.push({
        id: edgeId(`edge-${i}-${c}`),
        // pick a random edge kind
        kind: edgeKinds[Math.floor(prng() * edgeKinds.length)],
        // set the source node
        from: nodes[i].id,
        // set the target node
        to: nodes[j].id,
      })
    }
  }

  return { nodes, edges }
}
