# Electric Arc — Config Contract

Proven against source in this repo:

- engine: `packages/three-particles/src/js/effects/electric-arc/electric-arc-{types,config}.ts`
- editor: `src/js/three-particles-editor/entries/electric-arc-entries.ts`, `src/js/three-particles-editor/save-and-load.ts`, `src/js/three-particles-editor.ts`

## 1. Flat config (`ElectricArcConfig`) — field ownership

| field                                                                   | editor writes     | engine reads                                          | serialized | live-updatable                            | structural                          | notes                                                                                                           |
| ----------------------------------------------------------------------- | ----------------- | ----------------------------------------------------- | ---------- | ----------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `start` (x,y,z)                                                         | yes               | yes (`normalizeElectricArcConfig`, `mergeLiveConfig`) | yes        | yes                                       | no                                  | base anchor                                                                                                     |
| `end` (x,y,z)                                                           | yes               | yes                                                   | yes        | yes                                       | no                                  | second anchor                                                                                                   |
| `offset` (x,y,z)                                                        | yes               | **no**                                                | yes        | derived                                   | no                                  | editor-only `end - start` handle                                                                                |
| `rotationZ`                                                             | yes               | yes (`update()` rotates both endpoints)               | yes        | yes                                       | no                                  | whole-arc Z rotation, degrees                                                                                   |
| `startRotation` (x,y,z)                                                 | yes               | **no**                                                | yes        | derived                                   | no                                  | editor read-out: tangent pitch/yaw + `rotationZ`                                                                |
| `endRotation` (x,y,z)                                                   | yes               | **no**                                                | yes        | derived                                   | no                                  | same read-out on the end anchor                                                                                 |
| `color`, `coreColor`                                                    | yes               | yes                                                   | yes        | yes                                       | no                                  | packed to 24-bit linear                                                                                         |
| `thickness`, `speed`, `intensity`, `flickerHz`, `endpointPinning`       | yes               | yes                                                   | yes        | yes                                       | no                                  | CPU backend re-reads `cfg` per frame                                                                            |
| `chaos`                                                                 | yes               | yes                                                   | yes        | yes                                       | no                                  | macro; also re-derives `amplitude`, `coarseKnots`, `microFrequency`, `brightnessVariation`, `branchProbability` |
| `chaosAlgorithm`                                                        | yes               | yes                                                   | yes        | merged                                    | **yes**                             | `ELECTRIC_ARC_STRUCTURAL_FIELDS`                                                                                |
| `segments`                                                              | yes               | yes                                                   | yes        | merged                                    | **yes**                             | same                                                                                                            |
| `quality`                                                               | no (tier input)   | yes                                                   | yes        | merged                                    | **yes**                             | same                                                                                                            |
| `simulationBackend`                                                     | no (AUTO default) | yes                                                   | yes        | merged                                    | **yes**                             | same                                                                                                            |
| `seed`                                                                  | yes               | yes                                                   | yes        | via recreate                              | no                                  | not in `mergeLiveConfig` → harness recreate                                                                     |
| `glow.{enabled,width,intensity,profile}`                                | yes               | yes                                                   | yes        | yes                                       | no                                  | `width` clamped ≥ 1                                                                                             |
| `contact.{enabled,radius,intensity}`                                    | yes               | yes                                                   | yes        | yes                                       | no                                  |                                                                                                                 |
| `lighting.{enabled,endpointIntensity,midpointIntensity,distance,decay}` | yes               | yes                                                   | yes        | yes                                       | `enabled` recreates the light group |                                                                                                                 |
| `sparks.{enabled,rate,lifetime,speed,size}`                             | yes               | yes                                                   | yes        | numeric fields forwarded to child systems | group creation                      | pairs must be length-2                                                                                          |
| `branches.{enabled,maxCount,probability,length,thicknessScale}`         | yes               | yes                                                   | yes        | partial                                   | `createBranches` → recreate         |                                                                                                                 |

Structural set (`electric-arc-config.ts`): `segments`, `quality`, `simulationBackend`,
`chaosAlgorithm` → `touchesStructuralField()` true → `updateConfig()` rebuilds the
internal backend, lighting and spark groups while keeping the public identity.

## 2. Runtime overwrite semantics (proven)

`electric-arc.ts` keeps two endpoint sources:

```text
startDirect / endDirect   ← clones of normalized.start/end at creation,
                            reassigned only by setEndpoints(start, end)
binding                   ← set by bindEndpoints() (Object3D or {object, offset})
```

`resolveEndpoints()` (called from `update()` every frame) copies **`startDirect` /
`endDirect`** (or resolves the binding) into `scratchStart` / `scratchEnd`, then
`normalized.rotationZ` rotates both, then `backend.update(cycle, start, end)`
consumes the scratch vectors. `mergeLiveConfig()` writes `normalized.start/end`,
which are _not_ the same objects as the clones.

Consequences:

1. `updateConfig({ start, end })` alone does **not** move the filament; it only
   refreshes the normalized record used to re-derive `amplitude` on a later
   `chaos` patch. `setEndpoints(start, end)` is the live path.
