// examples.js — offline mirror for @cyberluke/three-particles 4.0.0 (GPU-only).
// Three.js r0.186 exposes `WebGPURenderer` under `three/webgpu`.
//
// Rescue-pass diagnostics: [PS:*] milestone logs, automatic bounded GPU
// read-back probes with spatial statistics, card progress line, staged
// BIRTH_ONLY debug modes. All debug state lives in this harness — the engine
// API is unchanged.

import * as THREE from 'three/webgpu';
import {
  REVISION,
  createParticleSystem,
  updateParticleSystems,
} from '@cyberluke/three-particles';
import { enableWebGPU } from '@cyberluke/three-particles/webgpu';
import { examples } from './lib/examples-data.js?v=7';

/** Rescue-mode debug switch (drop to false once parity is signed off). */
const PARTICLE_DEBUG = true;

// Version stamp comes straight from the built engine module.
const verEl = document.getElementById('version-static');
if (verEl) verEl.textContent = `v${REVISION} (local)`;

// ─── automatic milestone probes (no manual DevTools commands needed) ───
const MILESTONES_MS = [100, 250, 500, 1000, 2000, 5000, 10000];

// ms-based clock shared by every per-card + expand stats line.
function makeClock() {
  let last = performance.now();
  return {
    start() { last = performance.now(); },
    getDelta() {
      const n = performance.now();
      const d = (n - last) / 1000;
      last = n;
      return d;
    },
  };
}
const hasWebGPU = () => typeof navigator !== 'undefined' && !!navigator.gpu;

// Upstream TEXTURE_MAP: relative names match the 31 files in public/textures/.
const TEXTURE_MAP = {
  FLAME:'./textures/flame.webp', CLOUD:'./textures/cloud.webp', SNOWFLAKE:'./textures/snowflake.webp',
  GRADIENT_POINT:'./textures/gradient-point.webp', VORTEX:'./textures/vortex.webp', STAR:'./textures/star.webp',
  POINT:'./textures/point.webp', PLUS_TOON:'./textures/plus-toon.webp', SNOWFLAKE_DETAILED:'./textures/snowflake-detailed.webp',
  SQUARE:'./textures/square.webp', CIRCLE:'./textures/circle.webp', LEAF_TOON:'./textures/leaf-toon.webp',
  SKULL:'./textures/skull.webp', ROCKS:'./textures/rocks.webp', STARBURST:'./textures/starbust.webp',
  SOFT_SMOKE:'./textures/soft-smoke.webp', BUBBLES:'./textures/bubbles.webp', FEATHER:'./textures/feather.webp',
  FLARE:'./textures/flare.webp', HEART:'./textures/heart.webp', MOON:'./textures/moon.webp',
  LIGHT_STREAK:'./textures/light-streak.webp', RADIAL_BRUST:'./textures/radial-brust.webp',
  RAINDROP:'./textures/raindrop.webp', CONFETTI:'./textures/confetti.webp', CONFETTI_TOON:'./textures/confetti-toon.webp',
  NUMBERS:'./textures/numbers.webp', NUMBERS_TOON:'./textures/numbers-toon.webp', STAR_TOON:'./textures/star-toon.webp',
  MAGIC_EXPLOSION:'./textures/magic-explosion.webp', PLUS:'./textures/plus.webp',
};
const textureLoader = new THREE.TextureLoader();
const textureCache = {};
function loadTexture(id) {
  if (!id || !TEXTURE_MAP[id]) return null;
  if (textureCache[id]) return textureCache[id];
  const tex = textureLoader.load(TEXTURE_MAP[id]);
  tex.flipY = false;
  textureCache[id] = tex;
  return tex;
}

function resolveBlending(v) {
  if (typeof v === 'number') return v;
  if (v === 'THREE.AdditiveBlending')    return THREE.AdditiveBlending;
  if (v === 'THREE.MultiplyBlending')    return THREE.MultiplyBlending;
  if (v === 'THREE.SubtractiveBlending') return THREE.SubtractiveBlending;
  return THREE.NormalBlending;
}

