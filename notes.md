# Study notes -- training revision

Format per concept: **core idea**, a short **one-liner**, and the **quiz Q&A** that pins it down. Distilled from the build sessions. Full question bank lives in `final-test.md`.

---

# Phase 1 -- Domain types (TypeScript)

## Discriminated unions
A union of object types that all share one field (`kind`) with a unique literal value per variant. Checking that field narrows the whole type.
- **One-liner:** "A regular union says 'one of these types'; a discriminated union adds a shared literal `kind` so TypeScript can narrow to the exact variant in a switch."
- Without a discriminant you can only narrow via `typeof`/`instanceof`. With one, narrowing is instant and precise.

## `never` and exhaustiveness
`never` is the bottom type -- a value that can never exist. Put `assertNever(x: never)` in a switch `default`; once all variants are handled TS narrows the value to `never` there and accepts it. Add a variant without a case and it errors.
```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`)
}
```
- **One-liner:** "The `never` default branch turns 'I forgot a case' into a compile error."

## Structural typing & branded types
TS compares types by shape, not name. `type NodeId = string` is transparent -- any string satisfies it. A brand adds a phantom property that exists only at the type level:
```ts
type NodeId = string & { readonly __brand: 'NodeId' }
```
- **One-liner:** "Branding adds a compile-only phantom field so `NodeId` and `EdgeId` stop being interchangeable strings."
- `__brand` never exists at runtime; it just makes the two types structurally distinct.

## Cast helper functions
`as NodeId` bypasses the type system. Centralise it in one function (`nodeId(raw)`) so the unsafe cast lives in one auditable place and can gain runtime validation later.

---

# Phase 2 -- Sample data (TypeScript + algorithms)

## `as const`
Without it, `['supports','contradicts','derives']` infers as `string[]`, which won't satisfy a string-literal union. `as const` locks it to the readonly literal tuple, so indexing yields a literal type.
- **One-liner:** "`as const` freezes an array to literal types so its values can match a string-literal union."

## Seeded PRNG (mulberry32)
Takes an integer seed, returns a closure producing deterministic floats in [0,1). Same seed -> same sequence -> reproducible graphs.
- **One-liner:** "A seeded PRNG makes the 'random' graph deterministic, so tests and renders are reproducible."

## Graph data vs. layout (the principle that drives later refactors)
The domain model is pure data: ids, fields, connections. Where things appear on screen is the renderer's job. Don't mix layout into the data model.
- **One-liner:** "Data is what the graph *is*; layout is where the renderer *puts* it -- keep them apart."

## Building connected data
When creating relation nodes/edges, reference `.id` off already-created items rather than hand-building id strings -- the type stays correct (`NodeId`) and there's nothing to typo.

---

# Phase 3 -- Pinia store

## `ref` vs `shallowRef`
`ref` deep-tracks (proxies every nested object); `shallowRef` only tracks reassignment of `.value`. Use `shallowRef` for the big `nodes`/`edges` arrays because the update pattern is always whole-array replacement (`nodes.value = ...`), never in-place mutation.
- **One-liner:** "`shallowRef` tracks only `.value` reassignment, which is exactly my update pattern, so I skip the cost of proxying 100k node objects."
- **Q: plain `ref` vs `shallowRef` when you mutate a node in place (`nodes.value[0].label = 'x'`)?**
  A: With `ref` the DOM updates (deep tracking fires). With `shallowRef` the data changes but no reactivity fires -> **stale view over correct data**. That's the accepted trade-off, safe because I never mutate in place.

## `computed` vs manual `ref` (`selectedNode`)
`selectedNode` is a computed deriving from `selectedNodeId` AND `nodes`. A manual ref would be a cache you must re-sync at every mutation site -- the killer is `regenerate`, which swaps the whole array and would leave a stale node reference.
- **One-liner:** "`computed` is the single source of truth for derived state; a manual ref is a cache you're obligated to invalidate and will eventually forget."

## `storeToRefs`
Destructuring a store copies the property's current value into a dead variable (reactivity lived in the store proxy). `storeToRefs` wraps each state/getter in a live `ref`. Actions are destructured straight off the store -- functions need no wrapper.
- **One-liner:** "Plain destructure = dead copy; `storeToRefs` = live ref wrapper. Wrap state/getters, call actions off the store."

## Setup-store mapping & privacy
`ref`/`shallowRef` -> state, `computed` -> getter, `function` -> action. How it's *declared* decides the category. Anything you don't `return` is **private** (e.g. `seed`).
- **One-liner:** "In a setup store, what you don't return is private state -- encapsulation the options API can't easily express; in TS strict, calling an unreturned member is a compile error, not a runtime crash."

## Action single-responsibility (the `setMode` refactor)
Original `setMode` set the mode AND regenerated the graph AND hardcoded counts -- three jobs, and it violated data/layout separation (toggling view nuked the graph + selection). Fixed: `setMode` only sets `mode`. Count is a separate `regenerate(count)`; re-placing nodes on mode change is the renderer's job (Phase 6); "disc usually wants more nodes" is UI policy for `GraphControls` (Phase 4).
- **One-liner:** "A store action should do one thing and not encode UI policy."

---

# Phase 4 -- Vue component shell

## `<script setup>`
No `export default`, no `return`. Every top-level binding (including imported components) is auto-exposed to the template, so no `components: {}` registration.
- **One-liner:** "Imported components are top-level bindings, and `<script setup>` exposes all top-level bindings to the template -- registration disappears."
- In a template you write `count`, not `count.value` -- refs auto-unwrap.

## Attribute binding `:`, `:class` object syntax
No colon = literal string (`type="button"`). Colon = JS expression (`:key="count"`). `:class="{ active: cond }"` applies the class only while `cond` is truthy.
- **One-liner:** "`:` means 'evaluate this as JavaScript'; `:class` object syntax toggles a class declaratively off reactive state, no manual DOM."

## `v-for` and `:key`
`v-for="x in list"` renders one element per item. `:key` gives each item a stable identity.
- **Q: what actually breaks without `:key`?** It still renders; Vue falls back to **index-based patching**. The bug shows when items carry local state (focus, input value, animation) and the list reorders/swaps -- that state binds to the wrong row.
- **One-liner:** "No key -> index patching -> element-local state sticks to the wrong item after a reorder."

## `v-if` vs `v-show`
`v-if` adds/removes the element from the DOM (destroys/recreates child instances, runs lifecycle). `v-show` always renders and toggles CSS `display:none`.
- **One-liner:** "`v-if` is cheaper when rarely shown; `v-show` is cheaper when toggled often."
- `<template v-if>` groups several elements with no wrapper DOM node ("phantom fragment").

## Discriminated-union narrowing in the template (Phase 1 payoff)
Inside `v-if="selectedNode.kind === 'concept'"`, TS narrows `selectedNode` to the concept variant, so `.weight`/`.label` are safe.
- **Q: move `{{ selectedNode.weight }}` outside that block -- what happens?** TS errors: outside the check `selectedNode` is the full union, and `.weight` doesn't exist on every member. `kind` is the discriminant that collapses the union. (Null-narrowing via the `v-if="!selectedNode"` guard is the same machinery for `null`.)

## Composable vs utility (`useFps`)
A composable holds reactive state (`ref`/`computed`) and/or registers lifecycle hooks (`onMounted`/`onUnmounted`); it must be called in `setup`. A utility is pure input->output.
- **One-liner:** "Does it hold reactive state or use lifecycle hooks? Composable. Pure in->out like `getDate()`? Utility. The `use` prefix is just convention."
- In `useFps`, only `fps` is a `ref` (the UI reads it); `frames`/`lastSample` are plain closure vars. Principle: **reactive only what the view consumes.** `tick(now)` is driven from outside -- the composable measures, the renderer drives the loop.

## Return-type annotation is for TS, not Vue
Types are erased at compile time; reactivity is a runtime property of the `ref` object. Deleting the annotation changes nothing at runtime.
- **One-liner:** "The explicit return type is a contract for TypeScript and consumers, not a signal to Vue."

## `defineProps` / `defineEmits`
Compiler macros (no import), only legal at the top level of `<script setup>`. Type-only generic form (`defineProps<{...}>()`) is the idiom in a TS project. Props are read-only.

## Data down, events up
Props flow parent->child (read-only). To change parent/store state, a child `emit`s an event (`defineEmits`) and the **parent** (owner of the store) calls the action.
- **One-liner:** "Props down, events up -- state changes in one direction, so you always know where a change came from."

## Smart vs dumb components (the Phase 4 judgment call)
Read the store directly when the component is app-specific (`GraphControls`, `NodeInspector`, `GraphCanvas`). Take props when it's generic/reusable (`StatsOverlay`).
- **One-liner / decision rule:** "Could this component be reused in a different app? If yes, props. If it only makes sense in this app, read the store directly."

## Template refs
`<canvas ref="canvasEl">` + `const canvasEl = ref<HTMLCanvasElement | null>(null)`. The var name must match the `ref="..."` string.
- It's `null` during `setup` (DOM doesn't exist yet); Vue assigns the real element at **mount** (use it in `onMounted`).
- The `| null` in the type forces a strict-null-check guard (`if (!canvasEl.value) return`) before use in Phase 5.

## Gotcha banked this session
Copying a line from the more-complete reference (`:edge-count="renderedEdges"`) dragged in a variable that didn't exist yet -> type error + runtime crash. **Copying from a fuller reference imports dependencies you don't have.** Fixed to `:edge-count="edgeCount"`.
