# Study notes

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

# Pinia

## shallowRef vs ref 

### You used shallowRef for nodes and edges but plain ref for selectedNodeId, mode, and seed. In your own words: what is the actual difference in what Vue tracks between ref and shallowRef, and why did you split them that way?

shallowRef only tracks the array itself not every nested property - nodes/edges may contain 100,000+ nodes - tracking all of these for every node interaction would slow/freeze the app. It's not just faster it's also the correct update pattern here, you always replace the whole array nodes.value = graph.nodes never node.values[i] = ... mutating a node in place. Reactivity only fires on reassignment. ref is the conventional default for smaller scalars such as selectedNodeId, deep vs shallow makes no difference.

###  suppose you'd used a plain ref<Node[]>([]) instead of shallowRef, AND somewhere in the codebase you did store.nodes.value[0].label = 'changed' (mutating in place). Walk me through what happens with ref, versus what happens with shallowRef. What's the observable difference in behavior? The scenario is: you mutate in place — store.nodes.value[0].label = 'changed'. A component is displaying that label. Think about what the user actually sees on screen in each case. What's the difference?

With ref the label updates, the user sees 'changed', while shallowRef does mutate label to 'changed' the app silently fails. What doesn't happen is the reactivity trigger: Vue never knows the mutation occurred, so the DOM never re-renders the old label. That's the trade-off with shallowRef: you give up automatic in-place tracking in exchange for performance, which is fine because my update pattern is always whole-array replacement.

## A teammate writes this in a component:

## const store = useGraphStore()
## const { nodeCount, selectedNode } = store
## They destructure straight off the store. It works at first, then the UI stops updating when the graph changes. What's wrong, what's the fix, and why does that fix exist?
## Why does plain destructuring break in the first place?

Plain destructuring a reactive object copies the property's current value into a plain variable with no connection to the live state, The reactivity lived in the store reference; storeToRefs fixes this by wrapping each state and computed property in a ref which is connected to the store, if a component destructures it doesnt break reactivity because it's still connected to the store state. functions dont need reactive wrappers, we can destructure and they will still be called the same way and not break reactivity

## The Pinia store is a reactive object

## plain destructure = dead copy
## const { nodeCount } = store
Copies the current value into a local disconnected variable, When the store updates nodeCount later, the local nodeCount is still the old value. 

## storeToRefs = live ref wrapper
## import { storeToRefs } from 'pinia'
## const store = useGraphStore()
## const { nodeCount, selectedNode } = storeToRefs(store)

plain destructure = dead copy, storeToRefs = live ref wrapper


## ref vs computed:

## In your store, selectedNode is a computed, but selectedNodeId is a ref. Why is selectedNode a computed and not, say, a regular ref that you manually update inside selectNode? What does computed give you that you'd have to do by hand otherwise, and what's the risk of the manual approach?

computed is the single source of truth for derived state; a manual ref is a cache you're obligated to invalidate yourself, and you may eventually forget a site where it needs to be updated.

selectedNode depends on two things: selectedNodeId and nodes. Look at your computed:

## const selectedNode = computed(() =>
##   nodes.value.find((node) => node.id === selectedNodeId.value) ?? null
## )

If you instead made it a manual ref and updated it inside selectNode, you'd have to remember to re-sync it in every place that affects the result:

## in selectNode (the id changed) ✓ you'd remember this one
## in clearSelection (set it back to null)
## in regenerate — this is the killer. You swap out the entire nodes array. If a node with the old selected id no longer exists, your manual selectedNode ref would still point at a stale node object that's no longer in the graph. You'd have to manually recompute it there too.

computed makes the staleness impossible: it re-derives from whatever nodes and selectedNodeId currently are, automatically, every time either changes. The manual approach is derived state you have to keep in sync by hand, and the risk is exactly what we discussed in Q2 — silent staleness when you forget one of the update sites.

manual ref would need to be updated in every place that affects state, we may well miss one, computed makes this impossible and acts as the single source of true state


setup-store syntax:

You wrote this as a setup store — defineStore('graph', () => { ... }) with a setup function — rather than the options style (defineStore('graph', { state, getters, actions })). At the bottom you have an explicit return { ... } listing everything.

