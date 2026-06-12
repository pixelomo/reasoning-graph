# Claude Code Handover: Reasoning Graph Visualization

**Repo**: `webgl-node-matrix` -- Vue 3 + TypeScript + Pinia + WebGL2 interactive reasoning graph with instanced rendering and GPU picking.

**Purpose**: deliberate learning project. Aran is building this to internalize Vue 3 Composition API, modern TypeScript, and senior-level WebGL patterns ahead of a Senior Frontend Engineer interview at Noeon Research (Tokyo). The repo is public and will be referenced in his application.

**Current state (2026-06-12)**: Phases 0, 1, and 2 complete. Next up: Phase 3 (Pinia store). See `progress.md` for full status and session log.

---

## Critical operating constraints (read first)

**Aran writes the code. You guide.** This is a learning project, not a delivery task. Every line in this repo needs to be something Aran can explain in a technical interview. If you write it for him, the project fails its purpose.

**Concrete behavior rules**:

1. When Aran asks "how do I do X", explain the concept first. Show a minimal abstracted example (5-10 lines max, not actual project code). Then ask him to write his version. Do not write the project version unless he is stuck after a genuine attempt.

2. When Aran shares code, review it. Point out what is good, what is off, and what could be more idiomatic. Explain why. Let him fix it.

3. Do not write comments in code you produce. Aran writes his own comments as he internalizes each concept.

4. If Aran asks you to "just write it for me", push back once. Remind him the CTO will probe deeply on anything in the repo. If he insists, comply -- but flag the section as "rewrite this in your own understanding before committing."

5. Avoid em dashes in any prose you produce (README, docs, commit messages). Aran considers them an AI tell.

6. Commits should be small and frequent, per concept not per session. Commit messages should reflect what was learned or built.

7. **Quiz before commit (added session 1)**: every phase has two parts -- BUILD (Aran writes the code) and QUIZ (you quiz him verbally on the concepts, one question at a time). Aran must pass the quiz before committing the phase work. If he cannot explain a pattern in an interview, it is a liability. The quiz for each phase should cover: the core concept, why it exists, and at least one "what goes wrong if you skip this" question.

**Context about Aran**: strong WebGL and creative coding background (Three.js, custom shaders, raymarching, Gaussian splatting). Has been working in React/Next.js and hasn't coded actively for ~3 years -- syntax memory is rusty but concepts come back quickly. TypeScript is new to him but he is picking it up fast. Vue 3 Composition API and Pinia are the primary knowledge gaps alongside WebGL instancing and GPU picking internals.

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Build tool | Vite 6 | Vue's modern default, fast HMR, native ESM |
| Framework | Vue 3 `<script setup>` | The role's primary requirement |
| State | Pinia, setup-store syntax | Modern Vue state |
| Language | TypeScript strict mode | Forces the discriminated union patterns Aran needs to internalize |
| Styling | Vanilla CSS, minimal | Don't get distracted by Tailwind; keep focus on Vue+TS+WebGL |
| Rendering | Raw WebGL2 (not Three.js) | Three.js abstracts away the instancing and picking primitives Aran needs to internalize |
| Testing | Vitest + @testing-library/vue + MSW | Modern Vue testing stack |
| Linting | ESLint 9 flat config + Prettier | Mandatory in any senior codebase |
| CI | GitHub Actions | Listed as essential in the role spec |

Three.js can come later as `feat/threejs-comparison` but main must be raw WebGL2.

---

## Project structure

```
src/
  domain/
    types.ts          -- discriminated unions for Node, Edge; branded NodeId/EdgeId
    sample-data.ts    -- deterministic graph generator (mulberry32 PRNG)
  stores/
    graph-store.ts    -- Pinia setup store (Phase 3)
  composables/
    useCamera.ts      -- pan/zoom state (Phase 8)
    usePicking.ts     -- GPU picking logic (Phase 9)
  webgl/
    renderer.ts       -- WebGL2 setup, render loop
    shaders/          -- node.vert/frag, edge.vert/frag, picking.vert/frag
    instancing.ts     -- per-instance buffer setup
  components/
    GraphCanvas.vue   -- the WebGL canvas component
    NodeInspector.vue -- sidebar for selected node
    GraphControls.vue -- pan/zoom/regenerate buttons
    StatsOverlay.vue  -- FPS, node count
  App.vue
  main.ts
tests/
  domain/
  stores/
  components/
```

