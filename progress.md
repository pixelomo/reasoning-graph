# Project Progress

## Session log

| Session | Date | Duration | Phases completed |
|---------|------|----------|-----------------|
| 1 | 2026-06-12 | ~7 hours | 0, 1, 2 |

---

## Phase status

| Phase | Description | Status | Est. time | Notes |
|-------|-------------|--------|-----------|-------|
| 0 | Scaffold | Done | 0.5h | Claude wrote this per handover spec |
| 1 | Domain types | Done | 3h | Discriminated unions, branded types, never exhaustiveness |
| 2 | Sample data generator | Done | 3.5h | mulberry32 PRNG, node/edge generation, as const |
| 3 | Pinia store | - | 2-3h | shallowRef for large arrays, setup-store syntax |
| 4 | Vue component shell | - | 3-4h | script setup, defineProps, composables |
| 5 | WebGL2 setup and first render | - | 3-5h | Context, shaders, first quad |
| 6 | Instanced rendering of nodes | - | 2-3h | vertexAttribDivisor, drawArraysInstanced |
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
