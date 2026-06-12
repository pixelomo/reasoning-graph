# Study notes

Personal reference. Write these in your own words after each session -- the act of rewriting is part of the learning.

---

## Discriminated unions

A regular union like `string | number` already means "one of several types" -- the distinction isn't that. The distinction is how TypeScript narrows it.

A **discriminated union** is a union of object types that all share a property with a unique literal value per variant (the `kind` field here). TypeScript narrows the full type the moment you check that one field in a switch -- after `case 'concept':` it knows every field of the concept variant.

Without a shared discriminant, TypeScript can only narrow using `typeof` or `instanceof` checks. With one, narrowing is instant and precise.

## `never` and exhaustiveness

`never` is the bottom type -- the type of a value that can never exist. TypeScript assigns it to unreachable code paths and functions that always throw.

The exhaustiveness trick: put `assertNever(x: never)` in the default branch of a switch. After all union variants are handled, TypeScript narrows the value to `never` in the default -- so it's happy passing it to `assertNever`. Add a new variant without a case and TypeScript errors because the unhandled variant is not `never`.

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`)
}
```

## Structural typing and branded types

TypeScript uses **structural typing**: it compares types by shape, not name. `type NodeId = string` is just an alias -- the shape is still `string`, so any string satisfies it.

The brand pattern adds a phantom intersection:
```ts
type NodeId = string & { readonly __brand: 'NodeId' }
```
The `__brand` property never exists at runtime. It only exists at the type level, making `NodeId` and `EdgeId` structurally distinct. TypeScript will refuse to accept one where the other is expected.

## Cast helper functions

`as NodeId` is a type assertion -- it bypasses the type system. Reasons to centralise it in a function rather than scatter it:

1. The unsafe cast lives in one place. One function to audit, not 20 call sites.
2. You can add runtime validation later without touching call sites.

```ts
export function nodeId(raw: string): NodeId { return raw as NodeId }
```

## `as const`

Without `as const`, TypeScript infers an array as `string[]`. The `kind` field on `Edge` expects a string literal union (`'supports' | 'contradicts' | 'derives'`), not `string`.

```ts
const edgeKinds = ['supports', 'contradicts', 'derives'] as const
// TypeScript infers: readonly ['supports', 'contradicts', 'derives']
```

Now indexing into it gives a literal type that satisfies the union.

## Graph data vs. layout

The domain model (nodes, edges) is pure data: ids, fields, connections. It knows nothing about pixels or positions.

Where things appear on screen is the renderer's job (Phase 5+). Mixing layout into the data model creates coupling you'll regret. Generate the graph data independently; the renderer decides where to draw each node.

## Seeded PRNG (mulberry32)

A seeded pseudo-random number generator takes an integer seed and returns a function that produces deterministic floats in [0, 1). Same seed always produces the same sequence -- essential for reproducible test graphs.

```ts
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
```

## generateSampleGraph -- line by line

```ts
// Pull in the domain types and cast helpers from types.ts
import { Node, Edge, nodeId, edgeId } from './types'

// An array of the three edge kind strings, locked to literal types by `as const`.
// Without `as const` TypeScript infers string[], which won't satisfy the Edge kind union.
const edgeKinds = ['supports', 'contradicts', 'derives'] as const

export function generateSampleGraph(
  nodeCount: number,  // how many nodes to create
  seed: number,       // starting value for the PRNG -- same seed = same graph
): { nodes: Node[]; edges: Edge[] } {

  // mulberry32 returns a closure. prng() gives the next float in [0, 1) each call.
  const prng = mulberry32(seed)

  const nodes: Node[] = []  // will be filled in the first loop
  const edges: Edge[] = []  // will be filled in the second loop

  // --- Node generation ---
  for (let i = 0; i < nodeCount; i++) {

    // i % 3 cycles 0, 1, 2, 0, 1, 2 ... so we get a mix of all three node kinds
    switch (i % 3) {
      case 0:
        // nodeId() wraps the string in the NodeId brand -- safe to use as NodeId anywhere
        nodes.push({ id: nodeId(`node-${i}`), kind: 'concept', label: `Concept ${i}`, weight: prng() })
        break
      case 1:
        nodes.push({ id: nodeId(`node-${i}`), kind: 'rule', premise: [`Premise ${i}`], conclusion: `Conclusion ${i}` })
        break
      case 2:
        nodes.push({
          id: nodeId(`node-${i}`),
          kind: 'relation',
          // prng() * (i - 1) gives a random index in 0..i-2.
          // Math.floor truncates to an integer index.
          // We look up .id on the already-created node -- no string construction needed,
          // and the type is NodeId because that's what the node's id field holds.
          from: nodes[Math.floor(prng() * (i - 1))].id,
          to:   nodes[Math.floor(prng() * (i - 1))].id,
          strength: prng(),
        })
        break
    }
  }

  // --- Edge generation ---
  // Loop over the completed nodes array (not nodeCount) so we use real indices.
  for (let i = 0; i < nodes.length; i++) {

    // Pick 1, 2, or 3 connections for this node.
    // prng() * 3 gives [0, 3). Math.floor gives 0, 1, or 2. Adding 1 gives 1, 2, or 3.
    const connectionCount = 1 + Math.floor(prng() * 3)

    for (let c = 0; c < connectionCount; c++) {

      // Pick a random target node index
      const j = Math.floor(prng() * nodes.length)

      // Skip self-connections (a node pointing to itself makes no sense in this graph)
      if (j === i) continue

      edges.push({
        // edgeId() gives an EdgeId brand -- distinct from NodeId, TypeScript enforces this
        id: edgeId(`edge-${i}-${c}`),

        // Index into edgeKinds with a random int 0-2.
        // Works because edgeKinds is `as const` -- the result is a literal type, not string.
        kind: edgeKinds[Math.floor(prng() * edgeKinds.length)],

        // nodes[i].id is already a NodeId -- no casting needed
        from: nodes[i].id,
        to:   nodes[j].id,
      })
    }
  }

  return { nodes, edges }
}
```