---

## Remaining phases

Each phase: BUILD section (Aran writes), then QUIZ section (must pass before committing).

### Phase 3: Pinia store

**Learning objective**: Pinia setup-store syntax, reactivity choices (`ref` vs `shallowRef`).

Teach before Aran writes:
- Setup-store syntax: `defineStore('graph', () => { ... })`
- Why `shallowRef` matters for large `nodes` and `edges` arrays (deep reactivity on 10k objects is expensive)
- Returning state as refs, actions as plain functions, derived values as computeds
- `storeToRefs` for consumers

Guide Aran to write `useGraphStore` with:
- `shallowRef<Node[]>` for nodes, `shallowRef<Edge[]>` for edges
- `selectedNodeId` as `ref<NodeId | null>(null)`
- computed `selectedNode` that finds node by id
- Actions: `regenerate(count)`, `selectNode(id)`, `clearSelection()`

**Quiz topics**: what is shallow reactivity and why does it matter at scale; what does `storeToRefs` do and why is it needed; what is the difference between a ref and a computed.

**Commit**: `feat: Pinia graph store with shallow reactivity`

### Phase 4: Vue component shell

**Learning objective**: `<script setup>`, `defineProps` with TS, composables.

Have Aran build:
- `App.vue` with layout (canvas area + sidebar)
- `GraphControls.vue` (regenerate button)
- `NodeInspector.vue` (shows selected node details, uses store)
- `StatsOverlay.vue` (FPS counter and node count)
- `GraphCanvas.vue` (placeholder canvas element)
- At least one composable: `useFps()` is a good starting point

**Quiz topics**: what is `<script setup>` and what does it replace; why use the store directly in a component rather than prop-drilling; what is a composable and how does it differ from a utility function.

**Commit**: `feat: Vue component shell with store integration`

### Phase 5: WebGL2 setup and first render

**Learning objective**: WebGL2 basics, vertex/fragment shaders, attribute and uniform binding.

Walk through:
- Getting a WebGL2 context from the canvas
- Compiling a vertex + fragment shader pair
- Linking a program
- Creating a vertex buffer for one quad (6 vertices, 2 triangles)
- Drawing one quad in the middle of the screen

Do not jump to instancing yet. Get one quad rendering first.

**Quiz topics**: what does a vertex shader do vs a fragment shader; what is a buffer and why do you need one; what is a uniform vs an attribute.

**Commit**: `feat: WebGL2 context with single-quad render`

### Phase 6: Instanced rendering of nodes

**Learning objective**: the instancing mental model.

Key concepts:
- One geometry buffer (the unit quad)
- One per-instance attribute buffer: position, color, scale, id for each node
- `gl.vertexAttribDivisor(loc, 1)` advances once per instance not per vertex
- `gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, nodeCount)` draws all N in one call

Have Aran benchmark 1k, 10k, 100k nodes. Watch FPS in StatsOverlay.

**Quiz topics**: what problem does instancing solve; what does vertexAttribDivisor do and what happens if you forget it; why is one draw call better than N draw calls.

**Commit**: `feat: instanced rendering of nodes`

### Phase 7: Edge rendering

**Learning objective**: applying instancing to a different primitive.

Edges as thin instanced quads (not `gl.LINES` -- line width is unreliable across platforms). Each instance: start position, end position, color.

**Quiz topics**: why not use gl.LINES; how do you represent a line segment as a quad in the vertex shader.

**Commit**: `feat: instanced edge rendering`