// Upstream MESH geometry factories (10 kinds):
const MESH_GEOMETRIES = {
  BOX:          () => new THREE.BoxGeometry(1, 1, 1),
  SPHERE:       () => new THREE.SphereGeometry(0.5, 12, 8),
  ICOSAHEDRON:  () => new THREE.IcosahedronGeometry(0.5, 0),
  TORUS:        () => new THREE.TorusGeometry(0.4, 0.15, 8, 24),
  CONE:         () => new THREE.ConeGeometry(0.4, 1, 8),
  OCTAHEDRON:   () => new THREE.OctahedronGeometry(0.5, 0),
  DODECAHEDRON: () => new THREE.DodecahedronGeometry(0.5, 0),
  TETRAHEDRON:  () => new THREE.TetrahedronGeometry(0.6, 0),
  TORUS_KNOT:   () => new THREE.TorusKnotGeometry(0.3, 0.1, 32, 8),
  CYLINDER:     () => new THREE.CylinderGeometry(0.3, 0.3, 1, 8),
};

// ─── GPU-only prepareConfig ───
function prepareConfig(cfg0, textureId, meshType) {
  const cfg = JSON.parse(JSON.stringify(cfg0 || {}));
  delete cfg._editorData;
  if (!cfg.renderer) cfg.renderer = {};
  cfg.simulationBackend = 'GPU';
  const rt = cfg.renderer.rendererType;
  if (!rt || rt === 'POINTS') cfg.renderer.rendererType = 'INSTANCED';
  if (cfg.renderer.blending) cfg.renderer.blending = resolveBlending(cfg.renderer.blending);
  const tex = loadTexture(textureId);
  if (tex) cfg.map = tex;
  if (cfg.subEmitters) {
    for (const sub of cfg.subEmitters) {
      if (sub.config?.renderer?.blending) sub.config.renderer.blending = resolveBlending(sub.config.renderer.blending);
      if (sub.textureId) {
        const subTex = loadTexture(sub.textureId);
        if (subTex) sub.config.map = subTex;
        delete sub.textureId;
      }
    }
  }
  if (meshType && MESH_GEOMETRIES[meshType]) {
    cfg.renderer.mesh = { geometry: MESH_GEOMETRIES[meshType]() };
  }
  return cfg;
}

// ─── Staged birth diagnosis (debug-harness only; configs cloned, not mutated)
// 0 BIRTH_ONLY | 1 +INTEGRATION | 2 +FORCE_FIELDS | 3 +ORBITAL | 4 +NOISE
// | 5 +LIFETIME_VISUALS (full config).
const STAGES = ['0:BIRTH_ONLY', '1:+INTEGRATION', '2:+FORCE_FIELDS', '3:+ORBITAL', '4:+NOISE', '5:+LIFETIME_VISUALS'];
function applyStage(cfg, stage) {
  const v = cfg.velocityOverLifetime || {};
  if (stage >= 1) v.isActive = true; else v.isActive = false;
  if (stage < 3) {
    v.orbital = { x: 0, y: 0, z: 0 };
  }
  if (stage < 2) cfg.forceFields = [];
  if (stage < 4) { if (cfg.noise) cfg.noise.isActive = false; }
  if (stage < 5) {
    if (cfg.sizeOverLifetime) cfg.sizeOverLifetime.isActive = false;
    if (cfg.opacityOverLifetime) cfg.opacityOverLifetime.isActive = false;
    if (cfg.colorOverLifetime) cfg.colorOverLifetime.isActive = false;
    if (cfg.rotationOverLifetime) cfg.rotationOverLifetime.isActive = false;
    // linear axis of velocityOverLifetime: keep (>=1), kill otherwise
    if (stage < 1 && v.linear) v.linear = { x: 0, y: 0, z: 0 };
  }
  return cfg;
}

