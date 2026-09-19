/* eslint-disable no-console */
// RUNTIME-GRAPH STATIC GATE (pure JS — no Chrome, no Jest).
//
//   node scripts/gate-runtime.mjs
//
// 1. Compiles EVERY compute node of EVERY shipped example config through
//    THREE.WGSLNodeBuilder (exactly what the GPU backend compiles), then:
//      - counts REAL per-pass storage/uniform bindings from the WGSL header,
//      - finite-token scan (§3): NaN / Infinity / -Infinity / undefined /
//        atomic<f32> / atomic<vec must not appear anywhere,
//      - asserts every pass <= 8 storage bindings (portable WebGPU
//        `maxStorageBuffersPerShaderStage`; never 16).
// 2. Emits the [CANARY:gpu-supernova] receipt (full config, stage
//    +LIFETIME_VISUALS) with finite noise scalar receipts.
// 3. Prints `RUNTIME-GRAPH STATIC GATE PASS` and exits 0 iff every check
//    passed; otherwise exits 1 with the root error.
import { register } from 'node:module';
import { readFileSync } from 'node:fs';

register('./probe-importmap-loader.mjs', import.meta.url);

const THREE = await import('three/webgpu');
const tsl = await import('three/tsl');
const lib = await import('@cyberluke/three-particles/webgpu');
const core = await import('@cyberluke/three-particles');
const { context } = tsl;

const stub = {
  isNodeManager: true,
  contextNode: context(),
  library: { fromMaterial: (m) => m },
  constants: [],
  debug: { diagnostics: { keywords: [] }, onNodeBuilderCreated: null },
  backend: {
    isBackend: true,
    utils: { getTextureSampleData: () => ({ primarySamples: 1, imageSampleCount: 1 }) },
  },
  hasFeature: () => true,
  getRenderTargetTarget: () => ({}),
  getRenderTarget: () => null,
  xr: { enabled: false },
  lighting: { enabled: false },
  info: { render: {} },
};

// ─── §3 generated-WGSL finite-literal gate ─────────────────────────────────
// Helper per the rescue spec (plus `atomic<vec`, which the integer-metadata
// trail ring also never emits). Every generated WGSL string must pass.
const BAD_PATTERNS = [
  /\bNaN(?:\.0)?\b/,
  /\bInfinity\b/,
  /-Infinity/,
  /\bundefined\b/,
  /\batomic\s*<\s*f32\s*>/,
  /\batomic\s*<\s*vec/,
];

function assertFiniteWGSL(label, wgsl) {
  for (const re of BAD_PATTERNS) {
    if (re.test(wgsl)) {
      throw new Error(`${label}: invalid WGSL token ${re}`);
    }
  }
}

// ─── compile one compute node: real binding counts + finite scan ──────────
function compilePass(node) {
  let errors = 0;
  let threw = '';
  let shader = '';
  const prev = console.error;
  console.error = (...a) => {
    errors++;
    if (errors <= 3) prev(`   ${String(a[0]).split('\n')[0]}`);
  };
  try {
    const b = new THREE.WGSLNodeBuilder({}, stub);
    b.material = null;
    b.compute = node;
    b.scene = new THREE.Scene();
    b.build();
    shader = String(b.computeShader || '');
  } catch (e) {
    threw = String(e && e.message).split('\n')[0];
  } finally {
    console.error = prev;
  }
  if (threw) throw new Error(`WGSL build failed: ${threw}`);
  if (errors > 0) throw new Error(`WGSL builder reported ${errors} error(s)`);
  if (!shader) throw new Error('empty compute shader');
  assertFiniteWGSL('compute', shader);
  const storage = (shader.match(/var<storage/g) || []).length;
  const uniform = (shader.match(/var<uniform>/g) || []).length;
  return { storageBindings: storage, uniformBindings: uniform, bytes: shader.length };
}

// ─── harness: stage-5 full-config construction per example ─────────────────
lib.enableWebGPU({
  isWebGPURenderer: true,
  backend: { isBackend: true, isWebGPUBackend: true },
  compute: () => {},
  hasFeature: () => true,
});

const src = readFileSync('./packages/three-particles/examples/examples-data.js', 'utf8');
const examples = new Function(`return ${src.match(/\[[\s\S]*\]/)[0]}`)();

// Full config == stage +LIFETIME_VISUALS (5): nothing stripped from the
// shipped config except the harness-level POINTS->INSTANCED normalization.
function prepareConfig(cfg0, textureId, meshType) {
  const cfg = JSON.parse(JSON.stringify(cfg0 || {}));
  delete cfg._editorData;
  if (!cfg.renderer) cfg.renderer = {};
  cfg.simulationBackend = 'GPU';
  const rt = cfg.renderer.rendererType;
  if (!rt || rt === 'POINTS') cfg.renderer.rendererType = 'INSTANCED';
  if (textureId) {
    const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    t.needsUpdate = true;
    cfg.map = t;
  }
  void meshType;
  return cfg;
}

let passTotal = 0;
let failCount = 0;
const failList = [];
const rows = [];

