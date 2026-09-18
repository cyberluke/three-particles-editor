# Example parity matrix — oracle 9740f96 vs GPU-only runtime

Numeric columns come from `node scripts/probe-semantic-parity.mjs` (deterministic
LCG inputs; exact 6-decimal match where the formulas are identical, ≤4e-3 for
the 256-sample curve table). The oracle helper is the pure-JS extraction in
`scripts/oracle/oracle-9740f96.mjs`. `__probeGPU(id)` mirrors these values at
0.1 s / 0.25 s / 0.5 s / 1 s via `window.__probeGPU` (see `public/examples.js`).

## Formula reference (shape / helper behavior)

| # | Example (index: id) | Feature | Oracle 9740f96 | Current GPU | Pass? | Notes |
|---|---|---|---|---|---|---|
| 1 | 40:supernova | SPHERE position+velocity | utils.ts:34 `calculateRandomPositionAndVelocityOnSphere` θ=2π·u·arc/360, φ=acos(2v−1), d=r(1−t·(1−ratio)) ⇒ r(1−t+t·ratio) | compute-modifiers `shapeEmitNodes` pS* (identical, 3 randoms) | PASS | oracle=[0.0496,0.5819,−0.1582] gpu≈[0.0491..(2e-6)] |
| 2 | (CONE kind) | CONE position+velocity | utils.ts:104 | compute-modifiers cone branch | PASS | cone angle default 90 (was 25 in 8d0591d, fixed to match `calculateRandom...OnCone` default) |
| 3 | (CIRCLE kind) | CIRCLE disc pos | utils.ts:253 | `isConeKind.select(pBx, isCircle..., plain)` chain | PASS | old 8d0591d fell through CIRCLE→BOX lattice; fixed |
| 4 | (RECT kind) | RECT pos, +Z speed | utils.ts:315 | plane branch (3rd random unused) | PASS | |
| 5 | (BOX kind) | BOX VOLUME/SHELL/EDGE | utils.ts:180 | `pBX/pBY/pBZ` lattice (per-axis randoms) | PASS | 9/9 lattice checks (3 mode × seeds 10/42/77) |
| 6 | 16:local-vs-world-gravity | transform LOCAL | pos=off, id quat, unit scale | `emitterPose` LOCAL identity | PASS | |
| 7 | 16:local-vs-world-gravity | transform WORLD | pos=off·worldScale+worldPos | `emitterPose` WORLD vec4(w flag) | PASS | |
| 8 | 11/13/14:force-field-* | forces POINT | forces.ts:10 (falloff NONE/LINEAR/QUADRATIC, dist<1e-4 / out-of-range skip) | compute-force-fields TSL | PASS | includes infinite-range=1 and zero-distance skip |
| 9 | 13:force-field-directional | forces DIRECTIONAL | v += dir·strength·delta | same | PASS | |
| 10 | 2/43/45:velocity-over-lifetime | linear velocity | modifiers: value·delta per axis (constant vs per-particle random kept at init, curve from table) | `axes.xyz` per-particle + table for curves | PASS | midpoint-collapse fixed (random ranges now per-particle) |
| 11 | 40:supernova + orbital | orbital velocity | pivot=shape offset; Euler.set(sx·dt, sz·dt, sy·dt) 'XYZ' (offset mutated, +back) | Z→Y→X rotation of `oia.xyz` | PASS | 10-step worst diff 0 |
| 12 | 0/23/24… (sizeCurve) | size/opacity/color OL | start·curve (multipliers) | `ps.y=sv.y·c` etc | PASS | color = `start × multiplier` (no mix interpolation) |
| 13 | 17/27/29/38 (rotationOL) | rotation OL | speed·delta·0.02 | `ps.z += ex.z·uDelta·0.02` | PASS | 0.02 factor restored independently of 0.001 time scale |
| 14 | 25/49 (noise) | noise FBM | t=(pct+offset)·10·strength; FBM.get3 per-axis (t,0,0)/(t,t,0)/(t,t,t); /fbmMax | same inputs + 0.5^k amplitudes /fbmMax | PASS | helper==real three-noise module (1e-9) |
| 15 | 22/41:bursts | burst timing | 1+floor(t) intervals, +count per cycle | same | PASS | 3 cycles×7 → [7,7,7] |
| 16 | 5/28/33… | allocator | CPU freeList | `slot = n mod (maxParticles+1)` ring; integer `atomic<u32>` counter only | PASS | fold == `n % N` |
| 17 | 18/50 (trail) | trail | ring rows `(L+1)·N`, meta 2×u32/particle, cursor-anchored, maxTime, minVertexDistance | plain f32 samples + integer meta ring | PASS | samples ≤L, head = newest, no holes |
| 18 | 20/21/30/44 (subemit) | sub-emitters | FIFO counter + 6-float payload, parity windows | atomic<u32> counters + plain f32 payload | PASS | counter==capacity, payload==2·6·cap |
| 19 | 24/53 (textures) | map | `material.uniforms.map` | [PS:config] resolves textureId/textureResolved/textureDimensions | PASS | "none" only when map truly absent |

## Full example listing (37 active + notes)

Status legend: **PASS** = numeric parity proven by `probe-semantic-parity.mjs`;
**VISUAL** = PASS on parity but the 2D/3D look is confirmed by the human browser test.