// ─── Diagnostics helpers ───
function median(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

// Small deterministic statistics over the sampled GPU slots (§9/§10).
function computeSampleStats(chunks) {
  let pMin = [Infinity, Infinity, Infinity];
  let pMax = [-Infinity, -Infinity, -Infinity];
  let pSum = [0, 0, 0], pSumSq = [0, 0, 0];
  let radSum = 0, radMin = Infinity, radMax = -Infinity;
  let vMin = Infinity, vMax = -Infinity, vSum = 0;
  let dirSum = [0, 0, 0];
  let cMin = [Infinity, Infinity, Infinity, Infinity];
  let cMax = [-Infinity, -Infinity, -Infinity, Infinity === Infinity ? -Infinity : -Infinity];
  cMax = [-Infinity, -Infinity, -Infinity, -Infinity];
  let cSum = [0, 0, 0], aSum = 0;
  let lifeMin = Infinity, lifeMax = -Infinity, lifeSum = 0, sLifeSum = 0;
  let n = 0, active = 0;
  const uniq = { pos: new Set(), vel: new Set() };
  for (const ch of chunks) {
    const pos = ch.pos, vel = ch.vel, col = ch.col, pstate = ch.ps, oia = ch.oia;
    for (let s = 0; s < ch.count; s++) {
      const o = s * 4;
      const isActive = oia[o + 3] >= 0.5 || col[o + 3] > 0;
      if (!isActive) continue;
      active++;
      const px = pos[o], py = pos[o + 1], pz = pos[o + 2];
      const vx = vel[o], vy = vel[o + 1], vz = vel[o + 2];
      const p = [px, py, pz];
      for (let k = 0; k < 3; k++) {
        pMin[k] = Math.min(pMin[k], p[k]);
        pMax[k] = Math.max(pMax[k], p[k]);
        pSum[k] += p[k];
        pSumSq[k] += p[k] * p[k];
      }
      const r = Math.hypot(px, py, pz);
      radSum += r; radMin = Math.min(radMin, r); radMax = Math.max(radMax, r);
      const sp = Math.hypot(vx, vy, vz);
      vMin = Math.min(vMin, sp); vMax = Math.max(vMax, sp); vSum += sp;
      if (sp > 1e-9) {
        dirSum[0] += vx / sp; dirSum[1] += vy / sp; dirSum[2] += vz / sp;
      }
      for (let k = 0; k < 4; k++) {
        cMin[k] = Math.min(cMin[k], col[o + k]);
        cMax[k] = Math.max(cMax[k], col[o + k]);
        if (k < 3) cSum[k] += col[o + k];
      }
      aSum += col[o + 3];
      lifeSum += pstate[o];
      sLifeSum += ch.sv[o];
      lifeMin = Math.min(lifeMin, pstate[o]);
      lifeMax = Math.max(lifeMax, pstate[o]);
      uniq.pos.add(`${px.toFixed(4)},${py.toFixed(4)},${pz.toFixed(4)}`);
      uniq.vel.add(`${vx.toFixed(4)},${vy.toFixed(4)},${vz.toFixed(4)}`);
      n++;
    }
  }
  const mean = pSum.map((v) => (n ? v / n : 0));
  const std = pSumSq.map((v, k) =>
    n ? Math.sqrt(Math.max(0, v / n - mean[k] * mean[k])) : 0
  );
  const anisotropy = std.map((v) => (v > 1e-6 ? v : 1e-6));
  const aniso = Math.max(...std) / Math.max(Math.min(...anisotropy), 1e-6);
  const coh = Math.hypot(...dirSum) / Math.max(1, active);
  return {
    activeInSample: active,
    position: {
      minXYZ: pMin.map((v) => (v === Infinity ? null : +v.toFixed(3))),
      maxXYZ: pMax.map((v) => (v === -Infinity ? null : +v.toFixed(3))),
      meanXYZ: mean.map((v) => +v.toFixed(3)),
      stdXYZ: std.map((v) => +v.toFixed(3)),
      radialMin: radMin === Infinity ? null : +radMin.toFixed(3),
      radialMax: radMax === -Infinity ? null : +radMax.toFixed(3),
      radialMean: n ? +(radSum / n).toFixed(3) : 0,
    },
    velocity: {
      minSpeed: vMin === Infinity ? null : +vMin.toFixed(3),
      maxSpeed: vMax === -Infinity ? null : +vMax.toFixed(3),
      meanSpeed: n ? +(vSum / n).toFixed(3) : 0,
      meanDirectionXYZ: dirSum.map((v) => +((v / Math.max(1, active))).toFixed(3)),
      directionCoherence: +coh.toFixed(3),
    },
    color: {
      minRGB: cMin.slice(0, 3).map((v) => +v.toFixed(3)),
      maxRGB: cMax.slice(0, 3).map((v) => +v.toFixed(3)),
      meanRGB: cSum.map((v) => +(v / Math.max(1, n)).toFixed(3)),
      alphaMin: +cMin[3].toFixed(3), alphaMax: +cMax[3].toFixed(3),
      alphaMean: +(aSum / Math.max(1, n)).toFixed(3),
    },
    lifetime: {
      min: lifeMin === Infinity ? null : +lifeMin.toFixed(1),
      max: lifeMax === -Infinity ? null : +lifeMax.toFixed(1),
      mean: n ? +(lifeSum / n).toFixed(1) : 0,
      startMeanMs: n ? +(sLifeSum / n).toFixed(1) : 0,
    },
    anisotropy: +aniso.toFixed(2),
    uniquePositions: uniq.pos.size,
    uniqueVelocities: uniq.vel.size,
  };
}

// Automatic bounded GPU read-back: allocator counter + up to 256 particle
// slots across deterministic windows (§8). Never reads the full pool.
async function runProbe(ctx, tag) {
  const dbg = ctx.system && ctx.system.gpuDebug;
  if (!dbg || !ctx.renderer.getArrayBufferAsync) return null;
  const maxParticles = dbg.maxParticles;
  const wins = [];
  const add = (first, count) =>
    wins.push([first, Math.min(count, maxParticles - first)]);
  add(0, 64); add(Math.floor(maxParticles * 0.25), 64);
  if (maxParticles > 192) add(Math.floor(maxParticles * 0.5), 64);
  if (maxParticles > 320) add(Math.floor(maxParticles * 0.75), 64);
  add(Math.max(0, maxParticles - 64), 64);
  const readW = async (attr, first, count) =>
    new Float32Array(await ctx.renderer.getArrayBufferAsync(
      attr, null, first * 16, count * 16
    ));
  const chunks = [];
  for (const [first, count] of wins) {
    const [pos, vel, col, ps, sv, oia] = await Promise.all([
      readW(dbg.buffers.position, first, count),
      readW(dbg.buffers.velocity, first, count),
      readW(dbg.buffers.color, first, count),
      readW(dbg.buffers.particleState, first, count),
      readW(dbg.buffers.startValues, first, count),
      readW(dbg.buffers.orbitalIsActive, first, count),
    ]);
    chunks.push({ pos, vel, col, ps, sv, oia, count, first });
  }
  const allocAB = await ctx.renderer.getArrayBufferAsync(
    dbg.buffers.allocator, null, 0, 4
  );
  const births = new Uint32Array(allocAB)[0];
  const stats = computeSampleStats(chunks);
  const out = {
    atMs: Math.round(ctx.elapsed * 1000),
    maxParticles,
    birthsTotal: births,
    ringRecycled: births > maxParticles,
    lastEmit: dbg.lastEmitCount(),
    sampleSlots: chunks.reduce((m, c) => m + c.count, 0),
    ...stats,
  };
  console.log(`[PS:probe:${tag}] ${ctx.id}`, out);
  updateProgressLine(ctx, out);
  return out;
}

// Compact progress line on the card (§27) — updated from each probe result.
function updateProgressLine(ctx, p) {
  const st = document.getElementById('stats-' + ctx.id);
  if (!st || !p) return;
  const texOk = ctx.system.gpuDebug?.snapshot?.().textureResolved ? '✓' : '-';
  const shape = ctx.system.gpuDebug?.snapshot?.().shape?.publicShape || '?';
  const anisoTxt =
    p.anisotropy > 10 ? `ANISOTROPY ${p.anisotropy}x`
    : `σ ${p.position.stdXYZ[0]}/${p.position.stdXYZ[1]}/${p.position.stdXYZ[2]}`;
  st.textContent =
    `GPU emit/sim ✓ | active ${p.activeInSample}/${p.sampleSlots} (births ${p.birthsTotal}) | ` +
    `shape ${shape} | ${anisoTxt} | tex ${texOk}`;
}

// ─── Per-card ctx map (one WebGPU renderer per visible card) ───
const cards = new Map();
let activeId = null, activeLoop = 0;
let cardStage = 5; // full config by default
let expandStage = 5;

async function makeCtx(id, entry, stage = 5) {
  const canvas = document.getElementById('canvas-' + id);
  if (!canvas) return null;
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(canvas.clientWidth || 300, canvas.clientHeight || 150, true);
  await renderer.init();
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Registration must happen after `init()` against the live renderer.
  if (!enableWebGPU(renderer)) throw new Error('examples.html requires a native WebGPU compute backend');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const ar = canvas.clientWidth / Math.max(1, canvas.clientHeight) || 1;
  const camera = new THREE.PerspectiveCamera(45, ar, 1, 100);
  camera.position.set(0, 0, 6);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true })
  );
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);
  let cfg = prepareConfig(entry.config, entry.textureId, entry.meshType);
  if (!cfg.renderer) cfg.renderer = {};
  cfg.renderer.materialBackend = 'TSL';
  applyStage(cfg, stage); // mutates the plain-object part; map/textures stay.
  const merged = cfg;
  const system = createParticleSystem(merged);
  scene.add(system.instance);
  const snap = system.gpuDebug?.snapshot ? system.gpuDebug.snapshot() : null;
  console.log(`[PS:create] card #${id}`, {
    rendererType: snap?.rendererType ?? merged.renderer?.rendererType,
    simulationSpace: snap?.simulationSpace ?? merged.simulationSpace,
    maxParticles: snap?.maxParticles ?? merged.maxParticles,
    stage: STAGES[stage],
  });
  console.log(`[PS:config] card #${id}`, snap);
  console.log(`[PS:pipeline] card #${id}`, {
    passes: system.gpuDebug?.allPassNames ?? system.gpuDebug?.passNames,
    storageBindings: system.gpuDebug?.storageBindingCount,
    curveTables: merged ? undefined : undefined,
  });
  const ctx = {
    id, renderer, scene, camera, system, paused: false, elapsed: 0,
    clock: makeClock(), cfg: merged, snap, stage,
    frames: [], milestoneIdx: 0, probeBusy: false,
    lastBucket: '',
  };
  cards.set(id, ctx);
  return ctx;
}