function auditExample(ex) {
  const cfg = prepareConfig(ex.config, ex.textureId, ex.meshType);
  const sys = core.createParticleSystem(cfg);
  const nodes = Array.isArray(sys.computeNode) ? sys.computeNode : [sys.computeNode];
  const names = sys.gpuDebug?.allPassNames ?? sys.gpuDebug?.passNames ?? [];
  if (!nodes.length) throw new Error('no compute nodes');
  const perPass = [];
  nodes.forEach((node, k) => {
    const r = compilePass(node);
    const name = names[k] ?? `pass${k}`;
    perPass.push(`${name}=${r.storageBindings}`);
    if (r.storageBindings > 8) {
      throw new Error(`${name}: ${r.storageBindings} storage buffers > guaranteed limit 8`);
    }
    passTotal++;
  });
  // step 4 frames (constructor + update-path ReferenceError coverage)
  let t = Date.now();
  for (let i = 0; i < 4; i++) {
    t += 16;
    sys.update({ now: t, delta: 0.016, elapsed: i * 0.016 });
  }
  void perPass;
  return { id: ex.id, renderer: cfg.renderer.rendererType, passes: nodes.length, perPassText: perPass.join(' ') };
}

// ─── §10 exact canary: gpu-supernova, stage +LIFETIME_VISUALS ──────────────
const canaryEntry = examples.find((e) => e.id === 'gpu-supernova');
if (!canaryEntry) {
  console.log('[CANARY:gpu-supernova] FAILED: example not found');
  process.exit(1);
}
{
  const cfg = prepareConfig(canaryEntry.config, canaryEntry.textureId, canaryEntry.meshType);
  const sys = core.createParticleSystem(JSON.parse(JSON.stringify(cfg)));
  const nodes = sys.computeNode;
  const dbg = sys.gpuDebug;
  const passNames = dbg?.allPassNames ?? [];
  let t = Date.now();
  for (let i = 0; i < 4; i++) {
    t += 16;
    sys.update({ now: t, delta: 0.016, elapsed: i * 0.016 });
  }
  const emitCount = dbg.lastEmitCount();
  const snap = dbg.snapshot();
  const octaves = cfg.noise?.octaves || 1;
  const noiseFbmMax = 2 - Math.pow(2, -Math.max(1, Math.round(octaves)));
  const noiseScalars = [
    0.15 * Math.max(0, cfg.noise?.strength || 0), // noisePower as written by the CPU
    Number(cfg.noise?.frequency ?? 1),
    Number(cfg.noise?.positionAmount ?? 0),
    Number(cfg.noise?.rotationAmount ?? 0),
    Number(cfg.noise?.sizeAmount ?? 0),
  ];
  console.log('[CANARY:gpu-supernova]');
  console.log(`shape=${snap?.shape?.publicShape}`);
  console.log(`maxParticles=${snap?.maxParticles}`);
  nodes.forEach((node, k) => {
    const r = compilePass(node);
    const name = passNames[k] ?? `pass${k}`;
    console.log(`${name}.storage=${r.storageBindings}`);
    if (r.storageBindings > 8) {
      console.log(`FAIL ${name}: ${r.storageBindings} > 8`);
      process.exit(1);
    }
    passTotal++;
    if (name === 'emit' && (r.storageBindings < 1 || r.storageBindings > 8)) {
      console.log('FAIL emit bindings outside 1..8');
      process.exit(1);
    }
    if (name === 'simulate' && (r.storageBindings < 1 || r.storageBindings > 8)) {
      console.log('FAIL simulate bindings outside 1..8');
      process.exit(1);
    }
  });
  console.log(`noiseFbmMax=${noiseFbmMax}`);
  if (!Number.isFinite(noiseFbmMax) || noiseFbmMax <= 0 || !noiseScalars.every(Number.isFinite)) {
    console.log('FAIL non-finite noise scalar');
    process.exit(1);
  }
  console.log(`noiseScalars=[${noiseScalars.join(',')}]`);
  console.log(`lastEmit=${emitCount}`);
  console.log('WGSL.NaN=0');
  console.log('WGSL.Infinity=0');
  console.log('WGSL.atomicF32=0');
  console.log('PASS');
  rows.push({ id: 'gpu-supernova', renderer: cfg.renderer.rendererType, passes: nodes.length, perPassText: passNames.join(',') });
}

// ─── §11 static runtime-graph audit over all shipped examples ──────────────
for (const ex of examples) {
  try {
    const row = auditExample(ex);
    rows.push(row);
  } catch (e) {
    failCount++;
    failList.push(`${ex.id}: ${String(e && e.message).split('\n')[0]}`);
  }
}

for (const r of rows) {
  console.log(
    `id=${r.id} renderer=${r.renderer} passes=${r.passes} storage[${r.perPassText}] wgslFinite=ok status=PASS`
  );
}
console.log(`examples=${examples.length} passTotal=${passTotal} ok=${rows.length} failed=${failCount}`);
failList.slice(0, 8).forEach((f) => console.log(`FAIL ${f}`));
if (failCount > 0) {
  console.log('RUNTIME-GRAPH STATIC GATE FAIL');
  process.exit(1);
}
console.log('RUNTIME-GRAPH STATIC GATE PASS');
process.exit(0);
