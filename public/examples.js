// examples.js ??? offline mirror for @cyberluke/three-particles 4.0.0 (GPU-only).
// Three.js r0.186 exposes `WebGPURenderer` under `three/webgpu`.

import * as THREE from 'three/webgpu';
import {
  REVISION,
  createParticleSystem,
  updateParticleSystems,
} from '@cyberluke/three-particles';
import { enableWebGPU } from '@cyberluke/three-particles/webgpu';
import { examples } from './lib/examples-data.js?v=5';

// Version stamp comes straight from the built engine module.
const verEl = document.getElementById('version-static');
if (verEl) verEl.textContent = `v${REVISION} (local)`;

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
// 4.x has a single backend: the engine itself rejects everything that isn't
// the native WebGPU compute path, so `prepareConfig` never branches. POINTS
// is promoted to INSTANCED because WGSL lacks gl_PointCoord.
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

// ─── Per-card ctx map (one WebGPU renderer per visible card) ───
const cards = new Map();
let activeId = null, activeLoop = 0;

async function makeCtx(id, entry) {
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
  const cfg = prepareConfig(entry.config, entry.textureId, entry.meshType);
  if (!cfg.renderer) cfg.renderer = {};
  cfg.renderer.materialBackend = 'TSL';
  const system = createParticleSystem(cfg);
  scene.add(system.instance);
  const ctx = { id, renderer, scene, camera, system, paused: false, elapsed: 0, clock: makeClock(), cfg };
  cards.set(id, ctx);
  return ctx;
}

async function playCard(id) {
  let ctx = cards.get(id);
  if (!ctx) {
    const e = examples.find((x) => x.id === id);
    if (!e) return;
    ctx = await makeCtx(id, e);
  }
  if (!ctx) return;
  if (activeId && activeId !== id) {
    try { cards.get(activeId).renderer.setAnimationLoop(null); } catch {}
    cancelAnimationFrame(activeLoop);
  }
  activeId = id;
  ctx.clock.getDelta();
  if (!('dbgLast' in ctx)) { ctx.dbgLast = 0; ctx.dbgTicks = 0; }
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('active', c.dataset.name === id));
  const step = () => {
    if (activeId !== id) return;
    const d = ctx.clock.getDelta();
    ctx.elapsed += d;
    ctx.dbgTicks++;
    if (!ctx.paused) {
      updateParticleSystems({ now: Date.now(), delta: d, elapsed: ctx.elapsed });
      if (ctx.system.computeNode) ctx.renderer.compute(ctx.system.computeNode);
    }
    ctx.renderer.render(ctx.scene, ctx.camera);
    const st = document.getElementById('stats-' + id);
    if (st) st.textContent = `${(1 / Math.max(d, 1e-4)).toFixed(0)} FPS ${(d * 1000).toFixed(1)}ms +${ctx.elapsed.toFixed(1)}s`;
    if (ctx.elapsed - ctx.dbgLast >= 1.0) { ctx.dbgLast = ctx.elapsed; debugSnapshot(`t=${ctx.dbgTicks}`, ctx); }
    activeLoop = requestAnimationFrame(step);
  };
  activeLoop = requestAnimationFrame(step);
}