### Phase 8: Pan and zoom

**Learning objective**: `useCamera` composable, MVP matrix math, mouse events in Vue.

Have Aran build:
- `useCamera()` composable returning reactive `{ position, zoom, viewMatrix }`
- Mouse drag to pan, wheel to zoom
- View matrix as a uniform in shaders

**Quiz topics**: what is a view matrix; why is pan/zoom a composable rather than store state; what is the difference between world space and screen space.

**Commit**: `feat: pan and zoom with camera composable`

### Phase 9: GPU picking

**Learning objective**: the second-pass picking technique. This is the showpiece of the project.

Key concepts:
- Offscreen framebuffer with a color attachment
- Second shader pair: outputs node id encoded as RGB -- `vec3(id & 255, (id >> 8) & 255, (id >> 16) & 255) / 255.0`
- On click: bind picking framebuffer, render with picking shaders, `gl.readPixels` one pixel at mouse position, decode RGB back to id
- Update store `selectedNodeId`

Take this phase slowly. Aran will likely need to write the framebuffer setup more than once before it clicks.

**Quiz topics**: why not use raycasting for picking; what is a framebuffer; how does encoding an id as RGB work and why is it limited to ~16 million nodes; what does readPixels return.

**Commit**: `feat: GPU picking for node selection`

### Phase 10: Animations

**Learning objective**: requestAnimationFrame loop with reactive state, GLSL animation.

Add:
- Newly added nodes fade in over 300ms (per-instance birth time attribute, fragment shader fades based on `time - birthTime`)
- Selected node gets a pulsing outline (sine wave in fragment shader)
- Pass `time` as a uniform each frame

**Quiz topics**: how do you pass per-instance data that changes over time; what is a uniform and how often does it update; why use GLSL for animation rather than updating buffers every frame.

**Commit**: `feat: node appearance and selection animations`

### Phase 11: Testing

**Learning objective**: Vitest, Vue Test Utils, Testing Library philosophy.

Write:
- `types.test.ts`: discriminated union variants construct correctly, `describeNode` covers all cases
- `graph-store.test.ts`: regenerate, select, clear, selectedNode computed
- `NodeInspector.test.ts`: renders nothing with no selection, renders correct info when selected (use @testing-library/vue, query by accessible roles not class names)

Do not let Aran skip this. The mindset shift matters.

**Quiz topics**: what is the difference between @testing-library/vue and @vue/test-utils philosophies; why query by role rather than class name; what does a test for a Pinia store actually test.

**Commit**: `test: domain types, store, and inspector component`

### Phase 12: GitHub Actions CI

**Learning objective**: CI pipeline from scratch.

Create `.github/workflows/ci.yml`:
- Runs on PR and main push
- Separate jobs: lint, type-check, test, build
- `actions/setup-node` with built-in cache
- Concurrency to cancel old runs
- Status badge in README

**Quiz topics**: why separate jobs vs one job with multiple steps; what does the concurrency block do; what is a cache key in CI and why does it matter.

**Commit**: `ci: GitHub Actions pipeline with lint, type-check, test, build`

### Phase 13: README and polish

Use the README template in the original handover for structure. Add screenshots or a GIF of the graph at 10k and 100k nodes with the FPS counter visible. The performance story should be concrete and visual.

**Commit**: `docs: README and project polish`

---

## Stretch goals (after Phase 13)

- `feat/threejs-comparison`: same app with Three.js `InstancedMesh`, documented comparison in `COMPARISON.md`
- `feat/webgpu`: WebGPU version with on-GPU force-directed layout via compute shader
- Playwright E2E test for the full select-a-node flow

---

## Commit message conventions

Conventional Commits format:
- `feat:` new feature
- `fix:` bug fix
- `refactor:` no behavior change
- `test:` tests only
- `docs:` docs only
- `chore:` build/tooling
- `ci:` CI config

Bodies optional but encouraged for non-trivial commits explaining the design decision or what was learned.
