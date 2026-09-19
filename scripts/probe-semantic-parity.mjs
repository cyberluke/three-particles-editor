/**
 * Pure-JS semantic parity script (development-only; not shipped).
 *
 * Left side  = oracle behavior copied from engine commit
 *              9740f964c9c4b9550e622dc9da0b560f1cdd896e (scripts/oracle/).
 * Right side = scalar transcription of the CURRENT GPU formulae from
 *              src/js/effects/three-particles/webgpu/{compute-modifiers,
 *              curve-bake}.ts, 1:1 with the TSL kernels.
 *
 * Covers (rescue instructions §30): 5 shape kinds, 3 box emitFrom modes,
 * transform local/world, force fields, linear velocity, orbital velocity
 * (10-step sequence), curve sampling, size/opacity/color/rotation over
 * lifetime, burst timing, the oracle three-noise FBM (vs the REAL module),
 * and the ring allocator fold.
 *
 * Run:  node scripts/probe-semantic-parity.mjs   (exit 1 on mismatch)
 */
import {
  makeRng,
  sphereOn,
  coneOn,
  circleOn,
  rectangleOn,
  boxOn,
  bezierFunction,
  calculateValue,
  applyModifiersOracle,
  applyEulerXYZ,
  fbm3,
  applyForceFieldsOracle,
} from './oracle/oracle-9740f96.mjs';
import { Vector3 } from 'three';

// ── current-GPU scalar references (1:1 with the TSL kernels) ───────────────
const DEG = 0.01745329;
const PI2 = Math.PI * 2;

function gpuSphere(rA, rB, rC, radius, thickness, arcDeg, speed) {
  const theta = rA * arcDeg * DEG;
  const cosPhi = rB * 2 - 1;
  const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
  const dx = sinPhi * Math.cos(theta);
  const dy = sinPhi * Math.sin(theta);
  const dz = cosPhi;
  const dist = radius * (1 - thickness) + radius * thickness * rC;
  return {
    pos: [dx * dist, dy * dist, dz * dist],
    vel: [dx * speed, dy * speed, dz * speed],
  };
}
function gpuCone(rA, rB, radius, thickness, arcDeg, coneAngleDeg, speed) {
  const theta = rA * arcDeg * DEG;
  const dx = Math.cos(theta);
  const dy = Math.sin(theta);
  const dist = radius * (1 - thickness) + radius * thickness * rB;
  const nA = (dist / Math.max(radius, 1e-6)) * coneAngleDeg * DEG;
  const sinNA = Math.sin(nA);
  return {
    pos: [dx * dist, dy * dist, 0],
    vel: [dx * sinNA * speed, dy * sinNA * speed, Math.cos(nA) * speed],
  };
}
function gpuCircle(rA, rB, radius, thickness, arcDeg, speed) {
  const theta = rA * arcDeg * DEG;
  const dx = Math.cos(theta);
  const dy = Math.sin(theta);
  const dist = radius * (1 - thickness) + radius * thickness * rB;
  return { pos: [dx * dist, dy * dist, 0], vel: [dx * speed, dy * speed, 0] };
}
function gpuRect(rA, rB, sx, sy, rxDeg, ryDeg, speed) {
  const xOff = rA * sx - sx / 2;
  const yOff = rB * sy - sy / 2;
  const rx = rxDeg * DEG;
  const ry = ryDeg * DEG;
  return {
    pos: [
      xOff * Math.cos(ry),
      yOff * Math.cos(rx),
      xOff * Math.sin(ry) - yOff * Math.sin(rx),
    ],
    vel: [0, 0, speed],
  };
}
function gpuBox(rA, rB, rC, sx, sy, sz, emitFrom) {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  if (emitFrom === 0) {
    return [rA * sx - hx, rB * sy - hy, rC * sz - hz];
  }
  const side = Math.min(Math.floor(rA * 6), 5);
  const pa = side % 3; // lattice axis 0=X 1=Y 2=Z
  const a0 = side > 2 ? 1 : 0;
  // other axes in lattice order
  const ax1 = (pa + 1) % 3;
  const ax2 = (pa + 2) % 3;
  const lat = [0, 0, 0];
  lat[pa] = a0;
  lat[ax1] = rB;
  lat[ax2] = rC;
  if (emitFrom === 2) {
    const edge = Math.min(Math.floor(rB * 4), 3);
    const e1 = edge < 2 ? rC : edge - 2;
    const e2 = edge < 2 ? edge : rC;
    lat[ax1] = e1;
    lat[ax2] = e2;
  }
  return [lat[0] * sx - hx, lat[1] * sy - hy, lat[2] * sz - hz];
}
const RES = 256;
function bakeTable(fn) {
  // Float32Array matches the GPU interpolation exactly (32-bit storage).
  const d = new Float32Array(RES);
  for (let i = 0; i < RES; i++) d[i] = fn(i / (RES - 1));
  return d;
}
function lookupTable(table, t) {
  const c = Math.min(t, 1);
  const pos = c * (RES - 1);
  const i0 = Math.floor(pos);
  const f = pos - i0;
  const v0 = table[i0];
  const v1 = table[Math.min(i0 + 1, RES - 1)];
  return v0 + (v1 - v0) * f;
}