async function playCard(id) {
  let ctx = cards.get(id);
  if (!ctx || ctx.stage !== cardStage) {
    if (ctx && ctx.stage !== cardStage) {
      try { ctx.system.dispose?.(); ctx.renderer.dispose?.(); } catch {}
      cards.delete(id);
    }
    const e = examples.find((x) => x.id === id);
    if (!e) return;
    ctx = await makeCtx(id, e, cardStage);
  }
  if (!ctx) return;
  if (activeId && activeId !== id) {
    try { cards.get(activeId).renderer.setAnimationLoop(null); } catch {}
    cancelAnimationFrame(activeLoop);
  }
  activeId = id;
  ctx.clock.getDelta();
  ctx.milestoneIdx = 0;
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('active', c.dataset.name === id));
  const step = () => {
    if (activeId !== id) return;
    const d = ctx.clock.getDelta();
    ctx.elapsed += d;
    ctx.frames.push(d);
    if (ctx.frames.length > 32) ctx.frames.shift();
    if (!ctx.paused) {
      updateParticleSystems({ now: Date.now(), delta: d, elapsed: ctx.elapsed });
      if (ctx.system.computeNode) ctx.renderer.compute(ctx.system.computeNode);
    }
    ctx.renderer.render(ctx.scene, ctx.camera);
    const st = document.getElementById('stats-' + id);
    if (st) {
      const med = median(ctx.frames) || d;
      const fps = 1 / Math.max(med, 1e-4);
      if (!String(st.textContent).startsWith('GPU emit')) {
        st.textContent = `${fps.toFixed(0)} FPS (median ${(med * 1000).toFixed(1)}ms)`;
      } else {
        st.dataset.fps = `${fps.toFixed(0)} FPS (median ${(med * 1000).toFixed(1)}ms) | `;
      }
    }
    const elMs = ctx.elapsed * 1000;
    // frame 1
    if (ctx.frames.length === 1 && !ctx.frame1Logged) {
      ctx.frame1Logged = true;
      console.log(`[PS:frame:1] ${id} first frame presented`);
    }
    if (PARTICLE_DEBUG && !ctx.probeBusy) {
      while (
        ctx.milestoneIdx < MILESTONES_MS.length &&
        elMs >= MILESTONES_MS[ctx.milestoneIdx]
      ) {
        const tag = `${MILESTONES_MS[ctx.milestoneIdx]}ms`;
        ctx.milestoneIdx++;
        ctx.probeBusy = true;
        runProbe(ctx, tag).finally(() => { ctx.probeBusy = false; });
      }
      // After the 10 s milestone: state-change-only logging (§26).
      if (ctx.milestoneIdx >= MILESTONES_MS.length && elMs > 0) {
        const dbg = ctx.system.gpuDebug;
        const bucket = dbg
          ? `${Math.min(2, Math.floor(dbg.lastEmitCount() / 1) || 0)}|${Math.min(4, Math.floor((ctx.system.gpuDebug.buffers.allocator?.array?.[0] || 0) / Math.max(1, ctx.snap?.maxParticles || 1) * 3))}`
          : '';
        if (bucket && bucket !== ctx.lastBucket) {
          ctx.lastBucket = bucket;
          console.log(`[PS:state] ${id} @${elMs.toFixed(0)}ms emit=${bucket}`);
        }
      }
    }
    activeLoop = requestAnimationFrame(step);
  };
  activeLoop = requestAnimationFrame(step);
}

