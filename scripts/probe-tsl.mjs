/* eslint-disable no-console */
// Static (no Chrome) validation of the mirrored engine, using the same module graph
// the browser builds from public/examples.html.
//
//   node scripts/probe-tsl.mjs
//
// Expect: errors=0 for every renderer type and a non-trivial fragment shader body.
// `errors=3` with a ~682 B fragment (empty flow) means the mirror specifiers drifted
// away from the importmap URLs -> two `three.webgpu.js` instances.
import { register } from 'node:module';
register('./probe-importmap-loader.mjs', import.meta.url);

const THREE = await import('three/webgpu');
const tsl = await import('three/tsl');
const lib = await import('@cyberluke/three-particles/webgpu');
const { context } = tsl;
// With the importmap there is one three instance, so both entry points share Fn.
console.log('module identity (TSL.Fn shared):', tsl.Fn === THREE.TSL?.Fn);

const stub = {
  isNodeManager: true,
  contextNode: context(),
  library: { fromMaterial: (m) => m },
  constants: [],
  debug: { diagnostics: { keywords: [] }, onNodeBuilderCreated: null },
  backend: { isBackend: true, utils: { getTextureSampleData: () => ({ primarySamples: 1, imageSampleCount: 1 }) } },
  hasFeature: () => true,
  getRenderTargetTarget: () => ({}),
  getRenderTarget: () => null,
  xr: { enabled: false },
  lighting: { enabled: false },
  info: { render: {} },
};
const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
tex.needsUpdate = true;
const sharedUniforms = {
  elapsed: { value: 0 }, viewportHeight: { value: 720 },
  cameraNearFar: { value: new THREE.Vector2(0.1, 1000) }, map: { value: tex },
  fps: { value: 30 }, useFPSForFrameIndex: { value: true },
  tiles: { value: new THREE.Vector2(4, 4) }, discardBackgroundColor: { value: true },
  backgroundColor: { value: new THREE.Color(0, 0, 0) }, backgroundColorTolerance: { value: 0.1 },
  softParticlesEnabled: { value: false }, softParticlesIntensity: { value: 1 },
  sceneDepthTexture: { value: null },
};
const quad = (withUvNormal) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0]), 3));
  if (withUvNormal) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  }
  g.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
  return g;
};
const N = 8;
const f4 = () => new Float32Array(N * 4).fill(1);
const geomFor = (type) => {
  if (type === 'POINTS') {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.StorageBufferAttribute(new Float32Array(N * 4).fill(0.5), 4));
    ['color', 'particleState', 'startValues'].forEach((k) => g.setAttribute(k, new THREE.StorageBufferAttribute(f4(), 4)));
    g.setDrawRange(0, N);
    return g;
  }
  const g = quad(type === 'MESH');
  g.instanceCount = N;
  ['instanceOffset', 'instanceColor', 'instanceParticleState', 'instanceStartValues']
    .forEach((k) => g.setAttribute(k, new THREE.StorageInstancedBufferAttribute(f4(), 4)));
  return g;
};

const log = console.error;
for (const type of ['INSTANCED', 'MESH', 'POINTS']) {
  const geometry = geomFor(type);
  const material = lib.createTSLParticleMaterial(
    type, sharedUniforms, { transparent: true, blending: 2, depthTest: true, depthWrite: false }, true
  );
  const object = type === 'POINTS' ? new THREE.Points(geometry, material) : new THREE.Mesh(geometry, material);
  const messages = [];
  let errors = 0;
  console.error = (...a) => { errors++; messages.push(String(a[0]).split('\n')[0]); };
  const builder = new THREE.WGSLNodeBuilder(object, stub);
  builder.object = object; builder.material = material; builder.geometry = geometry;
  builder.scene = new THREE.Scene(); builder.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  builder.build();
  console.error = log;
  const vertex = String(builder.vertexShader || ''), fragment = String(builder.fragmentShader || '');
  log(`${type}: errors=${errors} vertex=${vertex.length}B fragment=${fragment.length}B`);
  messages.slice(0, 3).forEach((m) => log(`   ${m}`));
}

// ─── Compute kernels + shape decode + 53-example construction ───────────────
const compileCompute = (label, node) => {
  const prev = console.error;
  let errors = 0;
  const messages = [];
  console.error = (...a) => { errors++; messages.push(String(a[0]).split('\n')[0]); };
  let size = 0;
  let threw = '';
  try {
    const b = new THREE.WGSLNodeBuilder({}, stub);
    b.material = null; b.compute = node; b.scene = new THREE.Scene();
    b.build();
    size = String(b.computeShader || '').length;
  } catch (e) {
    threw = String(e && e.message).split('\n')[0];
  }
  console.error = prev;
  log(`${label}: code=${size}B errors=${errors}${threw ? ` threw=${threw}` : ''}`);
  messages.slice(0, 3).forEach((m) => log(`   ${m}`));
};

