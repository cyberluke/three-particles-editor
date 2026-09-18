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