// examples.js ??? offline mirror of https://newkrok/three-particles/
// three @0.182.0: `WebGPURenderer` lives under `three/webgpu`; use that
// namespace for the example page (the plain `three` module does NOT
// re-export it).

import * as THREE from 'three/webgpu';
import {
  REVISION,
  createParticleSystem,
  updateParticleSystems,
} from '@cyberluke/three-particles';
import { enableWebGPU } from '@cyberluke/three-particles/webgpu';
import { examples } from './lib/examples-data.js?v=5';

const verEl = document.getElementById('version-static');
if (verEl) verEl.textContent = `v${REVISION} (local)`;

// tiny clock ??? 3.js's `Clock` is in `three/core` and not re-exported by
// `three.module.min.js`; we just need ms deltas.
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

// Upstream TEXTURE_MAP. Relative names match the 31 files in public/textures/.
const TEXTURE_MAP = {
  FLAME:            './textures/flame.webp',
  CLOUD:            './textures/cloud.webp',
  SNOWFLAKE:        './textures/snowflake.webp',
  GRADIENT_POINT:   './textures/gradient-point.webp',
  VORTEX:           './textures/vortex.webp',
  STAR:             './textures/star.webp',
  POINT:            './textures/point.webp',
  PLUS_TOON:        './textures/plus-toon.webp',
  SNOWFLAKE_DETAILED:'./textures/snowflake-detailed.webp',
  SQUARE:           './textures/square.webp',
  CIRCLE:           './textures/circle.webp',
  LEAF_TOON:        './textures/leaf-toon.webp',
  SKULL:            './textures/skull.webp',
  ROCKS:            './textures/rocks.webp',
  STARBURST:        './textures/starbust.webp',
  SOFT_SMOKE:       './textures/soft-smoke.webp',
  BUBBLES:          './textures/bubbles.webp',
  FEATHER:          './textures/feather.webp',
  FLARE:            './textures/flare.webp',
  HEART:            './textures/heart.webp',
  MOON:             './textures/moon.webp',
  LIGHT_STREAK:     './textures/light-streak.webp',
  RADIAL_BRUST:     './textures/radial-brust.webp',
  RAINDROP:         './textures/raindrop.webp',
  CONFETTI:         './textures/confetti.webp',
  CONFETTI_TOON:    './textures/confetti-toon.webp',
  NUMBERS:          './textures/numbers.webp',
  NUMBERS_TOON:     './textures/numbers-toon.webp',
  STAR_TOON:        './textures/star-toon.webp',
  MAGIC_EXPLOSION:  './textures/magic-explosion.webp',
  PLUS:             './textures/plus.webp',
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

// Upstream blending: JSON stores the string; the numeric THREE constant is needed by the material.
function resolveBlending(v) {
  if (typeof v === 'number') return v;
  if (v === 'THREE.AdditiveBlending')   return THREE.AdditiveBlending;
  if (v === 'THREE.MultiplyBlending')   return THREE.MultiplyBlending;
  if (v === 'THREE.SubtractiveBlending')return THREE.SubtractiveBlending;
  return THREE.NormalBlending;
}

// Upstream's RendererType.MESH geometry factories (10 kinds, from examples/main.js MESH_GEOMETRIES).
// The examples-data.js only stores `meshType` as a string on the entry; the
// library expects `renderer.mesh.geometry` to be a live THREE.BufferGeometry.
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
function prepareConfig(cfg0, textureId, meshType, forceGPU) {
  const cfg = JSON.parse(JSON.stringify(cfg0 || {}));
  delete cfg._editorData;
  // Upstream: force CPU when no real WebGPU backend. The chip on the card
  // shows the *requested* backend; `simulationBackend` is the *actual* one.
  // GPU-only: 4.x rejects simulationBackend='CPU', so hard-set 'GPU' (no fallback).
  cfg.simulationBackend = 'GPU';
  if (!cfg.renderer) cfg.renderer = {};
  // POINTS relies on gl_PointCoord which is unsupported in WGSL ??? INSTANCED on WebGPU.
  // WGSL has no gl_PointCoord; always promote POINTS ? INSTANCED.
  { const rt = cfg.renderer.rendererType; if (!rt || rt === 'POINTS') cfg.renderer.rendererType = 'INSTANCED'; }
  if (cfg.renderer.blending) cfg.renderer.blending = resolveBlending(cfg.renderer.blending);
  const tex = loadTexture(textureId);
  if (tex) cfg.map = tex;
  // per-sub-emitter blending + texture
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
  // MESH geometry (TORUS, BOX, ???)
  if (meshType && MESH_GEOMETRIES[meshType]) {
    cfg.renderer = cfg.renderer || {};
    cfg.renderer.mesh = { geometry: MESH_GEOMETRIES[meshType]() };
  }
  return cfg;
}

// per-card 3D state
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
  // WebGPU registration must happen after init() with the live renderer so
  // the engine can inspect `renderer.backend.isWebGPUBackend` and refuse to
  // create a system under a WebGL2 fallback. No silent CPU path exists in 4.x.
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

  // forceGPU = real WebGPU backend only. 3-particles takes the TSL branch
  // because enableWebGPU() registered the factory; the CPU/GPU chip reflects
  // the same rule the Svelte editor uses.
  const isN = !!renderer.backend?.isWebGPUBackend;
  const cfg = prepareConfig(entry.config, entry.textureId, entry.meshType, isN);
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
  if (!ctx) { const e = examples.find((x) => x.id === id); if (!e) return; ctx = await makeCtx(id, e); }
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

// --- expand modal (single reused renderer) --------------------------------
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
  const cfg = prepareConfig(entry.config, entry.textureId, entry.meshType, !!exp.renderer.backend?.isWebGPUBackend);
  if (!cfg.renderer) cfg.renderer = {};
  cfg.renderer.materialBackend = 'TSL';
  try { exp.system?.dispose?.(); } catch {}
  exp.system = createParticleSystem(cfg);
  while (exp.scene.children.length > 1) exp.scene.remove(exp.scene.children[exp.scene.children.length - 1]);
  exp.scene.add(exp.system.instance);
  exp.clock = makeClock(); exp.elapsed = 0; exp.cfg = cfg;
  document.getElementById('expand-renderer-label').textContent = cfg.renderer.rendererType;
  const isGPU = !!exp.system.computeNode;
  document.getElementById('expand-backend-label').textContent = isGPU ? 'GPU' : 'CPU';
  document.getElementById('expand-cpu-btn').classList.toggle('active', !isGPU);
  document.getElementById('expand-gpu-btn').classList.toggle('active', isGPU);
  document.getElementById('expand-gpu-btn').disabled = !isN || isN === null;
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
function rebuildExpand(e, backend) {
  if (!e.id) return;
  const ent = examples.find((x) => x.id === e.id);
  const cfg = prepareConfig(ent.config, ent.textureId, ent.meshType, backend === 'GPU' && !!e.renderer?.backend?.isWebGPUBackend);
  if (!cfg.renderer) cfg.renderer = {};
  cfg.renderer.materialBackend = 'TSL';
  try { e.system?.dispose?.(); } catch {}
  e.system = createParticleSystem(cfg);
  while (e.scene.children.length > 1) e.scene.remove(e.scene.children[e.scene.children.length - 1]);
  e.scene.add(e.system.instance);
  document.getElementById('expand-backend-label').textContent = e.system.computeNode ? 'GPU' : 'CPU';
  document.getElementById('expand-cpu-btn').classList.toggle('active', !e.system.computeNode);
  document.getElementById('expand-gpu-btn').classList.toggle('active', !!e.system.computeNode);
}

// --- DOM builder ----------------------------------------------------------
function buildCard(entry) {
  const card = document.createElement('div');
  card.className = 'card'; card.dataset.name = entry.id;
  const wrap = document.createElement('div'); wrap.className = 'card-canvas-wrapper';
  const img = document.createElement('img'); img.className = 'preview-img';
  // previews/ holds the 53 webp files taken from the upstream examples/previews/.
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
  const tog = document.createElement('div'); tog.className = 'backend-toggle';
  const cpuB = document.createElement('button'); cpuB.textContent = 'CPU'; cpuB.disabled = true;
  const gpuB = document.createElement('button'); gpuB.textContent = 'GPU';
  // initial active chip = config.simulationBackend ('AUTO' resolves to the
// actual backend capability). Matches the 5 upstream cards' chip.
  const native = hasWebGPU();
  const sim = String(entry.config?.simulationBackend || 'AUTO').toUpperCase();
  let active = 'CPU';
  if (native && (sim === 'GPU' || sim === 'AUTO')) active = 'GPU';
  if (!native) { gpuB.disabled = true; cpuB.classList.add('active'); }
  else (active === 'GPU' ? gpuB : cpuB).classList.add('active');
  tog.append(cpuB, gpuB);

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
  ctrl.append(tog, btns); info.appendChild(ctrl); card.appendChild(info);
  return card;
}

// --- modal wiring ---------------------------------------------------------
document.getElementById('expand-close').addEventListener('click', () => {
  document.getElementById('expand-overlay').classList.remove('open');
  cancelAnimationFrame(exp.loop);
});
document.getElementById('expand-cpu-btn')?.addEventListener('click', () => rebuildExpand(exp, 'CPU'));
document.getElementById('expand-gpu-btn')?.addEventListener('click', () => rebuildExpand(exp, 'GPU'));
document.getElementById('expand-playpause-btn').addEventListener('click', () => (exp.paused = !exp.paused));
document.getElementById('expand-restart-btn').addEventListener('click', () => (exp.elapsed = 0));
document.getElementById('expand-copy-btn')?.addEventListener('click', async () => {
  const e = examples.find((x) => x.id === exp.id);
  if (e && navigator.clipboard) await navigator.clipboard.writeText(JSON.stringify(e.config, null, 2));
});

const bench = document.getElementById('bench-overlay');
document.getElementById('bench-open-btn')?.addEventListener('click', (ev) => { ev.preventDefault(); bench.classList.add('open'); });
document.getElementById('bench-close')?.addEventListener('click', () => bench.classList.remove('open'));
document.getElementById('bench-abort').addEventListener('click', () => { const s = document.getElementById('bench-status'); if (s) s.textContent = 'aborted'; });
const benchChart = document.getElementById('bench-chart');
const benchStatus = document.getElementById('bench-status');
async function benchRun(backend, iters = 30) {
  const src = examples[0];
  const cfg = prepareConfig(src.config, src.textureId, src.meshType, backend === 'GPU');
  if (!cfg.renderer) cfg.renderer = {};
  cfg.renderer.materialBackend = 'TSL';
  const rr = new THREE.WebGPURenderer({ antialias: true });
  rr.setSize(512, 288);
  await rr.init();
  rr.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20, 4, 4),
    new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true })
  ));
  const cam = new THREE.PerspectiveCamera(45, 1, 1, 100); cam.position.set(0, 0, 6);
  const sys = createParticleSystem(cfg);
  scene.add(sys.instance);
  // 2 warm-up iterations not counted (JIT upload + first GPU queue flush).
  const step = async () => {
    updateParticleSystems({ now: Date.now(), delta: 1 / 60, elapsed: 0 });
    if (sys.computeNode) await rr.compute(sys.computeNode);
    await rr.render(scene, cam);
  };
  await step(); await step();
  // Fixed-60 Hz delta per-frame timing; 3.js's async render is awaited so the
  // number is the true end-of-frame delta instead of just the JS submit.
  const times = new Array(iters);
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now();
    await step();
    const t1 = performance.now();
    times[i] = t1 - t0;
  }
  times.sort((a, b) => a - b);
  const medianMs = times[times.length >> 1];
  try { rr.dispose?.(); } catch {}
  // fps per-median-frame, ms median, min/max for the table.
  return { backend, fps: 1000 / Math.max(medianMs, 1e-3), medianMs, minMs: times[0], maxMs: times[times.length - 1] };
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
    rs.push(await benchRun('CPU', 30));
    if (hasWebGPU()) rs.push(await benchRun('GPU', 30));
    drawBars(rs);
    benchStatus.textContent = rs.map((r) => `${r.backend}: ${r.fps.toFixed(0)} FPS (median ${r.medianMs.toFixed(2)} ms)`).join(' | ');
  } catch (e) { benchStatus.textContent = 'error: ' + (e && e.message ? e.message : e); }
});

