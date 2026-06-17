# Final Test -- Cumulative Concept Bank

Pre-interview revision for the Reasoning Graph project. Questions span every phase.
Answer them out loud as if the CTO at Noeon were asking. No answers are written here
on purpose -- if you cannot answer one, that is the gap to close before the interview.

**For future agents**: append a new section per phase you cover. Questions only, no answers.
Cover the core concept, why it exists, and at least one "what breaks if you skip this".

---

## Phase 1 -- Domain types (TypeScript)

1. What is a discriminated union and how does TypeScript narrow it in a switch?
2. What is the `never` exhaustiveness trick and what does it catch at compile time?
3. What is structural typing, and why is `type NodeId = string` not enough to stop you mixing up a NodeId and an EdgeId?
4. What is a branded type and how does the phantom `__brand` property make two string types distinct?
5. Why centralise `as NodeId` casts in helper functions instead of scattering them?

## Phase 2 -- Sample data (TypeScript + algorithms)

1. What does `as const` do, and why is it required for a string array to match a string literal union?
2. What is a seeded PRNG (mulberry32) and why does determinism matter for this project?
3. Why separate graph data (ids, connections) from layout (pixel positions)?
4. When building connected data, why reference `.id` from already-created items rather than constructing id strings by hand?

## Phase 3 -- Pinia store

1. What is the difference in what Vue tracks between `ref` and `shallowRef`?
2. Why is `shallowRef` correct (not just faster) for the nodes/edges arrays, given the update pattern?
3. If you used plain `ref` and mutated a node in place, what does the component do? With `shallowRef`? Describe what the user sees on screen.
4. Why is `shallowRef`'s "stale view over correct data" the dangerous failure mode?
5. Why is `selectedNode` a `computed` and not a manually-updated `ref`? What does `regenerate` swapping the whole array have to do with it?
6. A teammate does `const { nodeCount } = store` and the UI stops updating. Why? What is the fix and why does it work?
7. Why does plain destructuring of a reactive store break reactivity (the "dead copy")?
8. What does `storeToRefs` wrap, and what does it deliberately skip?
9. In a setup store, what is the equivalent of state, getters, and actions?
10. What happens to a binding you declare but never `return` from the setup store? (See `seed`.) Why is that encapsulation the options API can't easily express?
11. Why should `setMode` only set the mode and not regenerate the graph or pick a node count? Which principle does the original version violate?

## Phase 4 -- Vue component shell

1. What does `<script setup>` replace from the Options API, and why is there no `return` or `export default`?
2. In a template, why do you write `count` and not `count.value`?
3. What is the difference between `class="x"` and `:class="x"` (the colon)?
4. How does `:class="{ active: cond }"` object syntax work, and why does the highlight track state without touching the DOM?
5. What does `v-for` do, and why is `:key` required? What is the actual rendering failure mode if the key is missing or unstable?
6. Why call store actions as `store.action()` in the template but pull state through `storeToRefs`?
7. What is a composable and how does it differ from a plain utility function? (useFps)
8. Why read the store directly inside a component instead of prop-drilling state down?

## Phase 5 -- WebGL2 setup (gl-utils, shaders, first render)

### gl-utils.ts
1. What are the three steps to turn a GLSL source string into a usable shader, and why must you check `COMPILE_STATUS` manually instead of relying on an exception?
2. Both shaders compile cleanly but `linkProgram` fails. Name at least three causes that only surface at link time, and state the general rule that explains why (per-stage compile vs. shared-interface link).
3. Why is it safe to `deleteShader` immediately after a successful link, while the program is still in use? What does `deleteShader` actually do at that moment (flag-for-deletion vs. free-now), and why are WebGL objects not handled by JS garbage collection?
4. `bufferData` is never passed the buffer to write into -- only `gl.ARRAY_BUFFER`. How does the data reach the right buffer? Name the pattern (bind-to-edit / global state machine) and the practical bug it invites. What do VAOs do about it?
5. What does the `usage` hint (`STATIC_DRAW` vs `DYNAMIC_DRAW`) tell the driver, and what is the cost of getting it wrong?

