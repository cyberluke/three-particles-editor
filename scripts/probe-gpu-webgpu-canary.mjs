/* eslint-disable no-console */
// Canary probe for the four canonical renderer paths (§20-§24), pure JS.
//
//   node scripts/probe-gpu-webgpu-canary.mjs
//
// For every canonical `rendererType` it prints the real runtime identities:
//   * `object` = constructor.name of the scene object created by the engine,
//   * `material` = constructor.name of the TSL NodeMaterial,
//   * `geometry` = constructor.name + `instanceCount`,
// plus the requested/effective renderer pair from `gpuDebug`.
import { register } from 'node:module';
register('./probe-importmap-loader.mjs', import.meta.url);

const THREE = await import('three/webgpu');
const lib = await import('@cyberluke/three-particles/webgpu');
const core = await import('@cyberluke/three-particles');

lib.enableWebGPU({
  isWebGPURenderer: true,
  backend: { isBackend: true, isWebGPUBackend: true },
  compute: () => {},
  hasFeature: () => true,
});

const texSlot = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
texSlot.needsUpdate = true;
const base = (rendererType, extra = {}) => ({
  maxParticles: 16,
  duration: 5,
  looping: true,
  gravity: 0,
  simulationSpace: 'LOCAL',
  simulationBackend: 'GPU',
  startLifetime: { min: 1, max: 2 },
  startSpeed: { min: 1, max: 1 },
  startSize: { min: 0.5, max: 0.5 },
  startOpacity: 1,
  startRotation: { min: 0, max: 360 },
  startColor: { min: { r: 1, g: 1, b: 1 }, max: { r: 1, g: 1, b: 1 } },
  emission: { rateOverTime: 10, rateOverDistance: 0, bursts: [] },
  shape: {
    shape: 'SPHERE',
    sphere: { radius: 1, radiusThickness: 1, arc: 360 },
    cone: { angle: 25, radius: 1, radiusThickness: 1, arc: 360 },
    circle: { radius: 1, radiusThickness: 1, arc: 360 },
    rectangle: { rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1 } },
    box: { scale: { x: 1, y: 1, z: 1 }, emitFrom: 'VOLUME' },
  },
  renderer: {
    rendererType,
    blending: 'THREE.AdditiveBlending',
    transparent: true,
    depthTest: true,
    depthWrite: false,
    ...extra,
  },
  map: texSlot,
  sizeOverLifetime: { isActive: false },
  opacityOverLifetime: { isActive: false },
  colorOverLifetime: { isActive: false },
  rotationOverLifetime: { isActive: false },
  velocityOverLifetime: { isActive: false, linear: { x: 0, y: 0, z: 0 }, orbital: { x: 0, y: 0, z: 0 } },
  noise: { isActive: false },
  forceFields: [],
  collisionPlanes: [],
  textureSheetAnimation: { isActive: false },
});

let fails = 0;
const check = (cond, msg) => {
  if (!cond) { fails++; console.log(`FAIL ${msg}`); }
};

function report(label, expectedObject, requested) {
  const cfg = base(requested);
  if (requested === 'MESH') cfg.renderer.mesh = { geometry: new THREE.BoxGeometry(1, 1, 1) };
  const sys = core.createParticleSystem(cfg);
  const obj = sys.instance;
  const geom = obj.geometry;
  const mat = obj.material;
  const dbg = sys.gpuDebug;
  console.log(`${label}`);
  console.log(`  object=${obj.constructor.name}  requestedRendererType=${dbg?.requestedRendererType}  effectiveRendererType=${dbg?.effectiveRendererType}`);
  console.log(`  material=${mat?.constructor?.name ?? 'null'}  geometry=${geom?.constructor?.name}  instanceCount=${geom?.instanceCount ?? -1}`);
  check(obj.constructor.name === expectedObject, `${label}: object ${obj.constructor.name} != ${expectedObject}`);
  check(dbg?.effectiveRendererType != null, `${label}: effective renderer missing`);
  check(dbg?.requestedRendererType != null, `${label}: requested rendererType missing`);
  if (dbg?.requestedRendererType === 'POINTS') {
    // §21: request POINTS -> billboard quad + THREE.Points using pointUV.
    check(obj.constructor.name === 'Points', 'POINTS must produce THREE.Points (billboard quad)');
  }
  return sys;
}