const cfg = {
  maxParticles: 64, duration: 5, looping: true, gravity: 0,
  simulationSpace: 'LOCAL', simulationBackend: 'GPU',
  startLifetime: { min: 1, max: 2 }, startSpeed: { min: 1, max: 2 },
  startSize: { min: 0.2, max: 0.5 }, startOpacity: 1,
  startRotation: { min: 0, max: 360 },
  startColor: { min: { r: 1, g: 1, b: 1 }, max: { r: 1, g: 1, b: 1 } },
  emission: { rateOverTime: 10, rateOverDistance: 0, bursts: [] },
  shape: {
    shape: 'SPHERE',
    sphere: { radius: 1.2, radiusThickness: 1, arc: 360 },
    cone: { angle: 25, radius: 1, radiusThickness: 1, arc: 360 },
    circle: { radius: 1, radiusThickness: 1, arc: 360 },
    rectangle: { rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1 } },
    box: { scale: { x: 1, y: 1, z: 1 }, emitFrom: 'VOLUME' },
  },
  renderer: { rendererType: 'INSTANCED', blending: 'THREE.AdditiveBlending', transparent: true, depthTest: true, depthWrite: false },
  sizeOverLifetime: { isActive: false }, opacityOverLifetime: { isActive: false },
  colorOverLifetime: { isActive: false }, rotationOverLifetime: { isActive: false },
  velocityOverLifetime: { isActive: false, linear: { x: 0, y: 0, z: 0 }, orbital: { x: 0, y: 0, z: 0 } },
  noise: { isActive: false }, forceFields: [], collisionPlanes: [],
  textureSheetAnimation: { isActive: false },
  transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
};
const pipeline = lib.createComputePipeline(64, true, cfg, 0, 0, 0, [], undefined);
compileCompute('EMIT', pipeline.computeNodes[0]);
compileCompute('SIM', pipeline.computeNodes[1]);

// Nested ShapeConfig -> flat GPU scalars (degrees, per-branch radii).
const sv = (k) => pipeline.shapeUniforms?.[k]?.value;
log(`decode SPHERE: kind=${sv('shapeKind')} radius=${sv('radius')} thickness=${sv('radiusThickness')} arc=${sv('arcDeg')} cone=${sv('coneAngleDeg')}`);
const nested = (shape, extra) => lib.createComputePipeline(
  64, true, { ...cfg, shape: { ...cfg.shape, shape, ...extra } }, 1, 0, 0, [], undefined
);
const pCone = nested('CONE', { cone: { angle: 35, radius: 0.5, radiusThickness: 1, arc: 360 } });
const pBox = nested('BOX', { box: { scale: { x: 8, y: 0.5, z: 8 }, emitFrom: 'SHELL' } });
const pRect = nested('RECTANGLE', { rectangle: { rotation: { x: 10, y: 20, z: 0 }, scale: { x: 3, y: 2 } } });
log(`decode CONE: kind=${pCone.shapeUniforms?.shapeKind?.value} radius=${pCone.shapeUniforms?.radius?.value} angle=${pCone.shapeUniforms?.coneAngleDeg?.value} (want 1/0.5/35)`);
log(`decode BOX: kind=${pBox.shapeUniforms?.shapeKind?.value} sx=${pBox.shapeUniforms?.boxScaleX?.value} sy=${pBox.shapeUniforms?.boxScaleY?.value} emitFrom=${pBox.shapeUniforms?.boxEmitFrom?.value} (want 4/8/0.5/1)`);
log(`decode RECT: kind=${pRect.shapeUniforms?.shapeKind?.value} sx=${pRect.shapeUniforms?.rectangleScaleX?.value} rX=${pRect.shapeUniforms?.rectangleRotXDeg?.value} rY=${pRect.shapeUniforms?.rectangleRotYDeg?.value} (want 3/3/10/2)`);

// Sub-emitter init kernel + trail ribbon kernel.
const childBufs = lib.createModifierStorageBuffers(64, false, new Float32Array(256), false, false).buffers;
const fifo = {
  attribute: lib.createSubEmitterFifoAttribute(4),
  trigger: 1, capacity: 4, windowSize: lib.subEmitterWindowSize?.(4) ?? 25,
};
const initPipe = lib.createSubEmitterInitUpdate(
  childBufs, 64, lib.encodeShapeEmitParams(cfg, 7), pipeline.buffers, 64, fifo, 0.5, 5
);
compileCompute('SUBEMIT', initPipe.initNode);
const L = 6, P = 64;
const mkAttr = (n) => new THREE.StorageBufferAttribute(new Float32Array(n * 4), 4);
const ribbon = lib.createTrailRibbonUpdate({
  position: mkAttr(P * L * 2), next: mkAttr(P * L * 2),
  uvColorA: mkAttr(P * L * 2), colorB: mkAttr(P * L * 2),
  history: mkAttr(P * (L + 1)), particleColor: pipeline.buffers.color,
  curveFns: { width: (t) => 1 - t, opacity: (t) => 1 - t },
  width: 0.2, length: L, maxTime: 0, maxParticles: P,
});
compileCompute('TRAIL', ribbon.ribbonNode);

// Every shipped example must construct and step without throwing.
const { readFileSync } = await import('node:fs');
const core = await import('@cyberluke/three-particles');
lib.enableWebGPU({
  isWebGPURenderer: true,
  backend: { isBackend: true, isWebGPUBackend: true },
  compute: () => {}, hasFeature: () => true,
});
const src = readFileSync('./packages/three-particles/examples/examples-data.js', 'utf8');
const examples = new Function(`return ${src.match(/\[[\s\S]*\]/)[0]}`)();
let ok = 0;
const fails = [];
for (const ex of examples) {
  try {
    const sys = core.createParticleSystem(JSON.parse(JSON.stringify(ex.config)));
    let t = Date.now();
    for (let i = 0; i < 4; i++) {
      t += 16;
      sys.update({ now: t, delta: 0.016, elapsed: i * 0.016 });
    }
    if (!(Array.isArray(sys.computeNode) ? sys.computeNode.length : sys.computeNode ? 1 : 0)) {
      throw new Error('no compute nodes');
    }
    ok++;
  } catch (e) {
    fails.push(`${ex.id}: ${String(e && e.message).split('\n')[0]}`);
  }
}
log(`examples=${examples.length} constructed-ok=${ok} failed=${fails.length}`);
fails.slice(0, 6).forEach((f) => log(`   ${f}`));
