import type { Node, Edge, NodeId } from '@/domain/types'

export type LayoutMode = 'sphere' | 'disc'

export interface GraphGeometry {
  nodeCount: number
  edgeCount: number
  offsets: Float32Array
  nodeColors: Float32Array
  radii: Float32Array
  births: Float32Array
  edgeStarts: Float32Array
  edgeEnds: Float32Array
  edgeStartColors: Float32Array
  edgeEndColors: Float32Array
  edgeStartIdx: Float32Array
  edgeEndIdx: Float32Array
  worldRadius: number
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const DISC_SPACING = 2.2
const SPHERE_RADIUS = 1
const SPHERE_NODE_RADIUS = 0.024

type Rgb = readonly [number, number, number]

const PINK: Rgb = [0.808, 0.267, 0.553]
const PURPLE: Rgb = [0.427, 0.455, 0.792]
const BLUE: Rgb = [0.161, 0.561, 0.918]

const NODE_COLORS: Record<Node['kind'], Rgb> = {
  concept: PINK,
  rule: PURPLE,
  relation: BLUE,
}

function lerp(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function gradient(t: number): Rgb {
  return t < 0.5 ? lerp(PINK, PURPLE, t * 2) : lerp(PURPLE, BLUE, (t - 0.5) * 2)
}

// Wireframe edges by connecting each node to its k nearest neighbours. On an
// even Fibonacci distribution this yields a clean, triangulated low-poly sphere
// (~3 edges per node) without the fragility of a full 3D convex hull.
function nearestNeighborEdges(
  positions: Float32Array,
  n: number,
  k: number,
): Array<[number, number]> {
  const edges: Array<[number, number]> = []
  const seen = new Set<number>()

  for (let i = 0; i < n; i++) {
    const ax = positions[i * 3]
    const ay = positions[i * 3 + 1]
    const az = positions[i * 3 + 2]

    const distances: Array<[number, number]> = []
    for (let j = 0; j < n; j++) {
      if (j === i) continue
      const dx = positions[j * 3] - ax
      const dy = positions[j * 3 + 1] - ay
      const dz = positions[j * 3 + 2] - az
      distances.push([dx * dx + dy * dy + dz * dz, j])
    }
    distances.sort((a, b) => a[0] - b[0])

    const limit = Math.min(k, distances.length)
    for (let m = 0; m < limit; m++) {
      const j = distances[m][1]
      const lo = Math.min(i, j)
      const hi = Math.max(i, j)
      const key = lo * n + hi
      if (!seen.has(key)) {
        seen.add(key)
        edges.push([lo, hi])
      }
    }
  }
  return edges
}

// Map domain edges (from/to NodeId) to node-index pairs, dropping any whose
// endpoints are not in the current node set. Used by the disc layout.
function indexDomainEdges(
  edges: Edge[],
  index: Map<NodeId, number>,
): Array<[number, number]> {
  const indexed: Array<[number, number]> = []
  for (const e of edges) {
    const a = index.get(e.from)
    const b = index.get(e.to)
    if (a !== undefined && b !== undefined) indexed.push([a, b])
  }
  return indexed
}

function buildFromIndexedEdges(
  offsets: Float32Array,
  nodeColors: Float32Array,
  indexed: Array<[number, number]>,
): Pick<
  GraphGeometry,
  'edgeStarts' | 'edgeEnds' | 'edgeStartColors' | 'edgeEndColors' | 'edgeStartIdx' | 'edgeEndIdx'
> {
  const count = indexed.length
  const edgeStarts = new Float32Array(count * 3)
  const edgeEnds = new Float32Array(count * 3)
  const edgeStartColors = new Float32Array(count * 3)
  const edgeEndColors = new Float32Array(count * 3)
  const edgeStartIdx = new Float32Array(count)
  const edgeEndIdx = new Float32Array(count)

  for (let k = 0; k < count; k++) {
    const [a, b] = indexed[k]
    edgeStartIdx[k] = a
    edgeEndIdx[k] = b
    for (let c = 0; c < 3; c++) {
      edgeStarts[k * 3 + c] = offsets[a * 3 + c]
      edgeEnds[k * 3 + c] = offsets[b * 3 + c]
      edgeStartColors[k * 3 + c] = nodeColors[a * 3 + c]
      edgeEndColors[k * 3 + c] = nodeColors[b * 3 + c]
    }
  }
  return { edgeStarts, edgeEnds, edgeStartColors, edgeEndColors, edgeStartIdx, edgeEndIdx }
}

function sphereLayout(nodes: Node[], birth: number): GraphGeometry {
  const n = nodes.length
  const offsets = new Float32Array(n * 3)
  const nodeColors = new Float32Array(n * 3)
  const radii = new Float32Array(n)
  const births = new Float32Array(n)
  births.fill(birth)

  for (let i = 0; i < n; i++) {
    const y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = i * GOLDEN_ANGLE
    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r
    offsets[i * 3] = x * SPHERE_RADIUS
    offsets[i * 3 + 1] = y * SPHERE_RADIUS
    offsets[i * 3 + 2] = z * SPHERE_RADIUS

    const color = gradient((x + 1) / 2)
    nodeColors[i * 3] = color[0]
    nodeColors[i * 3 + 1] = color[1]
    nodeColors[i * 3 + 2] = color[2]
    radii[i] = SPHERE_NODE_RADIUS
  }

  const indexed = nearestNeighborEdges(offsets, n, 6)
  const builtEdges = buildFromIndexedEdges(offsets, nodeColors, indexed)

  return {
    nodeCount: n,
    edgeCount: indexed.length,
    offsets,
    nodeColors,
    radii,
    births,
    worldRadius: SPHERE_RADIUS,
    ...builtEdges,
  }
}

function discLayout(nodes: Node[], edges: Edge[], birth: number): GraphGeometry {
  const n = nodes.length
  const offsets = new Float32Array(n * 3)
  const nodeColors = new Float32Array(n * 3)
  const radii = new Float32Array(n)
  const births = new Float32Array(n)
  births.fill(birth)

  const index = new Map<NodeId, number>()

  for (let i = 0; i < n; i++) {
    const node = nodes[i]
    index.set(node.id, i)

    const r = DISC_SPACING * Math.sqrt(i)
    const a = i * GOLDEN_ANGLE
    offsets[i * 3] = Math.cos(a) * r
    offsets[i * 3 + 1] = Math.sin(a) * r
    offsets[i * 3 + 2] = 0

    const c = NODE_COLORS[node.kind]
    nodeColors[i * 3] = c[0]
    nodeColors[i * 3 + 1] = c[1]
    nodeColors[i * 3 + 2] = c[2]

    const DISC_RADIUS_BASE = 0.2
    const DISC_RADIUS_VARIATION = 0.1
    const variation =
      node.kind === 'concept' ? node.weight : node.kind === 'relation' ? node.strength : 0.5
    radii[i] = DISC_SPACING * (DISC_RADIUS_BASE + DISC_RADIUS_VARIATION * variation)
  }

  const indexed = indexDomainEdges(edges, index)
  const builtEdges = buildFromIndexedEdges(offsets, nodeColors, indexed)

  return {
    nodeCount: n,
    edgeCount: indexed.length,
    offsets,
    nodeColors,
    radii,
    births,
    worldRadius: DISC_SPACING * Math.sqrt(Math.max(n, 1)),
    ...builtEdges,
  }
}

export function computeLayout(
  nodes: Node[],
  edges: Edge[],
  mode: LayoutMode,
  birth = 0,
): GraphGeometry {
  return mode === 'sphere' ? sphereLayout(nodes, birth) : discLayout(nodes, edges, birth)
}