2. The editor calls both, in this order: `setEndpoints(cfg.start, cfg.end)` then
   `updateConfig({ start, end })` — so authored values and the normalized record
   stay in lock-step and a later `chaos` edit derives `amplitude` from the same
   numbers the filament uses.
3. A host that drives endpoints per frame (e.g. `SceneRoot.tsx` →
   `electricArc.setEndpoints(endA, endB)` from the ribbon terminal frames) makes
   the _effective_ anchors `RUNTIME_DERIVED`; the authored `start`/`end` remain
   the `USER_PERSISTED` seed values.

## 3. Persistent transform model (single-offset contract)

```text
baseStart   = cfg.start                     (persistent)
offset      = end - start                   (persistent handle, derived on refresh)
effectiveEnd= baseStart + offset            (end is stored so the flat JSON stays complete)
rotation    = rotationZ applied to both effective endpoints by the engine
```

- Zero offset reproduces the original absolute behaviour exactly
  (`effectiveEnd === start + (end - start)`).
- Editing an offset axis rewrites that `end` axis; editing an absolute axis
  recomputes `offset`. Both call `endpoint()` → `setEndpoints` + `updateConfig`.
- `startRotation` / `endRotation` are diagnostic read-outs (`.disable()`d in the
  panel): the engine consumes only `rotationZ`, and the filament tangent is fully
  determined by `start`/`end`.

## 4. Panel surface (`createElectricArcEntries`)

| folder                                                  | controllers                                                                                      | kind        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------- |
| `Arc`                                                   | `start.x/y/z`, `end.x/y/z`, `color`, `coreColor`, `thickness`, `speed`, `intensity`, `flickerHz` | editable    |
| `Offset (relative)`                                     | `offset.x/y/z`                                                                                   | editable    |
| `Rotation`                                              | `arc rotation Z (deg)` editable; `start.rot.x/y/z (derived)`, `end.rot.x/y/z (derived)`          | mixed       |
| `Chaos`                                                 | `chaos`, `algorithm` (rebuild), `seed` (rebuild), `endpointPinning`, `segments (rebuild)`        | mixed       |
| `Glow` / `Contact` / `Lighting` / `Sparks` / `Branches` | section fields, structural ones routed to `recreate`                                             | mixed       |
| —                                                       | `Generate JSON report`                                                                           | diagnostics |

`createElectricArcEntries` returns `{ onUpdate }`, and `animate()` runs
`configEntries.forEach(({ onUpdate }) => …)` **before** `particleSystem.update()`,
so the derived offset and tangent read-outs are refreshed against the values the
host just pushed.

## 5. Persistence / serialization

| path                                              | behaviour                                                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `serializeParticleSystemConfig(cfg)`              | arc branch: whole flat config + `_editorData` copy. particle-system branch: diff against `getDefaultParticleSystemConfig()`                                                                       |
| `window.editor.copyToClipboard()`                 | uses `serializeParticleSystemConfig`                                                                                                                                                              |
| save dialog JSON preview                          | uses `serializeParticleSystemConfig` (same bytes as clipboard)                                                                                                                                    |
| `quickSave()` / library                           | stores `getCurrentParticleSystemConfig()` verbatim                                                                                                                                                |
| `window.editor.load(cfg)` / `loadFromClipboard()` | `isConfigV2` accepts `kind === 'electric-arc'` without legacy conversion; `loadParticleSystem` replaces the editor config wholesale with the arc config (no particle-system default keys leak in) |
| `window.__needleArcReport`                        | debug-only snapshot written by the report button; **not** a persistence channel                                                                                                                   |

Why the arc branch is needed: `getObjectDiff(default, cfg)` iterates the keys of
the _particle-system_ default, so a diff-only export drops `kind`, `start`,
`end`, … and the config cannot be re-loaded.

## 6. Engine modification required?

**No.** The engine already consumes every editable field the panel exposes
(`start`, `end`, `rotationZ` + the scalar/section fields) and already rebuilds on
the four structural keys. `offset`, `startRotation`, `endRotation` are
editor-derived and intentionally ignored by `mergeLiveConfig`.

Optional (only if true per-endpoint Euler orientation is ever needed): add
`startRotation` / `endRotation` to `NormalizedElectricArcConfig` +
`mergeLiveConfig` and apply them in the CPU/GPU `update()`. Today the tangent is
fully determined by `start`/`end`, so the read-outs are exact without it.

## 7. Verification map

| check                                             | evidence                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| runtime anchors follow the ribbon                 | `SceneRoot.tsx` `useFrame` → `setEndpoints(endA, endB)` before `update()`         |
| offset survives frame updates                     | `onUpdate` → `refreshDerived()` recomputes from the current `cfg`                 |
| offset survives serialize/reload                  | `__tests__/electric-arc-entries.test.ts` — round-trip + `isConfigV2`              |
| zero offset reproduces original behaviour         | same suite, "zero offset reproduces the authored absolute endpoints"              |
| `rotationZ` still works                           | same suite, `mergeLiveConfig` case + engine `update()` rotation of both endpoints |
| endpoint orientation controls are diagnostic-only | same suite, "mergeLiveConfig ignores editor-only derived fields"                  |
| no control silently resets                        | `endpoint()` writes `cfg` first, then pushes to the engine                        |