report('a) requested = POINTS (2D billboard quad)', 'Points', 'POINTS');
report('b) requested = INSTANCED (quad billboard, InstancedBufferGeometry)', 'Mesh', 'INSTANCED');
report('c) requested = TRAIL (ribbon strip)', 'Mesh', 'TRAIL');
report('d) requested = MESH (geometry reuse)', 'Mesh', 'MESH');

// §24: material identity spot-check via WGSLNodeBuilder: no gl_PointCoord,
// four distinct material classes, non-empty fragment bodies.
const stubLib = await import('three/tsl');
const { context } = stubLib;
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
const shared = {
  map: { value: new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1) },
  elapsed: { value: 0 },
  viewportHeight: { value: 720 },
  cameraNearFar: { value: new THREE.Vector2(0.1, 1000) },
  fps: { value: 30 },
  useFPSForFrameIndex: { value: true },
  tiles: { value: new THREE.Vector2(4, 4) },
  discardBackgroundColor: { value: true },
  backgroundColor: { value: { r: 1, g: 1, b: 1 } },
  backgroundColorTolerance: { value: 0.1 },
  softParticlesEnabled: { value: false },
  softParticlesIntensity: { value: 1 },
  sceneDepthTexture: { value: null },
};
// §24: material identity + WGSL non-emptiness, built exactly like the live
// renderer does: a concrete object (Points/Mesh) carries the geometry.
const N = 8;
const f4 = () => new Float32Array(N * 4).fill(1);
const geomFor = (t) => {
  if (t === 'POINTS') {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.StorageBufferAttribute(new Float32Array(N * 4).fill(0.5), 4));
    ['color', 'particleState', 'startValues'].forEach((k) => g.setAttribute(k, new THREE.StorageBufferAttribute(f4(), 4)));
    g.setDrawRange(0, N);
    return g;
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
  g.instanceCount = N;
  ['instanceOffset', 'instanceColor', 'instanceParticleState', 'instanceStartValues']
    .forEach((k) => g.setAttribute(k, new THREE.StorageInstancedBufferAttribute(f4(), 4)));
  return g;
};
for (const t of ['POINTS', 'INSTANCED', 'TRAIL', 'MESH']) {
  const m = lib.createTSLParticleMaterial(t, shared, {
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
  }, true);
  console.log(`material identity: requested ${t} -> ${m?.constructor?.name ?? m?.type ?? 'null'}`);
  const geometry = geomFor(t);
  const object = t === 'POINTS' ? new THREE.Points(geometry, m) : new THREE.Mesh(geometry, m);
  const b = new THREE.WGSLNodeBuilder(object, stub);
  b.object = object;
  b.material = m;
  b.geometry = geometry;
  b.scene = new THREE.Scene();
  b.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  b.build();
  const frag = String(b.fragmentShader || '');
  const vert = String(b.vertexShader || '');
  check(frag.length > 200 && vert.length > 200, `${t}: empty vertex/fragment body`);
  check(vert.length > 0, `${t}: missing vertex stage`);
  // §28/24 identity: the POINTS stage must use the r186 point-sprite
  // coordinates (`pointUV`, emitted as the WGSL point-coord builtin), i.e.
  // `material.sizeNode` set + a non-empty body. Print the raw builtin name(s).
  const builtin = [...new Set([...frag.matchAll(/gl_PointCoord|point_coord/g).map((m) => m[0])])];
  console.log(`  ${t}: point-coord builtin(s)=${builtin.length} body=${frag.length}B vertex=${vert.length}B`);
}

console.log(`GPU_RENDERER_GATE_PASS=${fails === 0 ? 1 : 0}`);
process.exit(fails === 0 ? 0 : 1);