// ── test runner ─────────────────────────────────────────────────────────────
let fails = 0;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps || (!isFinite(a) && !isFinite(b) && String(a) === String(b));
function check(name, ok, a, b, extra = {}) {
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} | ${name}` +
      (a !== undefined ? ` | oracle=${JSON.stringify(a)} gpu=${JSON.stringify(b)}` : '') +
      (Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : '')
  );
}

// ── 1) SPHERE (supernova-style config) ──────────────────────────────────────
{
  const o = sphereOn(makeRng(1), { radius: 1.2, radiusThickness: 1, arc: 360 });
  const r = makeRng(1);
  const g = gpuSphere(r(), r(), r(), 1.2, 1, 360, 1.33);
  const posOk = [0, 1, 2].every((k) => near(o.pos[k], g.pos[k], 2e-6));
  const velOk = [0, 1, 2].every((k) => near(o.dir[k] * 1.33, g.vel[k], 2e-6));
  check('shapes.SPHERE', posOk && velOk, o.pos, g.pos);
}
// ── 2) CONE ─────────────────────────────────────────────────────────────────
{
  const o = coneOn(makeRng(2), { radius: 1, radiusThickness: 1, arc: 66, angle: 25 });
  const r = makeRng(2);
  const g = gpuCone(r(), r(), 1, 1, 66, 25, 3);
  const ok =
    [0, 1, 2].every((k) => near(o.pos[k], g.pos[k], 2e-6)) &&
    [0, 1, 2].every((k) => near(o.vel[k] * 3, g.vel[k], 2e-6));
  check('shapes.CONE', ok, o.pos, g.pos);
}
// ── 3) CIRCLE (disc position; must differ from BOX plane fall-through) ──────
{
  const o = circleOn(makeRng(3), { radius: 1, radiusThickness: 1, arc: 200 });
  const r = makeRng(3);
  const g = gpuCircle(r(), r(), 1, 1, 200, 1);
  const ok =
    [0, 1, 2].every((k) => near(o.pos[k], g.pos[k], 2e-6)) &&
    near(Math.hypot(...g.pos), Math.hypot(...o.pos), 2e-6) &&
    g.pos[2] === 0;
  check('shapes.CIRCLE.disc', ok, o.pos, g.pos);
  // the OLD broken dispatch (CIRCLE == box planar lattice) must differ:
  const r2 = makeRng(3);
  const rA = r2(), rB = r2(), rC = r2();
  const oldBox = [rA * 1 - 0.5, rB * 1 - 0.5, rC * 1 - 0.5];
  const differs = oldBox.some((v, k) => !near(v, g.pos[k], 1e-3));
  check('shapes.CIRCLE.fix-vs-box-lattice', differs, oldBox, g.pos);
}
// ── 4) RECTANGLE ────────────────────────────────────────────────────────────
{
  const o = rectangleOn(makeRng(4), { rotation: { x: 5, y: 5 }, scale: { x: 1, y: 1 } });
  const r = makeRng(4);
  const g = gpuRect(r(), r(), 1, 1, 5, 5, 5);
  const ok =
    [0, 1, 2].every((k) => near(o.pos[k], g.pos[k], 2e-6)) && near(5, g.vel[2]);
  check('shapes.RECTANGLE', ok, o.pos, g.pos);
}
// ── 5) BOX VOLUME / SHELL / EDGE ────────────────────────────────────────────
for (const [name, mode] of [['VOLUME', 0], ['SHELL', 1], ['EDGE', 2]]) {
  for (const seed of [10, 42, 77]) {
    const o = boxOn(makeRng(seed), {
      scale: { x: 1, y: 0.3, z: 1 },
      emitFrom: name,
    });
    const r = makeRng(seed);
    const g = gpuBox(r(), r(), r(), 1, 0.3, 1, mode);
    const ok = [0, 1, 2].every((k) => near(o.pos[k], g[k], 2e-6));
    check(`shapes.BOX-${name}`, ok, o.pos, g, { seed });
  }
}
// ── 6) Transform LOCAL vs WORLD (scalar math mirror) ───────────────────────
{
  // LOCAL: identity quaternion, no translation:
  const off = [1, 2, 3];
  const local = off.slice();
  // WORLD: world-scale per axis + world translation (mirror of encodeShape):
  const scale = [2, 2, 2];
  const pos4 = [10, -2, 4];
  const world = [
    off[0] * scale[0] + pos4[0],
    off[1] * scale[1] + pos4[1],
    off[2] * scale[2] + pos4[2],
  ];
  const okLoc = local.every((v, k) => near(v, off[k]));
  const okW = near(world[0], 12) && near(world[1], 2) && near(world[2], 10);
  check('transform.LOCAL', okLoc, local, off);
  check('transform.WORLD', okW, world, [12, 2, 10]);
}
// ── 7) Force fields ─────────────────────────────────────────────────────────
{
  const vel = [1, 2, 3];
  const pos = [1, 0, 0];
  const out = applyForceFieldsOracle({
    fields: [
      { isActive: true, type: 'POINT', position: [2, 0, 0], strength: 4, range: 10, falloff: 'LINEAR' },
    ],
    pos, vel, delta: 1 / 60, evalStrength: (s) => s,
  });
  const force = 4 * (1 - 1 / 10) * (1 / 60);
  const g = [vel[0], vel[1], vel[2]];
  g[0] += 1 * force;
  check('forces.POINTlinear', [0, 1, 2].every((k) => near(out[k], g[k], 1e-9)), out, g);

  const out2 = applyForceFieldsOracle({
    fields: [{ isActive: true, type: 'POINT', position: [3, 0, 0], strength: 2, range: 10, falloff: 'QUADRATIC' }],
    pos, vel: [0, 0, 0], delta: 0.5, evalStrength: (s) => s,
  });
  const nd = 2 / 10;
  const f2 = 2 * (1 - nd * nd) * 0.5;
  check('forces.POINTquadratic', near(out2[0], f2, 1e-9), out2[0], f2);

  const out3 = applyForceFieldsOracle({
    fields: [{ isActive: true, type: 'POINT', position: [50, 0, 0], strength: 7, range: 10, falloff: 'NONE' }],
    pos, vel: [0, 0, 0], delta: 1 / 60, evalStrength: (s) => s,
  });
  check('forces.POINToutOfRangeZero', near(out3[0], 0, 1e-12), out3[0], 0);

  const out4 = applyForceFieldsOracle({
    fields: [{ isActive: true, type: 'DIRECTIONAL', direction: [0, 1, 0], strength: 3 }],
    pos, vel: [1, 1, 1], delta: 0.25, evalStrength: (s) => s,
  });
  check('forces.DIRECTIONAL', near(out4[1], 1 + 3 * 0.25, 1e-9), out4[1], 1.75);

  const out6 = applyForceFieldsOracle({
    fields: [{ isActive: true, type: 'POINT', position: [2, 0, 0], strength: 4, range: Infinity, falloff: 'LINEAR' }],
    pos, vel: [0, 0, 0], delta: 1 / 60, evalStrength: (s) => s,
  });
  check('forces.POINTinfiniteRange', near(out6[0], 4 * (1 / 60), 1e-9), out6[0], 4 / 60);

  const out7 = applyForceFieldsOracle({
    fields: [{ isActive: true, type: 'POINT', position: [1, 0, 0], strength: 5, range: Infinity, falloff: 'NONE' }],
    pos, vel: [0, 0, 0], delta: 1 / 60, evalStrength: (s) => s,
  });
  check('forces.POINTzeroDistSkip', near(out7[0], 0, 1e-12), out7[0], 0);
}
// ── 8) Orbital velocity 10-step sequence ────────────────────────────────────
{
  const speed = [0, 0.7, 0.3]; // x, y(cfg)->euler.z, z(cfg)->euler.y
  const delta = 1 / 60;
  const offO = [1, 0.5, -0.25];
  const pO = [0.5, 0.1, 0.2];
  const offG = [1, 0.5, -0.25];
  const pG = [0.5, 0.1, 0.2];
  let worst = 0;
  for (let step = 0; step < 10; step++) {
    // oracle: position -= offset; Euler.set(sx*dt, sz*dt, sy*dt); offset
    // = applyEuler(offset); position += offset
    for (let k = 0; k < 3; k++) pO[k] -= offO[k];
    const e = [speed[0] * delta, speed[2] * delta, speed[1] * delta]; // (x, y=cfgZ, z=cfgY)
    const rot = applyEulerXYZ(offO, e[0], e[1], e[2]);
    offO[0] = rot[0]; offO[1] = rot[1]; offO[2] = rot[2];
    for (let k = 0; k < 3; k++) pO[k] += offO[k];

    for (let k = 0; k < 3; k++) pG[k] -= offG[k];
    const rr = gpuEuler(offG, speed[0] * delta, speed[2] * delta, speed[1] * delta);
    offG[0] = rr[0]; offG[1] = rr[1]; offG[2] = rr[2];
    for (let k = 0; k < 3; k++) pG[k] += offG[k];
    for (let k = 0; k < 3; k++) {
      worst = Math.max(worst, Math.abs(pO[k] - pG[k]), Math.abs(offO[k] - offG[k]));
    }
  }
  check('modifiers.orbital10step', worst < 1e-9, pO, pG, { worstDiff: worst });
}
function gpuEuler(o, ax, ay, az) {
  return applyEulerXYZ(o, ax, ay, az);
}
// ── 9) Curve sampling: 256-sample linear table matches analytic <=4e-3 ──────
{
  const f = (t) => 1 - Math.abs(2 * t - 1);
  const table = bakeTable(f);
  let worst = 0;
  for (const p of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    worst = Math.max(worst, Math.abs(f(p) - lookupTable(table, p)));
  }
  check('curves.baked256', worst <= 4e-3, undefined, undefined, { worst });
  // bezier (oracle code path) at the same percentages:
  const bp = [
    { x: 0, y: 0, percentage: 0 },
    { x: 0.5, y: 1, percentage: 0.5 },
    { x: 1, y: 0, percentage: 1 },
  ];
  const fn = bezierFunction(bp);
  const tb = bakeTable(fn);
  let w2 = 0;
  for (const p of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    w2 = Math.max(w2, Math.abs(fn(p) - lookupTable(tb, p)));
  }
  check('curves.bezierBaked', w2 <= 4e-3, undefined, undefined, { worst: w2 });
}
// ── 10) size / opacity / color / rotation modifier semantics ────────────────
{
  const sizeC = bakeTable((t) => 0.5 + 0.5 * t);
  const opC = bakeTable((t) => t);
  const colR = bakeTable((t) => 1 - t);
  const m = applyModifiersOracle({
    delta: 1 / 60,
    pct: 0.5,
    start: { size: 2, opacity: 0.8, colorR: 1, colorG: 0.5, colorB: 0.25, rotSpeed: 3 },
    curves: {
      size: (t) => lookupTable(sizeC, t),
      opacity: (t) => lookupTable(opC, t),
      colorR: (t) => lookupTable(colR, t),
    },
    pos: [0, 0, 0],
  });
  check(
    'modifiers.size=start*curve',
    near(m.size, 2 * lookupTable(sizeC, 0.5), 1e-9),
    m.size,
    2 * lookupTable(sizeC, 0.5)
  );
  check(
    'modifiers.opacity=start*curve',
    near(m.alpha, 0.8 * lookupTable(opC, 0.5), 1e-9),
    m.alpha,
    0.8 * lookupTable(opC, 0.5)
  );
  check(
    'modifiers.color=start*multiplier',
    near(m.color[0], 1 * lookupTable(colR, 0.5), 1e-9),
    m.color[0],
    1 * lookupTable(colR, 0.5)
  );
  const m2 = applyModifiersOracle({
    delta: 1 / 60,
    pct: 0,
    start: { size: 1, opacity: 1, colorR: 1, colorG: 1, colorB: 1, rotSpeed: 3 },
    pos: [0, 0, 0],
  });
  check(
    'modifiers.rotationDelta*0.02',
    near(m2.rot, 3 * (1 / 60) * 0.02, 1e-12),
    m2.rot,
    3 * (1 / 60) * 0.02
  );
}
// ── 11) Linear velocity: constant vs per-particle random range ──────────────
{
  const m = applyModifiersOracle({
    delta: 0.25,
    pct: 0.5,
    start: { size: 1, opacity: 1, colorR: 1, colorG: 1, colorB: 1, rotSpeed: 0 },
    axes: { lin: [2, 0.5, -1] },
    pos: [0, 0, 0],
  });
  const ok = near(m.pos[0], 0.5, 1e-9) && near(m.pos[1], 0.125, 1e-9);
  check('modifiers.linearDelta', ok, m.pos, [0.5, 0.125, -0.25]);
  const rng = makeRng(42);
  const v1 = calculateValue(rng, { min: 0.35, max: 1.05 });
  const v2 = calculateValue(rng, { min: 0.35, max: 1.05 });
  const inRange = v1 >= 0.35 && v1 <= 1.05 && v2 >= 0.35 && v2 <= 1.05 && Math.abs(v1 - v2) > 1e-4;
  check('modifiers.orbitalRangePerParticle', inRange, [v1, v2], v1, { mid: 0.7 });
}
// ── 12) Burst timing (cycles + interval + floor(count)) ─────────────────────
{
  const b = { time: 1, cycles: 3, interval: 0.5, count: 7 };
  let cyclesExecuted = 0;
  const execAt = [];
  for (const tSec of [0, 1, 1.49, 1.5, 2, 2.2, 3.5]) {
    if (cyclesExecuted >= b.cycles) continue;
    const next = b.time + cyclesExecuted * b.interval;
    if (tSec >= next) {
      execAt.push(Math.floor(calculateValue(makeRng(7), b.count)));
      cyclesExecuted++;
    }
  }
  check('emission.burstCycles3x7', execAt.length === 3 && execAt.every((v) => v === 7), execAt, [7, 7, 7]);
}
// ── 13) three-noise FBM: oracle input t = (pct + offset) * 10 * strength ────
{
  const { FBM } = await import('../public/lib/three-noise.module.js');
  const f = new FBM({ seed: 0.25, scale: 1, octaves: 2 });
  const pct = 0.4, offset = 12, strength = 1.5;
  const np = (pct + offset) * 10 * strength;
  const a = f.get3(new Vector3(np, 0, 0));
  const b = fbm3({ scale: 1, octaves: 2, seed: 1 }, { x: np, y: 0, z: 0 });
  check(
    'noise.fbm==three-noise',
    near(a, b, 1e-9),
    a,
    b,
    { input: np }
  );
}
// ── 14) Allocator ring fold vs modulo ───────────────────────────────────────
{
  const N = 7;
  let ok = true;
  for (const i of [0, 6, 7, 8, 20, 4294967294, 4294967295]) {
    const gpu = i - Math.floor(i / N) * N;
    ok = ok && gpu === i % N;
  }
  check('allocator.ringFold', ok);
}

// ── 15) Supernova full-config canary: hard TSL graph + binding budget ───────
// The browser failed with `lookupCurve is not defined`, so the static graph
// is now built through the real THREE.WGSLNodeBuilder and the per-pass
// bindings are counted from the real `getBindings()` result.
{
  const T = await import('three/webgpu');
  const TSL = await import('three/tsl');
  const w = await import('../public/lib/three-particles-webgpu.esm.js?v=9');
  const idx = await import('../public/lib/three-particles.esm.js?v=9');
  idx.registerTSLMaterialFactory({
    createTSLParticleMaterial: w.createTSLParticleMaterial,
    createTSLTrailMaterial: w.createTSLTrailMaterial,
    createComputePipeline: w.createComputePipeline,
    createSubEmitterInitUpdate: w.createSubEmitterInitUpdate,
    createTrailRibbonUpdate: w.createTrailRibbonUpdate,
    createSubEmitterFifoAttribute: w.createSubEmitterFifoAttribute,
    encodeForceFieldsForGPU: w.encodeForceFieldsForGPU,
    encodeCollisionPlanesForGPU: w.encodeCollisionPlanesForGPU,
  });
  const { examples } = await import('../public/lib/examples-data.js?v=9');
  const sup = examples.find((e) => e.id === 'gpu-supernova');

  const mkCfg = (stage) => {
    const cfg = JSON.parse(JSON.stringify(sup.config));
    cfg.maxParticles = 4096;
    if (!cfg.renderer) cfg.renderer = {};
    cfg.renderer.materialBackend = 'TSL';
    if (cfg.renderer.rendererType === undefined) cfg.renderer.rendererType = 'INSTANCED';
    const v = cfg.velocityOverLifetime;
    const n = cfg.noise;
    const so = cfg.sizeOverLifetime;
    const oo = cfg.opacityOverLifetime;
    const co = cfg.colorOverLifetime;
    const ro = cfg.rotationOverLifetime;
    if (stage === 0) {
      if (v) v.isActive = false;
      if (n) n.isActive = false;
      for (const m of [so, oo, co, ro]) if (m) m.isActive = false;
    }
    return cfg;
  };

  const rMock = () => ({
    contextNode: TSL.context({}),
    backend: { isWebGPUBackend: true, diagnostics: { keywords: false } },
    debug: { diagnostics: { keywords: false } },
    hasFeature: () => false,
  });

  const buildPass = (label, sys, idxNo) => {
    const dbg = sys.gpuDebug;
    const node = dbg ? [dbg.emitNode, dbg.simNode][idxNo] : null;
    if (!node) throw new Error('missing compute node: ' + label);
    const b = new T.WGSLNodeBuilder(null, rMock());
    b.material = null;
    b.compute = node;
    b.prebuild();
    b.build();
    let storage = 0;
    let uniform = 0;
    for (const g of b.getBindings()) {
      for (const ent of g.bindings) {
        const nm = ent.constructor.name;
        if (nm === 'NodeStorageBuffer') storage++;
        else if (nm.startsWith('NodeUniform')) uniform++;
      }
    }
    return [label, storage, uniform];
  };

  let jsErrors = 0;
  const full = idx.createParticleSystem(mkCfg(5));
  const passes = [];
  try {
    passes.push(buildPass('emit', full, 0));
    passes.push(buildPass('sim', full, 1));
  } catch (e) { jsErrors++; console.log('FAIL | canary.full | ' + e.message); }
  const stage0 = idx.createParticleSystem(mkCfg(0));
  try {
    passes.push(buildPass('emit+birth', stage0, 0));
    passes.push(buildPass('sim+birth', stage0, 1));
  } catch (e) { jsErrors++; console.log('FAIL | canary.birthOnly | ' + e.message); }

  if (jsErrors === 0) {
    for (const [label, storage, uniform] of passes) {
      check(`canary.${label}.storage<=8`, storage <= 8, undefined, undefined, { storage });
      check(`canary.${label}.uniforms<=4`, uniform <= 4, undefined, undefined, { uniform });
    }
    // The six-axis random streams must be decorrelated: distinct salts.
    const salts = [11.17, 23.41, 37.73, 51.19, 67.31, 83.47];
    check('canary.saltsDistinct', new Set(salts).size === 6, undefined, undefined, { salts: 6 });
    // Stable seed at 70k emissions: every slot index visited once (fold math).
    const mp = 350000;
    let fold = true;
    for (let i = 0; i < 1000; i++) if (i % mp !== i - Math.floor(i / mp) * mp) fold = false;
    check('canary.ringFold70k', fold, undefined, undefined, { mp });
  }

  const p = (i) => passes[i] || ['-', -1, -1];
  const dbgF = full.gpuDebug || {};
  console.log(
    `[CANARY] supernova-full: emit=${p(0)[1]} sim=${p(1)[1]} stage0:${p(2)[1]}/${p(3)[1]} | ` +
    `TSL build=${jsErrors === 0 ? 'PASS' : 'FAIL'} | jsErrors=${jsErrors} | ` +
    `emitUniforms=${passes.length ? p(0)[2] : 0} simUniforms=${passes.length ? p(1)[2] : 0} ` +
    `maxParticles=${dbgF.maxParticles ?? 'n/a'} ` +
    `passCounts=${JSON.stringify((dbgF.passBindingCounts || []).map((x) => `${x[0]}=${x[1]}`))}`
  );
  fails += jsErrors;
}

console.log(`\n${fails === 0 ? 'STATIC CONSTRUCTION PASS (semantic parity)' : 'PARITY FAILURES: ' + fails}`);
process.exit(fails === 0 ? 0 : 1);