### shaders/node.ts (vertex + fragment)
1. `a_corner` and `a_offset` are both plain `in` attributes in the GLSL -- nothing in the shader marks one per-vertex and the other per-instance. Where is that distinction actually set (which JS call, which file), and what is the difference between divisor 0 and divisor 1?
2. If `a_offset` were accidentally left at divisor 0, what exactly would you see on screen, and why (think about which buffer index each instance reads)?
3. What is billboarding? Why must the quad corner be added in view space (after `u_modelView`) rather than world space, and what would the nodes look like under camera orbit if you added it before the view transform?
4. What does `fwidth(d)` measure, and why use it for the AA band instead of a hardcoded constant? Describe the edge artifact at extreme zoom-in AND at extreme zoom-out with a constant.
5. Line `if (fill <= 0.0) discard;` -- the alpha output is already `fill * v_alpha`, so corners would blend to nothing anyway. What does `discard` do that alpha-0 does not (think depth buffer)? Is `discard` free? What is early-Z and how can `discard` defeat it?
6. Walk the full vertex path: how does a node grow in on birth (`age`), pulse when selected (`gl_InstanceID == u_selected`), and breathe globally (`u_breathe`) -- and why is all of this in the vertex shader / GLSL rather than updating buffers from JS each frame?
7. How is the circle drawn out of a square quad (SDF via `length(v_local)`), and why is that cheaper/crisper than using circle geometry or a texture?

## Phase 7 -- Edge rendering (shaders/edge.ts)

1. Why not draw edges with `gl.LINES`? What actually happens with `gl.lineWidth(5.0)` on a modern browser, what is the guaranteed max width, and why is this conformant-to-spec rather than a driver bug (think OpenGL ES spec minimums + D3D/ANGLE)?
2. How is a line segment turned into a quad in the vertex shader? Walk it: interpolate along the line with `a_corner.x`, perspective-divide both endpoints to NDC, build the screen-space normal, offset by pixel width.
3. Why multiply the screen-direction by `u_resolution` before normalizing (and divide the offset by it after)? What artifact appears if you skip the aspect-ratio correction?
4. Line `clipCur.xy += offset * clipCur.w`: why multiply the NDC offset by `w`? What does the GPU do after the vertex shader that this compensates for, and what does line width look like across depth if you forget it?
5. `a_corner` means "geometric quad corner" in node.ts but "(along-line, which-side)" in edge.ts -- same buffer, same name. What does this tell you about what a vertex attribute *is* to the GPU (untyped number stream; semantics live in the shader)? What is the practical risk of sharing one quad buffer across two shaders, and why is it dangerous (silent corruption, no error)?

## Phases 6, 8, 9, 10 -- WebGL architecture (overview level)

1. Instancing: what problem does it solve, and how many draw calls does this app use for 10k nodes + edges? What is the difference between `vertexAttribDivisor(loc, 0)` and `(loc, 1)`?
2. Why is `GraphRenderer` a plain TS class with no reactivity instead of a store/composable? What specifically would Vue's Proxy-based reactivity cost if applied to a GPU buffer, and why would it buy nothing (GPU reads via the WebGL API, not via reactive getters)?
3. What is a VAO and why does it matter for the per-frame draw cost (bind one object vs re-bind every buffer each frame)?
4. Why is camera state (`useCamera`) a composable rather than store state, while graph data lives in the store? What is the rule for deciding store vs composable?
5. `usePicking` adds pointer listeners in `onMounted`. Why must they be removed in `onUnmounted`? Name what leaks (closure -> component scope) and the visible bug under HMR/remount (duplicate listeners). State the general acquire/release rule for composables.
6. GPU picking: explain the second-pass technique end to end -- offscreen framebuffer, render nodes colored by id, `readPixels` one pixel, decode RGB -> id. Why `+1` on the id (what does 0 mean)? Why is this O(1) and better than CPU raycasting? What is its node-count ceiling and why (~16M)?
7. Why are GPU objects disposed manually (`deleteBuffer`/`dispose`) instead of relying on JS garbage collection?
8. WebGL/Vue boundary: give the one-sentence architecture summary of how the imperative graphics layer and the reactive Vue layer stay decoupled.