// ─── Expand modal (one persistent WebGPU renderer reused across entries) ───
const exp = { id: null, renderer: null, scene: null, camera: null, system: null, clock: null, paused: false, elapsed: 0, loop: 0, cfg: null, ctxLike: null, milestoneIdx: 0, probeBusy: false, frames: [] };
async function openExpand(id) {
  const entry = examples.find((e) => e.id === id);
  if (!entry) return;
  exp.id = id;
  document.getElementById('expand-title').textContent = entry.title;
  document.getElementById('expand-overlay').classList.add('open');
  const cnv = document.getElementById('expand-canvas');
  if (!exp.renderer) {
    exp.renderer = new THREE.WebGPURenderer({ canvas: cnv, antialias: true });
    exp.renderer.setSize(cnv.clientWidth || 736, cnv.clientHeight || 480, true);
    await exp.renderer.init();
    exp.renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (!enableWebGPU(exp.renderer)) throw new Error('examples.html requires a native WebGPU compute backend');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const pl = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true })
    );
    pl.rotation.x = -Math.PI / 2; scene.add(pl);
    const cam = new THREE.PerspectiveCamera(45, cnv.clientWidth / Math.max(1, cnv.clientHeight) || 1, 1, 100);
    cam.position.set(0, 0, 6);
    exp.scene = scene; exp.camera = cam;
  }
  let cfg = prepareConfig(entry.config, entry.textureId, entry.meshType);
  if (!cfg.renderer) cfg.renderer = {};
  cfg.renderer.materialBackend = 'TSL';
  cfg = applyStage(cfg, expandStage);
  try { exp.system?.dispose?.(); } catch {}
  exp.system = createParticleSystem(cfg);
  while (exp.scene.children.length > 1) exp.scene.remove(exp.scene.children[exp.scene.children.length - 1]);
  exp.scene.add(exp.system.instance);
  exp.clock = makeClock(); exp.elapsed = 0; exp.cfg = cfg; exp.milestoneIdx = 0;
  exp.ctxLike = { id: id, renderer: exp.renderer, system: exp.system, get elapsed() { return exp.elapsed; } };
  document.getElementById('expand-renderer-label').textContent = cfg.renderer.rendererType;
  document.getElementById('expand-backend-label').textContent = 'GPU';
  cancelAnimationFrame(exp.loop);
  const fEl = document.getElementById('expand-fps');
  const tEl = document.getElementById('expand-frametime');
  const eEl = document.getElementById('expand-elapsed');
  exp.frames = [];
  const loop = () => {
    if (!document.getElementById('expand-overlay').classList.contains('open')) return;
    const d = exp.clock.getDelta();
    exp.elapsed += d;
    exp.frames.push(d);
    if (exp.frames.length > 32) exp.frames.shift();
    if (!exp.paused) {
      updateParticleSystems({ now: Date.now(), delta: d, elapsed: exp.elapsed });
      if (exp.system.computeNode) exp.renderer.compute(exp.system.computeNode);
    }
    exp.renderer.render(exp.scene, exp.camera);
    const med = median(exp.frames) || d;
    if (fEl) fEl.textContent = `${(1 / Math.max(med, 1e-4)).toFixed(0)} FPS (median ${(med * 1000).toFixed(1)}ms/tick)`;
    if (tEl) tEl.textContent = `last ${(d * 1000).toFixed(1)} ms`;
    if (eEl) eEl.textContent = `${exp.elapsed.toFixed(1)}s`;
    const elMs = exp.elapsed * 1000;
    if (PARTICLE_DEBUG && !exp.probeBusy) {
      while (
        exp.milestoneIdx < MILESTONES_MS.length &&
        elMs >= MILESTONES_MS[exp.milestoneIdx]
      ) {
        const tag = `${MILESTONES_MS[exp.milestoneIdx]}ms`;
        exp.milestoneIdx++;
        exp.probeBusy = true;
        runProbe(exp.ctxLike, tag).finally(() => { exp.probeBusy = false; });
      }
    }
    exp.loop = requestAnimationFrame(loop);
  };
  exp.loop = requestAnimationFrame(loop);
}

