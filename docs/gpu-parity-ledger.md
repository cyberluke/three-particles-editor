# GPU Parity Ledger — oracle 9740f96 vs GPU-only 8d0591d (+rescue)

Oracle: `9740f964c9c4b9550e622dc9da0b560f1cdd896e` (worktree `three-particles-oracle-9740f96/`).
Current engine branch `kelvin/webgpu-editor-fix` @ 8d0591d + this rescue.

Oracle executable sources of truth:
- CPU loop: `three-particles-oracle-9740f96/src/js/effects/three-particles/three-particles.ts` (`activateParticle`, shadow-orbital block, `initVelocityLifetimeData`, `initRotationLifetimeValues`)
- Modifiers: `three-particles-modifiers.ts` (`applyModifiers`)
- Forces: `three-particles-forces.ts` (`applyForceFields`)
- Shape math: `three-particles-utils.ts` (`calculateRandomPositionAndVelocityOn*`)
- Oracle GPU kernel: `three-particles-oracle-9740f96/.../webgpu/compute-modifiers.ts` (emit-init via CPU-written slots, sim kernel 640–1021)

| Feature | Oracle 9740f96 behavior | 8d0591d GPU behavior | Status | Source locations | Action |
|---|---|---|---|---|---|
| SPHERE position | θ=2π·u·(arc/360), φ=acos(2v−1), d=r·(1−t+t·ratio) | Same | PASS | oracle utils.ts 34–76; current compute-modifiers.ts shapeEmitNodes | none |
| SPHERE velocity | dir·speed (pos·1/\|pos\|·speed) | Same | PASS | utils.ts 69–75 / shapeEmitNodes vS* | none |
| CONE position | disc (cosθ,sinθ,0)·d, d same as sphere | Same | PASS | utils.ts 104–151 | none |
| CONE velocity | (dir·sin(nA), sin(nA)·? , cos(nA))·speed, nA=(\|pos\|/r)·angle_rad | Same | PASS | utils.ts 138–150 | none |
| CIRCLE position | disc (pBx,pBy,0) | **fell through to BOX planar position** | FAIL→FIXED | utils.ts 253–289 vs current `discX = isConeKind.select(pBx, planeX)` chain | dispatch chain now `isDiscKind.select(disc, plane)` |
| CIRCLE velocity | radial dir·speed, z=0 | Same | PASS | utils.ts 281–288 | none |
| RECTANGLE position | xOff·cos ry, yOff·cos rx, xOff·sin ry − yOff·sin rx | Same | PASS | utils.ts 315–337 | none |
| RECTANGLE/BOX velocity | (0,0,speed) | Same (vPlaneZ) | PASS | utils.ts 225,335 | none |
| BOX VOLUME/SHELL/EDGE | side=floor(r·6), pa=side%3, a0=side>2, 4-edge lattice | Same lattice math | PASS | utils.ts 180–227 | none |
| Shape config decode | nested `shape.sphere…` | nested decode (kept) | PASS | tsl-materials.ts encodeShapeEmitParams | none |
| cone.angle default | 90 (utils.ts `angle = 90`) | 25 fallback in encoder | FAIL→FIXED | encoder line `num(cone?.angle, 25)` | fallback → 90 (config default 25 still honored explicitly) |
| LOCAL sim space | buffer=local; three applies matrixWorld; wrapper quat identity | Same | PASS | oracle 2617–2623 | none |
| WORLD sim space | buffer=world: pos+scale·off+translation, wrapper=worldQuat | Same (emitterPose uniforms) | PASS | oracle 1609–1624, 2599–2616 | none |
| LOCAL gravity | −g ĵ rotated by inverse world quat, divided per world-scale axis | only .y divided | FAIL→FIXED | oracle 2648–2660 vs current ~1621 | per-axis division |
| startLifetime/startSpeed constant | passthrough (n,n) | Same | PASS | pair()` in tsl-materials |
| startX random ranges (lifetime/speed/size/opacity/rotation/color/frame) | `randFloat(min,max)` per particle at birth | per-particle `mix(min,max,rand)` in emit kernel | PASS | oracle calculateValue; current rnd() streams | none |
| linear velocity — constant axis | per-particle `speed` (const) → pos += v·dt | flat baked curve → same number | PASS (equal for constants) | oracle modifiers 123–144 / bakeVelocityAxisIntoBuffer | keep flat value, now via per-particle store |
| linear velocity — random range axis | per-particle fresh rand in range | **flat mid-point for ALL particles** | FAIL→FIXED | current curve-bake.ts 149–167 | per-particle sampled at birth, stored in state; see §"velocity axes storage" |
| orbital velocity — ranges | per-particle fresh rand | flat mid-point | FAIL→FIXED | same | per-particle at birth |
| orbital pivot + Euler | off=shape offset; pos−=off; Euler(sx·dt, sz·dt, sy·dt) 'XYZ' → intrinsic apply = R = RxRyRz ⇒ apply Z first, then Y, then X; mutate off; pos+=off | **X first, then Y, then Z** (reversed) | FAIL→FIXED | oracle modifiers 146–179 + oracle GPU 868–907 | re-sequenced Z→Y→X, offset mutation kept |
| sizeOverLifetime | startSize·curve(t) | s·sv.y | PASS (same) | oracle modifiers 186–196 | none |
| opacityOverLifetime | startOpacity·curve(t) | op·sv.z | PASS | modifiers 198–208 | none |
| colorOverLifetime | startColor·per-channel multiplier | `lookupCurve(...).mix(col.x, lifePct)` interpolation | FAIL→FIXED | modifiers 210–239 / oracle GPU 931–955 | `start·curve` per channel with per-channel index guard |
| rotationOverLifetime speed | separate `randFloat(cfg.min,cfg.max)` per particle; rotation += speed·delta·0.02 | **reuses startRotation min/max; missing 0.02** | FAIL→FIXED | oracle 1002–1015, 1577–1582; modifiers 241–244 | separate rotOL min/max uniforms + `*0.02` |
| noise input | np=(t+offset)·10·strength; X:(np,0,0) Y:(np,np,0) Z:(np,np,np); FBM scale=frequency, octaves, /fbmMax; noisePower=0.15·strength/fbmMax | p3=pos·freq with 31.41/13.11… decorrelation; noisePower double-divided by fbmMax | FAIL→FIXED | modifiers 246–287; oracle GPU 964–1000; three-noise FBM.get3 (public/lib/three-noise.module.js 533–558) | oracle-shaped FBM: per-octave t=(np)·f·2^k, amplitudes 0.5^k, ÷fbmMax; noisePower=0.15·S applied once |
| noise rotation/size amounts | nsX·pow·rotAmount / ·sizeAmount | Same | PASS | modifiers 267–274 | none |
| force fields POINT | d=‖field−pos‖; skip d<1e-4; skip d>range; falloff 1 / 1−d/r / 1−(d/r)² (range∞ ⇒ 1); v+=dir·s·falloff·dt | Same | PASS | oracle forces.ts 10–51; compute-force-fields TSL | none |
| force fields DIRECTIONAL | v+=dir·s·dt | Same | PASS | forces.ts 53–63 | none |
| collision planes | KILL/CLAMP/BOUNCE, projection, reflect·dampen, lifetimeLoss·startLife (ms) via 1000 | Same | PASS | oracle compute-collision-planes.ts; oracle collision helper | none |
| bursts | cycles/interval/probability, floor(count) | Same | PASS | oracle 3120–3170; current burst block | none |
| rateOverDistance | distance accumulated from world-position delta | **never updated (stuck 0)** | FAIL→FIXED | oracle 2584–2637; current 1646–1658 | per-frame scalar delta added |
| TRAIL ribbon semantics | ring history, minVertexDistance adaptive, maxTime, width/opacity/color-over-trail curves, head=newest | same math in ribbon kernel, BUT float-`toAtomic` storage | FAIL→FIXED | oracle 3405+; current createTrailRibbonUpdate + trail sim block | metadata → integer `atomic<u32>` (cursor,count); sample payload = plain vec4 f32 storage |
| sub-emitter BIRTH/DEATH events | FIFO counter + 6-float payload; inheritance; child per-event loop; overflow drop counter | **`atomic<f32>`-style single buffer** (counter as f32) | FAIL→FIXED | oracle 1781+; current writeFifoEvent | split: `atomic<u32>` counter (2 slots ping-pong) + plain f32 payload; explicit dropped-event counter |
| allocator | CPU freeList stack | uint atomic stack; **underflow wraps 0→0xffffffff → OOB index** | FAIL→FIXED | current 378–384 TODO | race-safe ring counter: monotonic `atomicAdd` + `slot = n mod (maxParticles+1)`; integer `atomic<u32>` only |
| map/texture | TextureLoader map on NodeMaterial via shared uniform | `material.uniforms?.map` diagnostic false "none" | FAIL→FIXED | diagnostic only | log textureId + resolved + image dimensions from config/shared uniform |
| construction assertions | — | present | PASS | DEV block in createParticleSystem | extended (shape kind 0..4, maxParticles>0, allocator cap, attribute identity) |

## Velocity-axes storage scheme (rescue)

Per-particle linear/orbital axis values (constant / fresh random sampled once at birth, curve axes stay in the baked table):

- `axes` (new vec4 storage, only when velocityOverLifetime active): `(linear.x, linear.y, linear.z, orbital.x)`
- `position.w`: `orbital.y` (else padding 0)
- `velocity.w`: `orbital.z` (else padding 0)

Orbital pivot remains `orbitalIsActive.xyz` (birth local offset, mirroring oracle `positionOffset`). The `axes` binding appears only when needed so the base pool stays inside the guaranteed 8 storage slots.

## RNG note

Emission randoms use `rand(uSeed + 16·i + k)` (TSL white noise per vec4 component, independent of position). Neighboring invocation ids shift the hash by 1 unit ⇒ decorrelated direction/angle streams; the parity probe checks the mean normalized direction ≈ 0 for SPHERE (see examples harness, `[PS:probe:*]`).

## Status legend
- PASS — formula-matched, verified by `scripts/probe-semantic-parity.mjs` (deterministic scalar comparison oracle vs GPU-formula reference) or by direct source identity.
- FAIL→FIXED — regression fixed in this pass; numeric confirmation in the parity script output.
- Browser visual promotion (UNVERIFIED → PASS) is the user's call.