Two parts: (a) In the setup-store mapping, what role does each piece play — what is the equivalent of state, what is the equivalent of getters, what is the equivalent of actions? (b) What happens if you forget to include something in that final return object — say you leave out clearSelection?

<!-- equivalent of state -->
nodes,
edges,
selectedNodeId,
mode

<!-- equivalent of getters -->
selectedNode
nodeCount,
edgeCount,

<!-- equivalent of actions -->
regenerate,
setMode,
selectNode,
clearSelection,

mode is ref<LayoutMode>('sphere') 

## state = the refs/shallowRefs: nodes, edges, selectedNodeId, mode
## getters = the computeds only: selectedNode, nodeCount, edgeCount
## actions = the plain functions: regenerate, setMode, selectNode, clearSelection
The rule of thumb: how it was declared determines its category, not where it sits in the return list. ref/shallowRef → state, computed → getter, function → action.

Look at seed — you declared it with const seed = ref(1) but you never returned it. That's not a bug, that's a feature: anything you don't return is private to the store. seed is internal state that only regenerate and setMode touch; no component can read or mutate it. That's encapsulation you get for free with setup syntax — the options API can't easily make state private. 

So for "what if you leave out clearSelection": it becomes private, exactly like seed. It's not that the app throws everywhere automatically — it's that store.clearSelection is no longer part of the public API. Because you're in TypeScript strict mode, this is even nicer: store.clearSelection() in a component becomes a compile-time type error ("Property 'clearSelection' does not exist"), caught by vue-tsc before runtime. In plain JS it'd be a runtime store.clearSelection is not a function. TS turns a runtime crash into a build failure — which is half the reason this project is in TS at all.

seed was never returned, on purpose, anything we dont return remains private to the store, seed is internal state only regenerate and setMode touch, no component can mutate seed state. set up syntax grants encapsulation, whereas the options API cant easily make state private

Look at setMode:


function setMode(next: LayoutMode): void {
  if (mode.value === next) return
  mode.value = next
  regenerate(mode.value === 'sphere' ? 300 : 10000)
}

Changing the layout mode regenerates the entire graph. But back in your Phase 2 notes you wrote the principle yourself: "Graph data vs. layout separation — the data model holds node ids and edges. Pixel positions are the renderer's concern, not the domain model's." sphere vs disc is a layout concern — it's about where existing nodes get placed, not about what the graph is. Right now, toggling the view throws away the entire graph and the user's selection and builds a brand new one. If I select a node, switch to disc view to see it differently, my selection and my whole graph vanish. That contradicts the separation principle you set up.

The node counts 300 / 10000 are hardcoded inside a mode switch. Now "which view" and "how many nodes" are welded together. You can't have a 300-node disc or a 10k-node sphere without editing the store.

Good instinct — you've spotted that the node count was never really a property of the mode. Let me give you the mental model, then you write it.

The key realization: "how many nodes" and "which layout" are orthogonal. A sphere can hold 10k nodes; a disc can hold 300. The 300/10000 pairing was a convenience default for demoing each mode, not a rule. So the fix isn't to find a clever home for that mapping — it's to recognize the mapping shouldn't drive the data at all.

Three concerns, cleanly separated:

Concern	Owner	Action
What the graph is (nodes/edges)	store data	regenerate(count)
How many nodes	whoever calls regenerate	a count argument
Where nodes are placed	the renderer (later phases)	reads mode, computes positions
So setMode does exactly one thing — set the mode:


function setMode(next: LayoutMode): void {
  if (mode.value === next) return
  mode.value = next
}
That's it. The renderer (Phase 6+) will watch mode and re-place the existing nodes — positions are a pure function of (nodes, mode). No data thrown away, selection preserved.

Now — where does the "switching to disc usually wants more nodes" behavior go, if you still want it? Not in the store. That's a UI choice, so it lives in the component that owns the buttons (GraphControls.vue, Phase 4). The component can do both calls explicitly:


function showDiscView() {
  store.setMode('disc')
  store.regenerate(10000)
}
Now the coupling is opt-in at the call site and visible, instead of baked into the store. If someone wants a 300-node disc, they just don't make the second call. The store stays dumb and honest; the policy lives in the UI.

The principle to take to the interview: a store action should do one thing and not encode UI policy. setMode setting the mode and secretly regenerating and picking a count is three responsibilities hiding in one function.