// ─── Expand modal (one persistent WebGPU renderer reused across entries) ───
const exp = { id: null, renderer: null, scene: null, camera: null, system: null, clock: null, paused: false, elapsed: 0, loop: 0, cfg: null };
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
  const cfg = prepareConfig(entry.config, entry.textureId, entry.meshType);
  if (!cfg.renderer) cfg.renderer = {};
  cfg.renderer.materialBackend = 'TSL';
  try { exp.system?.dispose?.(); } catch {}
  exp.system = createParticleSystem(cfg);
  while (exp.scene.children.length > 1) exp.scene.remove(exp.scene.children[exp.scene.children.length - 1]);
  exp.scene.add(exp.system.instance);
  exp.clock = makeClock(); exp.elapsed = 0; exp.cfg = cfg;
  document.getElementById('expand-renderer-label').textContent = cfg.renderer.rendererType;
  // 4.x is GPU-only; the single label is enough (no toggle).
  document.getElementById('expand-backend-label').textContent = 'GPU';
  cancelAnimationFrame(exp.loop);
  const fEl = document.getElementById('expand-fps');
  const tEl = document.getElementById('expand-frametime');
  const eEl = document.getElementById('expand-elapsed');
  const loop = () => {
    if (!document.getElementById('expand-overlay').classList.contains('open')) return;
    const d = exp.clock.getDelta();
    exp.elapsed += d;
    if (!exp.paused) {
      updateParticleSystems({ now: Date.now(), delta: d, elapsed: exp.elapsed });
      if (exp.system.computeNode) exp.renderer.compute(exp.system.computeNode);
    }
    exp.renderer.render(exp.scene, exp.camera);
    if (fEl) fEl.textContent = `${(1 / Math.max(d, 1e-4)).toFixed(0)} FPS`;
    if (tEl) tEl.textContent = `${(d * 1000).toFixed(1)} ms/tick`;
    if (eEl) eEl.textContent = `${exp.elapsed.toFixed(1)}s`;
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
  const btns = document.createElement('div'); btns.className = 'card-btns';
  const ib = (svg, title) => { const b = document.createElement('button'); b.className = 'icon-btn'; b.title = title; b.innerHTML = svg; return b; };
  const pB = ib('<svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>', 'Play');
  const rB = ib('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>', 'Restart');
  const eB = ib('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>', 'Expand');
  const cB = ib('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>', 'Copy config');
  const dB = ib('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>', 'Download config');
  pB.addEventListener('click', async () => { await playCard(entry.id); pB.classList.toggle('playing'); });
  rB.addEventListener('click', () => { const c = cards.get(entry.id); if (c) { c.elapsed = 0; c.clock && c.clock.getDelta(); } });
  eB.addEventListener('click', () => openExpand(entry.id));
  cB.addEventListener('click', async () => { if (navigator.clipboard) await navigator.clipboard.writeText(JSON.stringify(entry.config, null, 2)); cB.classList.add('copied'); setTimeout(() => cB.classList.remove('copied'),1200); });
  dB.addEventListener('click', () => {
    const b = new Blob([JSON.stringify(entry.config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b);
    a.download = `${entry.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href),100);
  });
  btns.append(pB, rB, eB, cB, dB);
  ctrl.append(gpuChip, btns); info.appendChild(ctrl); card.appendChild(info);
  return card;
}

// ─── Modal wiring (no backend toggle; single GPU chip) ───
document.getElementById('expand-close').addEventListener('click', () => {
  document.getElementById('expand-overlay').classList.remove('open');
  cancelAnimationFrame(exp.loop);
});
document.getElementById('expand-playpause-btn').addEventListener('click', () => (exp.paused = !exp.paused));
document.getElementById('expand-restart-btn').addEventListener('click', () => (exp.elapsed = 0));
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
  times.sort((a, b) => a - b);
  const medianMs = times[times.length >> 1];
  try { sys.dispose?.(); rr.dispose?.(); } catch {}
  return { backend: `${(maxParticles / 1000).toFixed(0)}k`, fps: 1000 / Math.max(medianMs, 1e-3), medianMs, minMs: times[0], maxMs: times[times.length - 1] };
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

// ─── Grid + one-shot snapshot ───
const grid = document.getElementById('examples-grid');
for (const e of examples) grid.appendChild(buildCard(e));

// Metadata-only snapshot. The CPU BufferAttribute arrays are upload-only mirrors
// of the GPU storage in this GPU-only engine, so no per-particle CPU scan is done.
function debugSnapshot(tag, ctx) {
  if (!ctx || !ctx.system || !ctx.system.instance) { console.warn(`[${tag}] no system`); return; }
  const geo = ctx.system.instance.geometry;
  const n = ctx.system.instance.instanceCount ?? geo?.instanceCount ?? 0;
  const m = ctx.system.instance.material;
  console.log(`[${tag}] ${ctx.id} ${ctx.elapsed.toFixed(2)}s`, {
    rendererType: ctx.cfg.renderer?.rendererType || "POINTS",
    maxParticles: ctx.cfg.maxParticles,
    instanceCount: n,
    material: m?.type,
    // ParticleSystem exposes computeNode (a [emitNode, simNode] array in the
    // GPU-only engine); the old computePipeline lookup never resolved.
    computeNodeCount: Array.isArray(ctx.system.computeNode)
      ? ctx.system.computeNode.length
      : (ctx.system.computeNode ? 1 : 0),
    map: m?.uniforms?.map?.value?.image ? "loaded" : (m?.uniforms?.map?.value ? "in-flight" : "none"),
    canvas: [ctx.renderer.domElement.width | 0, ctx.renderer.domElement.height | 0]
  });
}
setTimeout(() => {
  for (const [id, ctx] of cards.entries()) debugSnapshot('init', ctx);
// ??? One-shot GPU state probe (manual only, no automatic per-frame read-back) ???
// Reads a handful of bytes through r186 getArrayBufferAsync(attribute, target,
// byteOffset, byteCount) - offset and count are BYTES (multiples of 4).
window.__probeGPU = async (id = activeId) => {
  const ctx = (exp.id && id === exp.id)
    ? { renderer: exp.renderer, system: exp.system }
    : cards.get(id);
  const dbg = ctx && ctx.system && ctx.system.gpuDebug;
  if (!dbg) { console.warn('[probe] no gpuDebug for', id); return null; }
  const maxParticles = dbg.maxParticles;
  const out = {
    id,
    maxParticles,
    allocatorCount: dbg.allocatorCount,
    freeCount: null,
    activeCount: null,
    lastEmitCount: dbg.lastEmitCount(),
    emitNodeCount: (dbg.emitNode && dbg.emitNode.count) ?? null,
    computeNodeCount: Array.isArray(ctx.system.computeNode)
      ? ctx.system.computeNode.length
      : (ctx.system.computeNode ? 1 : 0),
    sampleWindow: null,
    firstActive: null,
    activeInSample: 0,
  };
  const allocAB = await ctx.renderer.getArrayBufferAsync(dbg.buffers.allocator, null, 0, 4);
  out.freeCount = new Uint32Array(allocAB)[0];
  out.activeCount = maxParticles - out.freeCount;
  // Allocator pops from the high end, so the last 64 slots hold the newest ids.
  const sampleCount = 64;
  const firstSlot = maxParticles - sampleCount;
  const byteOffset = firstSlot * 16;
  const byteCount = sampleCount * 16;
  out.sampleWindow = [firstSlot, maxParticles - 1];
  const read = async (key) => new Float32Array(
    await ctx.renderer.getArrayBufferAsync(dbg.buffers[key], null, byteOffset, byteCount)
  );
  const pos = await read('position');
  const col = await read('color');
  const stt = await read('particleState');
  const orb = await read('orbitalIsActive');
  for (let s = 0; s < sampleCount; s++) {
    const o = s * 4;
    if (col[o + 3] > 0 || orb[o + 3] > 0.5) {
      out.activeInSample++;
      if (out.firstActive === null) {
        out.firstActive = {
          absoluteSlotIndex: firstSlot + s,
          position: [pos[o], pos[o + 1], pos[o + 2], pos[o + 3]],
          color: [col[o], col[o + 1], col[o + 2], col[o + 3]],
          particleState: [stt[o], stt[o + 1], stt[o + 2], stt[o + 3]],
          orbitalIsActive: [orb[o], orb[o + 1], orb[o + 2], orb[o + 3]],
        };
      }
    }
  }
  console.log('[GPU PROBE]', out);
  return out;
};
  console.log(`grid cards: ${grid.children.length}`);
}, 0);
