# Project Progress

## Session log

| Session | Date | Duration | Phases completed |
|---------|------|----------|-----------------|
| 1 | 2026-06-12 | ~7 hours | 0, 1, 2 |
| 2 | 2026-06-16 | ~8 hours | 3, 4 |

---

## Working agreement (session 2)

- **Reference-driven**: every phase is based on the matching file in `reference/`. That dir is the answer key / target implementation.
- **Open-book teaching**: walk through the reference concept by concept, then Aran recreates it in `src/`. Faster than blind discovery; the quiz still proves the concept landed.
- **Quiz after every section**: still mandatory. The quiz proves the concept landed; verbatim copying does not.
- **`final-test.md`**: cumulative question bank across Phases 1-13. Each agent appends questions for the phases it covers. Aran's self-check revision doc.

## Phase status

| Phase | Description | Status | Est. time | Notes |
|-------|-------------|--------|-----------|-------|
| 0 | Scaffold | Done | 0.5h | Claude wrote this per handover spec |
| 1 | Domain types | Done | 3h | Discriminated unions, branded types, never exhaustiveness |
| 2 | Sample data generator | Done | 3.5h | mulberry32 PRNG, node/edge generation, as const |
| 3 | Pinia store | Done | 2-3h | shallowRef for large arrays, setup-store syntax |
| 4 | Vue component shell | Done | 3-4h | script setup, defineProps, composables, template refs, data-down/events-up, smart vs dumb. GraphCanvas is a Phase-4 placeholder (no WebGL yet); grow toward reference across Phases 5-10 |
| 5 | WebGL2 setup and first render | - | 3-5h | Context, shaders, first quad |
| 6 | Instanced rendering of nodes | - | 2-3h | vertexAttribDivisor, drawArraysInstanced. NOTE: renderer must re-place existing nodes when `mode` changes (layout is a pure function of nodes + mode); `setMode` no longer regenerates data |
| 7 | Edge rendering | - | 1-2h | Same instancing pattern, different primitive |
| 8 | Pan and zoom | - | 2-3h | useCamera composable, view matrix uniform |
| 9 | GPU picking | - | 3-5h | Offscreen framebuffer, readPixels, id encoding |
| 10 | Animations | - | 1-2h | requestAnimationFrame, time uniform, GLSL fade |
| 11 | Testing | - | 2-3h | Vitest, @testing-library/vue, MSW |
| 12 | GitHub Actions CI | - | 1h | lint, type-check, test, build jobs |
| 13 | README and polish | - | 1-2h | Screenshots, performance table, final write-up |

**Remaining estimate: 21-33 hours (~4-5 sessions)**

---

## Concepts covered

### Phase 1 -- TypeScript

- **Discriminated unions**: a union of object types sharing a `kind` field with a unique literal value per variant. TypeScript narrows the full type when you check `kind` in a switch.
- **`never` exhaustiveness**: `assertNever(x: never)` in the default branch. If all variants are handled, TypeScript infers `never` there and is happy. Add an unhandled variant and it errors.
- **Structural typing**: TypeScript compares types by shape, not name. `type NodeId = string` is transparent -- any string satisfies it.
- **Branded types**: `string & { readonly __brand: 'NodeId' }` adds a phantom property that only exists at the type level, making `NodeId` and `EdgeId` structurally distinct.
- **Cast helper functions**: centralise the `as NodeId` assertion in one place. Easier to validate later, easier to audit.

### Phase 2 -- TypeScript and algorithms

- **`as const`**: tells TypeScript an array contains literal types, not `string`. Required for array values to match a string literal union.
- **Seeded PRNG (mulberry32)**: a function that takes a seed integer and returns a deterministic sequence of floats in [0, 1). Same seed, same graph every time.
- **Graph data vs. layout separation**: the data model holds node ids and edge connections. Pixel positions are the renderer's concern, not the domain model's.
- **Building connected data**: when creating `relation` nodes or edges, reference `.id` from already-created items in the array rather than constructing id strings by hand.

### Phase 3 -- Pinia store

- **`ref` vs `shallowRef`**: `ref` deep-tracks (proxies every nested object); `shallowRef` only tracks `.value` reassignment. Use `shallowRef` for the large `nodes`/`edges` arrays because the update pattern is whole-array replacement, never in-place mutation. Cost accepted: in-place mutation of a node will not trigger re-render (stale view over correct data).
- **`computed` vs manual `ref`**: `selectedNode` is a computed so it auto-derives from both `selectedNodeId` and `nodes`. A manual ref would be derived state you must re-sync at every mutation site (esp. `regenerate`, which swaps the whole array) -- forget one and you get a stale node reference.
- **`storeToRefs`**: destructuring a store copies the property's current value into a dead variable (reactivity lived in the store proxy). `storeToRefs` wraps each state/getter in a live `ref`; actions are destructured straight off the store (functions need no wrapper).
- **Setup-store privacy**: anything not returned from the setup function is private. `seed` is declared but never returned -- only `regenerate`/`setMode` touch it. Setup syntax gives encapsulation the options API can't easily express. In TS strict mode, calling an unreturned member is a compile-time error, not a runtime crash.
- **Action single-responsibility (refinement, session 2)**: `setMode` originally set the mode AND regenerated the graph AND hardcoded node counts (300/10000) -- three responsibilities and a violation of data/layout separation. Now it only sets `mode`. UI policy ("disc view usually wants more nodes") belongs at the call site in `GraphControls.vue` (Phase 4), and re-placing existing nodes on mode change belongs to the renderer (Phase 6).

### Phase 4 -- Vue component shell

- **`<script setup>`**: no `export default`/`return`; top-level bindings (incl. imported components) auto-expose to the template, so no `components: {}` registration. Refs auto-unwrap in templates.
- **Template binding**: `:` = JS expression vs literal string; `:class="{ active: cond }"` toggles a class off reactive state declaratively.
- **`v-for` + `:key`**: without a key Vue falls back to index patching; element-local state binds to the wrong row after a reorder.
- **`v-if` vs `v-show`**: `v-if` adds/removes from DOM (lifecycle runs); `v-show` toggles CSS. `<template v-if>` groups with no wrapper node.
- **Discriminated-union narrowing in templates**: `v-if="node.kind === 'concept'"` narrows the union so variant fields are type-safe -- the Phase 1 payoff. Same machinery as strict null-narrowing on template refs.
- **Composable vs utility**: composable holds reactive state / lifecycle hooks, called in `setup`; utility is pure in->out. `useFps`: only `fps` is a ref; `tick(now)` driven externally by the render loop.
- **Return-type annotations are for TS, not Vue**: types are erased at runtime; reactivity is a runtime property of the `ref`.
- **`defineProps`/`defineEmits`**: compiler macros, no import, top-level `<script setup>` only. Props read-only. Type-only generic form is the TS idiom.
- **Data down, events up**: child emits, parent (store owner) acts. One-way flow.
- **Smart vs dumb components**: app-specific -> read store directly (`GraphControls`, `NodeInspector`, `GraphCanvas`); generic/reusable -> props (`StatsOverlay`). Rule: "could it be reused in another app?"
- **Template refs**: `null` during setup, assigned at mount; `| null` in the type forces a strict-null guard before WebGL use (Phase 5).