// ─── DOM builder per card ───
function buildCard(entry) {
  const card = document.createElement('div');
  card.className = 'card'; card.dataset.name = entry.id;
  const wrap = document.createElement('div'); wrap.className = 'card-canvas-wrapper';
  const img = document.createElement('img'); img.className = 'preview-img';
  img.src = `./previews/${entry.id}.webp`; img.alt = entry.title;
  img.onerror = () => img.remove();
  wrap.appendChild(img);
  const ov = document.createElement('div'); ov.className = 'play-overlay';
  ov.innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34"><polygon points="4,2 20,12 4,22" fill="#fff"/></svg>';
  wrap.appendChild(ov);
  const cnv = document.createElement('canvas'); cnv.id = 'canvas-' + entry.id; wrap.appendChild(cnv);
  const st = document.createElement('div'); st.className = 'card-stats';
  st.id = 'stats-' + entry.id; st.textContent = '-- FPS  -- ms  0.0s';
  wrap.appendChild(st);
  card.appendChild(wrap);

  const info = document.createElement('div'); info.className = 'card-info';
  const h3 = document.createElement('h3'); h3.textContent = entry.title; info.appendChild(h3);
  const p = document.createElement('p'); p.textContent = entry.description; info.appendChild(p);
  const tags = document.createElement('div'); tags.className = 'card-tags';
  (entry.tags || []).forEach((t) => { const s = document.createElement('span'); s.className = 'tag'; s.textContent = t; tags.appendChild(s); });
  info.appendChild(tags);

  const ctrl = document.createElement('div'); ctrl.className = 'card-controls';
  const gpuChip = document.createElement('span');
  gpuChip.className = 'tag'; gpuChip.textContent = hasWebGPU() ? 'GPU' : 'no WebGPU';
  const stageSel = document.createElement('select');
  stageSel.className = 'tag';
  STAGES.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = String(i); o.textContent = s;
    if (i === cardStage) o.selected = true;
    stageSel.appendChild(o);
  });
  stageSel.title = 'Debug birth stage (cloned config; engine untouched)';
  stageSel.addEventListener('change', () => {
    cardStage = Number(stageSel.value) || 0;
    const c = cards.get(entry.id);
    if (c) { try { c.system.dispose?.(); c.renderer.dispose?.(); } catch {} cards.delete(entry.id); }
    if (activeId === entry.id) playCard(entry.id);
  });
  const btns = document.createElement('div'); btns.className = 'card-btns';
  const ib = (svg, title) => { const b = document.createElement('button'); b.className = 'icon-btn'; b.title = title; b.innerHTML = svg; return b; };
  const pB = ib('<svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>', 'Play');
  const rB = ib('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>', 'Restart');
  const eB = ib('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>', 'Expand');
  const cB = ib('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>', 'Copy config');
  const dB = ib('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>', 'Download config');
  pB.addEventListener('click', async () => { await playCard(entry.id); pB.classList.toggle('playing'); });
  rB.addEventListener('click', () => { const c = cards.get(entry.id); if (c) { c.elapsed = 0; c.milestoneIdx = 0; c.clock && c.clock.getDelta(); } });
  eB.addEventListener('click', () => openExpand(entry.id));
  cB.addEventListener('click', async () => { if (navigator.clipboard) await navigator.clipboard.writeText(JSON.stringify(entry.config, null, 2)); cB.classList.add('copied'); setTimeout(() => cB.classList.remove('copied'),1200); });
  dB.addEventListener('click', () => {
    const b = new Blob([JSON.stringify(entry.config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b);
    a.download = `${entry.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href),100);
  });
  btns.append(pB, rB, eB, cB, dB);
  ctrl.append(gpuChip, stageSel, btns); info.appendChild(ctrl); card.appendChild(info);
  return card;
}

// ─── Modal wiring (no backend toggle; single GPU chip) ───
document.getElementById('expand-close').addEventListener('click', () => {
  document.getElementById('expand-overlay').classList.remove('open');
  cancelAnimationFrame(exp.loop);
});
document.getElementById('expand-playpause-btn').addEventListener('click', () => (exp.paused = !exp.paused));
document.getElementById('expand-restart-btn').addEventListener('click', () => { exp.elapsed = 0; exp.milestoneIdx = 0; });
document.getElementById('expand-copy-btn')?.addEventListener('click', async () => {
  const e = examples.find((x) => x.id === exp.id);
  if (e && navigator.clipboard) await navigator.clipboard.writeText(JSON.stringify(e.config, null, 2));
});

// ─── GPU-only benchmark (particle-count sweep) ───
const bench = document.getElementById('bench-overlay');
document.getElementById('bench-open-btn')?.addEventListener('click', (ev) => { ev.preventDefault(); bench.classList.add('open'); });
document.getElementById('bench-close')?.addEventListener('click', () => bench.classList.remove('open'));
document.getElementById('bench-abort').addEventListener('click', () => { const s = document.getElementById('bench-status'); if (s) s.textContent = 'aborted'; });
const benchChart = document.getElementById('bench-chart');
const benchStatus = document.getElementById('bench-status');

// Single-configuration (bubble-surface-pop) 30 measured frames, median per-frame ms.
async function benchGpu(maxParticles, iters = 30) {
  const src = examples[0];
  const cfg = prepareConfig(src.config, src.textureId, src.meshType);
  cfg.maxParticles = maxParticles;
  if (!cfg.renderer) cfg.renderer = {};
  cfg.renderer.materialBackend = 'TSL';
  const rr = new THREE.WebGPURenderer({ antialias: true });
  rr.setSize(512, 288);
  await rr.init();
  rr.outputColorSpace = THREE.SRGBColorSpace;
  if (!enableWebGPU(rr)) { rr.dispose?.(); throw new Error('native WebGPU backend required'); }
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20, 4, 4),
    new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true })
  ));
  const cam = new THREE.PerspectiveCamera(45, 1, 1, 100); cam.position.set(0, 0, 6);
  const sys = createParticleSystem(cfg);
  scene.add(sys.instance);
  const step = async () => {
    updateParticleSystems({ now: Date.now(), delta: 1 / 60, elapsed: 0 });
    if (sys.computeNode) await rr.compute(sys.computeNode);
    await rr.render(scene, cam);
  };
  await step(); await step();      // 2 warm-up (JIT + first upload).
  const times = new Array(iters);
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now();
    await step();
    const t1 = performance.now();
    times[i] = t1 - t0;
  }
  const minMs = Math.min(...times);
  const medianMs = median(times);
  const p95 = times.slice().sort((a, b) => a - b)[Math.floor(times.length * 0.95)] ?? medianMs;
  try { sys.dispose?.(); rr.dispose?.(); } catch {}
  return { backend: `${(maxParticles / 1000).toFixed(0)}k`, fps: 1000 / Math.max(medianMs, 1e-3), medianMs, minMs, maxMs: Math.max(...times), p95 };
}
function drawBars(rs) {
  const ctx = benchChart.getContext('2d'); const W = benchChart.width, H = benchChart.height;
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); ctx.font = '10px monospace';
  if (!rs.length) return;
  const m = Math.max(1, ...rs.map((r) => r.fps));
  const gap = 24, bw = Math.max(20, (W - gap * (rs.length + 1)) / rs.length);
  rs.forEach((r, i) => {
    const x = gap + i * (bw + gap), h = (r.fps / m * (H - 42)) | 0;
    ctx.fillStyle = '#4fc3f7'; ctx.fillRect(x, H - h - 6, bw, h);
    ctx.fillStyle = '#e0e0e0'; ctx.textAlign = 'center';
    ctx.fillText(`${r.fps.toFixed(0)} FPS`, x + bw / 2, H - h - 12);
    ctx.fillText(r.backend, x + bw / 2, H - 16);
  });
}
document.getElementById('bench-run').addEventListener('click', async () => {
  if (!benchStatus) return; benchStatus.textContent = 'running???';
  const rs = [];
  try {
    for (const N of [50_000, 100_000, 200_000, 500_000, 1_000_000]) {
      rs.push(await benchGpu(N, 30));
      benchStatus.textContent = rs.map((r) => `${r.backend}: ${r.fps.toFixed(0)} FPS (median ${r.medianMs.toFixed(2)} ms)`).join(' | ');
    }
    drawBars(rs);
  } catch (e) { benchStatus.textContent = 'error: ' + (e && e.message ? e.message : e); }
});

// ─── Grid ───
const grid = document.getElementById('examples-grid');
for (const e of examples) grid.appendChild(buildCard(e));

// Manual one-shot probe stays available for deep dives.
window.__probeGPU = async (id = activeId) => {
  const ctx = (exp.id && id === exp.id && exp.ctxLike)
    ? exp.ctxLike
    : cards.get(id);
  if (!ctx) { console.warn('[probe] no ctx for', id); return null; }
  return runProbe(ctx, `manual:${ctx.elapsed.toFixed(0)}s`);
};

setTimeout(() => {
  console.log(`grid cards: ${grid.children.length}`);
}, 0);
