# Electric Arc — Persistent Endpoint Transform Contract (engine ≥ 4.1.2)

## 1. Two layers, one renderer

| Layer                          | Fields                                                                  | Written by                                                    |
| ------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Runtime base anchors**       | `start` / `end` (via `setEndpoints()` / `bindEndpoints()`)              | host each frame (ribbon terminal frames) or standalone config |
| **Persistent user transforms** | `startOffset`, `endOffset`, `startRotation`, `endRotation`, `rotationZ` | editor / serialized config                                    |

Every frame the engine resolves the base anchors, then composes the effective
endpoints:

```text
effective = base + R(endpointRotation) · offset      (in the ENDPOINT_FRAME_LOCAL basis)
```

`rotationZ` (whole-arc roll, degrees) is applied **after** the per-endpoint
composition, to both effective endpoints — exactly as before 4.1.2, so
existing scenes are unchanged.

The CPU and WebGPU backends both receive the _effective_ endpoints; arc
generation is not duplicated.

## 2. Coordinate space: ENDPOINT_FRAME_LOCAL

The shared per-frame chord frame is built from the **base** anchors:

```text
N = normalize(baseEnd - baseStart)        (tangent)
U = N × helper                            (helper = +Y, or +X if N ≈ ±Y)
V = N × U
```

Offset components map onto this basis: `x → U`, `y → V`, `z → N` (tangent).
Degenerate zero-length chord: `N=(0,0,1)`, `U=(1,0,0)`, `V=(0,1,0)`.
Rotations are Euler `pitch/yaw/roll` in **degrees** (`XYZ` order), applied to
the offset vector. With a zero offset the rotation is unobservable (the arc
tangent is fully determined by the two effective endpoints).

## 3. Config surface

`ElectricArcConfig` additions (all optional):

```ts
startOffset?: Point3D | THREE.Vector3; // default {0,0,0}
endOffset?: Point3D | THREE.Vector3;   // default {0,0,0}
startRotation?: EndpointRotation;      // { pitch?, yaw?, roll? } deg, default 0
endRotation?: EndpointRotation;        // { pitch?, yaw?, roll? } deg, default 0
```

`NormalizedElectricArcConfig` stores them **non-optional and resolved**:
`startOffset`/`endOffset` as `THREE.Vector3` (zero default), rotations as
`{ pitch, yaw, roll: number }`.

`rotationZ` keeps its pre-4.1.2 meaning: global whole-arc roll in degrees
around Z, applied after the local composition. It is _not_ reinterpreted.

## 4. Live updates (`mergeLiveConfig` / `updateConfig`)

- `startOffset`, `endOffset`, `startRotation`, `endRotation` are merged in
  place: partial patches keep unspecified components; `NaN` components keep
  the previous value.
- All are **non-structural** (`touchesStructuralField` = `false`): no backend
  rebuild. Structural keys stay `segments`, `quality`, `simulationBackend`,
  `chaosAlgorithm`.

## 5. `setEndpoints()` semantics

`setEndpoints(start, end)` updates **only** the base runtime anchors. It
never resets the persistent offsets/rotations, so user transforms survive
continuous ribbon updates and repeated frames.

## 6. Readback API (read-only diagnostics)

`getRuntimeEndpoints()` returns plain snapshots:

```ts
{
  baseStart, baseEnd,           // last resolved anchors (pre-composition)
  effectiveStart, effectiveEnd, // after offsets + rotationZ
  startFrame, endFrame,         // { tangent, normal, binormal } world vectors
}
```

The editor displays these; it must not write them back.

## 7. Modes

- **Standalone**: config `start`/`end` are the base anchors → persistent
  transforms → effective endpoints.
- **Ribbon-tied**: host calls `setEndpoints()` (or `bindEndpoints`) each
  frame with ribbon terminal-frame positions; the same composition follows.

## 8. Backward compatibility

Configs containing only `start`, `end`, `rotationZ` behave byte-for-behavior
identical to 4.1.1 (zero transforms reduce the composition to a copy; test
`zero transforms reproduce legacy output exactly`). No migration of legacy
serialized fields is required; `offset` (editor-relative chord) remains a
derived, non-serialized engine value.

## 9. Serialization

Persistent fields serialize with the normal flat config
(`kind: 'electric-arc'`): `startOffset`, `endOffset`, `startRotation`,
`endRotation`, `rotationZ`. Runtime-derived values (`baseStart`, frames, …)
are not serialized. Round trip `config → JSON → reload → same effective
behavior` is covered by tests.

## 10. Performance

Per-frame composition is allocation-free after construction: reused
`Vector3`/`Euler`/`Matrix4` scratch, `addScaledVector` accumulation, no JSON
cloning in `update()`. `getRuntimeEndpoints()` allocates small plain objects
(diagnostics path only). `setEndpoints()` allocates its two anchor vectors
as before. The Electric Arc hot-loop profile (centerline, knots, flicker) is
untouched.
