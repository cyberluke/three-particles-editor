# Electric Arc — Source Map

Chain from authored source to the bytes the browser executes. `public/build/bundle.js`
is generated; the historical monolithic `editor.js` under
`D:\_SATIN_AI\needle-inspector\recovery\**` is evidence-only oracle.

## 1. Editor UI (lil-gui panel) — this repo

```text
src/js/three-particles-editor/entries/electric-arc-entries.ts   createElectricArcEntries()  (panel source)
        ↑ imported by
src/js/three-particles-editor.ts                                createPanel() arc branch · doFullRecreate() arc branch · animate() onUpdate
        ↑ imported by
src/App.svelte  →  src/main.js                                  rollup input
        ↓  rollup -c   (iife, name `app`, terser in prod)
public/build/bundle.js                                          GENERATED — DO NOT EDIT
        ↓  sirv
public/index.html                                               npm start → http://127.0.0.1:5173
```

| Item            | Value                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------- |
| Package         | `@cyberluke/three-particles-editor` (root `package.json`)                                           |
| Build entry     | `rollup.config.js` → `input: 'src/main.js'`, `output.file: 'public/build/bundle.js'`                |
| Canonical build | `npm run build:editor` (SMUI themes + rollup); full: `npm run build`                                |
| Type pass       | `npx tsc -p tsconfig.json --noEmit`                                                                 |
| Unit tests      | `npx jest src/js/three-particles-editor/__tests__` (needs `NODE_OPTIONS=--experimental-vm-modules`) |

## 2. Engine (Electric Arc runtime)

```text
packages/three-particles/src/js/effects/electric-arc/
  electric-arc-types.ts      ElectricArcConfig · NormalizedElectricArcConfig · ElectricArc handle
  electric-arc-config.ts     normalizeElectricArcConfig · mergeLiveConfig · touchesStructuralField
                             ELECTRIC_ARC_STRUCTURAL_FIELDS
  electric-arc.ts            createElectricArc() facade: update · updateConfig · setEndpoints · bindEndpoints
  electric-arc-cpu.ts        CPU backend (scalars read from cfg per frame, endpoints passed in)
  electric-arc-noise/-math/-lighting/-sparks/-contact, webgpu/*
        ↓  tsup  (npm run engine:build)
packages/three-particles/dist/index.js · webgpu.js · chunk-*.js
        ↓  node scripts/sync-public.mjs  (npm run mirror)
public/lib/*, public/three-particles*.js                        GENERATED offline mirrors
```

| Item      | Value                                                                     |
| --------- | ------------------------------------------------------------------------- |
| Package   | `@cyberluke/three-particles` (workspace `file:` dependency of the editor) |
| Build     | `npm run engine:build` → `tsup`                                           |
| Type pass | `npx tsc -p packages/three-particles/tsconfig.json --noEmit`              |

## 3. Runtime consumers

| Consumer                                           | Imports                                                                                                                                            | Role                                                                                                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/js/three-particles-editor.ts` (this repo)     | `createElectricArc`, `ElectricArc`, `ElectricArcConfig` from `@cyberluke/three-particles`; `enableWebGPU` from `@cyberluke/three-particles/webgpu` | `kind === 'electric-arc'` selects the arc branch in `createPanel()` / `doFullRecreate()`; `animate()` drives `configEntries.onUpdate` then `particleSystem.update()` |
| `D:\_SATIN_AI_2\_VIVERRA_AI\1` (Next.js)           | engine only — `src/components/experience/SceneRoot.tsx` (`ElectricArcPair`), `V271GLBSculpture.tsx`                                                | calls `setEndpoints(start, end)` **every frame** from the ribbon terminal frames, then `update()`, then `compute(computeNode)`                                       |
| `D:\_SATIN_AI\needle-inspector` (Chrome extension) | DevTools shell: `src/content.ts` injects `dependencies/editor.js`                                                                                  | shell only — the reconstructed shard closure (`src/editor/**`, `Shard000*`) carries the Needle graph inspector, not the arc panel                                    |

## 4. Oracle probes (`rg --crlf -o`, single-line bundles)

| File                                                                    | bytes      | `electric-arc` | `createElectricArcEntries`                                                  | `setEndpoints` |
| ----------------------------------------------------------------------- | ---------- | -------------- | --------------------------------------------------------------------------- | -------------- |
| `needle-inspector/…/dependencies/editor.js`                             | 15,602,575 | 0              | 0                                                                           | 0              |
| `needle-inspector/recovery/reconstructed/public/dependencies/editor.js` | 15,602,575 | 0              | 0                                                                           | 0              |
| `needle-inspector/recovery/reconstructed/dist/dependencies/editor.js`   | 2,476,499  | 0              | 0                                                                           | 0              |
| `public/build/bundle.js` (this repo, rebuilt)                           | 1,699,545  | 11             | 1 (`Offset (relative)` / `Generate JSON report` / `arc rotation Z` present) | 3              |

The historical bundles pre-date the arc subsystem (they only carry
`startRotation` from the particle-system module), which is why they are used as
oracle evidence and never as the implementation surface.
