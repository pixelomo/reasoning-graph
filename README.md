# Reasoning Graph Visualization
<img width="1406" height="915" alt="Screenshot" src="https://github.com/user-attachments/assets/09a6216c-faa8-4e0b-b251-dee59570ffe4" />
A Vue 3 + TypeScript + WebGL2 application that renders interactive reasoning graphs with instanced rendering and GPU picking. It has two views over the same data: a rotating low-poly **sphere** wireframe, and a flat **graph** that scales to hundreds of thousands of nodes. Both run on raw WebGL2, with one draw call for all nodes and one for all edges.

[Live demo](https://reasoning-graph-one.vercel.app/)

## The two views

- **Sphere** — nodes are placed on a Fibonacci sphere and connected to their nearest neighbours to form a low-poly triangulated wireframe. It rotates slowly, breathes, and is coloured by a position-based pink-to-blue gradient. Good at 40 to 1,000 nodes.
- **Graph** — a flat phyllotaxis layout of the full generated graph (concepts, rules, relations connected by supporting, contradicting and deriving edges). Built to push instanced rendering to 100k+ nodes.

Drag to orbit, scroll to zoom, click any node to inspect it. Selection is resolved with a GPU picking pass, so hit testing stays cheap no matter how many nodes are on screen.

## Highlights

- Vue 3 Composition API with `<script setup>` throughout
- Pinia setup stores, using `shallowRef` for the large node and edge arrays so reactivity stays cheap at scale
- TypeScript discriminated unions for node and edge kinds, with compile-time exhaustiveness via a `never` check
- Raw WebGL2, no Three.js: instanced billboards draw every node in a single `drawArraysInstanced` call, edges in another
- A 3D pipeline (mat4 model-view-projection, camera-facing billboards, screen-space constant-width edges with per-edge gradient)
- GPU picking: a second render pass encodes each instance id into a colour, then a single `readPixels` at the cursor decodes the hit
- Orbit and zoom implemented as a `useCamera` composable
- Per-instance birth-time animation and a pulsing selection ring, driven by a `time` uniform in GLSL
- Vitest unit and component tests, plus a GitHub Actions CI pipeline

## Architecture

```
src/
  domain/      discriminated-union types, branded ids, deterministic sample-data generator
  stores/      Pinia graph store (nodes, edges, selection, view mode)
  composables/ useCamera, useFps, usePicking
  webgl/       renderer, instancing helpers, mat4 math, layout (sphere + graph), GLSL shaders
  components/  GraphCanvas, NodeInspector, GraphControls, StatsOverlay
```

The domain model holds only graph data (ids and connections). Positions are derived separately in the layout step, so the data model stays independent of how it is drawn.

## Performance

Measured in Chrome on an Apple M4 Max. Numbers are steady-state render frame rate.

| View   | Nodes   | FPS |
| ------ | ------- | --- |
| Sphere | 1,000   | 75  |
| Graph  | 1,000   | 120 |
| Graph  | 10,000  | 120 |
| Graph  | 100,000 | 20  |
| Graph  | 250,000 | 8   |

In the graph view at 100k nodes the workload is fill-rate bound (translucent overdraw from the edges and the dense centre), not vertex or draw-call bound: the whole frame is still two instanced draw calls.

## Running locally

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run type-check   # vue-tsc
npm run lint         # eslint
npm run test:run     # vitest
npm run build        # type-check + production build
```

## Tech

Vue 3, TypeScript (strict), Pinia, Vite, raw WebGL2, Vitest, GitHub Actions.

## What I would add next

- Per-node morphing on the sphere so edges flex and reshape over time
- WebGPU version with on-GPU force-directed layout using compute shaders
- Edge bundling for visual clarity at high node counts
- Keyboard navigation and screen-reader announcements for the selection layer
```