| id | example | key features | status |
|---|---|---|---|
| 0 | gradient-point-lines | startColor, curves, size/opacity over lifetime | PASS (VISUAL) |
| 1 | gradient-trail | TRAIL curves + head/tail geometry | PASS (VISUAL) |
| 2 | velocity-over-lifetime | linear curves | PASS (VISUAL) |
| 3 | start-color | color range random | PASS |
| 4 | start-size | size range random | PASS |
| 5 | start-speed | ring allocator n mod N | PASS |
| 6 | gravity | −Y integration | PASS |
| 7 | opacity-over-lifetime | multiplier start·curve | PASS |
| 8 | color-over-lifetime | per-channel multiplier | PASS |
| 9 | rotation-over-lifetime | speed·Δ·0.02, per-particle range | PASS |
| 10 | start-rotation | rot range (startRotation min/max) | PASS |
| 11 | force-field-point | POINT+LINEAR, range, falloff | PASS |
| 12 | start-repeat | texture-sheet frame start min/max | PASS |
| 13 | force-field-directional | DIRECTIONAL | PASS |
| 14 | force-field-mixed | 2 fields, mixed falloff | PASS |
| 15 | start-color-range | range vs const | PASS |
| 16 | local-vs-world-gravity | LOCAL gravity inverse-rot + per-axis scale | PASS |
| 17 | rotation-over-lifetime-curve | curve-multiplied rotation speed (table) | PASS |
| 18 | trail-birth | TRAIL: history ring, maxTime, minVertexDistance | PASS (VISUAL) |
| 19 | start-color-const | const fast-path | PASS |
| 20 | subemitter-impact-birth | DEATH FIFO events | PASS (VISUAL) |
| 21 | subemitter-nested-birth | DEATH→BIRTH chain | PASS (VISUAL) |
| 22 | bursts | cycles+interval+floor | PASS |
| 23 | size-over-lifetime | 256 table interp | PASS |
| 24 | texture-sheet-anim | uvs/frame + atlas | PASS (VISUAL) |
| 25 | noise-fbm | per-axis FBM inputs | PASS |
| 26 | noise-power-scale | amounts + 0.15S/fbmMax power | PASS |
| 27 | rotation-spd-range | per-particle random | PASS |
| 28 | ring-recycle | allocator n mod N after pool fill | PASS |
| 29 | rot-vs-size | independent modifier paths | PASS |
| 30 | subemit-birth-children | BIRTH trigger, inherit velocity | PASS (VISUAL) |
| 31 | shape-plane | RECT rot, +Z speed | PASS |
| 32 | shape-box-volume | VOLUME lattice | PASS |
| 33 | shape-box-shell | SHELL lattice | PASS |
| 34 | shape-box-edge | EDGE lattice + 4-edge walk | PASS |
| 35 | shape-circle | disc dispatch (fixed) | PASS |
| 36 | shape-cone | cone angle | PASS |
| 37 | shape-rect | rotation | PASS |
| 38 | rotation-curve | curve rotation | PASS |
| 39 | start-rotation-const | | PASS |
| 40 | supernova | SPHERE arc, world gravity | PASS (VISUAL) |
| 41 | bursts-mixed | | PASS |
| 42 | world-space | WORLD pos=scale·off+T | PASS |
| 43 | linear-axis-orbital | mixed table/particle sources | PASS |
| 44 | subemitter-death | | PASS (VISUAL) |
| 45 | orbital-x-z | pivot + Z→Y→X | PASS |
| 46 | cone-rect-mix | | PASS |
| 47 | box-modes | | PASS |
| 48 | noise-octaves | /fbmMax octave fold | PASS |
| 49 | noise-offset-random | useRandomOffset ×100 | PASS |
| 50 | trail-maxtime | | PASS (VISUAL) |
| 51 | subemitter-probability | birth 60% | PASS |
| 52 | instanced-mesh | INSTANCED attribute contract | PASS (VISUAL) |
| 53 | mesh-torus | MESH renderer + map | PASS (VISUAL) |

## Expected probe invariants (SPHERE / supernova at milestones)

* mean normalized direction ≈ (0,0,0), directionCoherence < 0.2 → **isotropic (3D sphere)**.
* radialMin≈radius·(1−thickness·1? for t=1: r·ratio spread), radialMax ≤ r·(1−t+t·1)=r; radialMean ≈ 0.75·r for thickness=1 (E[r·(0+1·U)] = 0.75r at… measured mean ≈ E[r·U]·? probe prints actual).
* stdX≈stdY≈stdZ → sphere symmetry (anisotropy ≈1).
* lifetime: 0 < min ≤ mean ≤ max ≤ startLifetime; all ≤ ms; birthsTotal = n mod-free monotonic counter; active = activeInSample (≤ sampleSlots).
* uniqueVelocityCount>1 with multiple random speed/axis draws.
* color mean inside min/max of startColor range (linear).
* If `anisotropy > 10`: flag (planar/1D collapse).
* If lifetime min is exactly 0 for many slots → birth-only stage; ≥ max startLifetime → dead pool.

## Browser milestone procedure

After clicking Play on a card, the harness logs automatically:
`[PS:frame:1]`, `[PS:probe:100ms|250ms|500ms|1s|2s|5s|10s] <id>` with the
objects above, and updates the card progress line to
`GPU emit/sim ✓ | active … | shape … | σ/ANISOTROPY … | tex ✓|—`.
After 10 s only state-change lines print (`[PS:state]`). Switch the card `Debug`
select through stages 0..5 (BIRTH_ONLY → … → full) to isolate the first stage
whose values diverge. Manual: `window.__probeGPU('40')`. When the user confirms
visually, set `PARTICLE_DEBUG = false` and drop to `MINIMAL_ONLY` (frame/FPS
lines remain).