// 53 cards exactly like the upstream page.
const grid = document.getElementById('examples-grid');
for (const e of examples) grid.appendChild(buildCard(e));

// ---- debug console: one-shot for all cards, then 1 Hz for whichever is active.
function debugSnapshot(tag, ctx) {
  if (!ctx || !ctx.system || !ctx.system.instance) { console.warn(`[${tag}] no system`); return; }
  const geo = ctx.system.instance.geometry;
  const n = ctx.system.instance.instanceCount ?? geo?.instanceCount ?? 0;
  // instanceColor is Float32Array(maxParticles*4); count a>0 to see alive ones.
  const col = geo && geo.getAttribute('instanceColor');
  let alive = 0, firstNonZero = null;
  if (col && col.array) {
    const a = col.array;
    for (let i = 0; i < n; i++) {
      if (a[i * 4 + 3] > 0) {
        alive++;
        if (firstNonZero === null) firstNonZero = i;
      }
    }
  }
  // first 4 instanceOffset tuples for sanity
  const offs = geo && geo.getAttribute('instanceOffset');
  const off = offs && offs.array ? [ [+offs.array[0], +offs.array[1], +offs.array[2]],
    (+offs.array[3]||0)?[+offs.array[3],+offs.array[4],+offs.array[5]]:null,
    (+offs.array[6]||0)?[+offs.array[6],+offs.array[7],+offs.array[8]]:null,
    (+offs.array[9]||0)?[+offs.array[9],+offs.array[10],+offs.array[11]]:null ] : [];
  console.log(`[${tag}] ${ctx.id} ${ctx.elapsed.toFixed(2)}s`,
    { maxParticles: ctx.cfg.maxParticles,
      instanceCount: n, alive, firstNonZero,
      offsetProbe: off,
      material: ctx.system.instance.material?.type,
      computeNode: !!ctx.system.computeNode,
      map: ctx.system.instance.material?.uniforms?.map?.value?.image ? 'loaded' : (ctx.system.instance.material?.uniforms?.map?.value ? 'in-flight':'none'),
      canvas: [ctx.renderer.domElement.width | 0, ctx.renderer.domElement.height | 0]
    });
}
// one-shot after first paint of each freshly created ctx:
const _origMakeCtx = makeCtx;
// run the same init then snapshot in a microtask so the geometry exists.
setTimeout(() => {
  for (const [id, ctx] of cards.entries()) debugSnapshot('init', ctx);
  console.log(`grid cards: ${grid.children.length}`);
}, 0);

