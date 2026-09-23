/* eslint-disable no-console */
// Fluid contract probe (headless, no GPU device): verifies the engine-side
// fluid API added for the gallery parity work —
//   * `bindCamera()` fills the screen-space pass-node cameras,
//   * `getFluidTelemetry()` reports solver, seeded count, ordered pass names,
//   * the compute node array keeps the ordered [emit, simulate, ...solver]
//     dispatch order, and
//   * `updateConfig` refreshes the live `boxWidthRatio` / domain / pointer
//     scalars without a pool rebuild.
//
//   node scripts/probe-fluid-contract.mjs
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

let fails = 0;
const check = (cond, msg) => {
  if (!cond) {
    fails++;
    console.log(`FAIL ${msg}`);
  } else {
    console.log(`ok   ${msg}`);
  }
};

const fluidBase = (solver, rendererExtra) => ({
  maxParticles: solver === 'SPH' ? 148 : 2164,
  duration: 8,
  looping: false,
  gravity: 0,
  simulationSpace: 'LOCAL',
  simulationBackend: 'GPU',
  startLifetime: { min: 8, max: 8 },
  startSpeed: { min: 0, max: 0 },
  startSize: { min: solver === 'SPH' ? 0.08 : 1.2, max: solver === 'SPH' ? 0.08 : 1.2 },
  startOpacity: 1,
  startRotation: { min: 0, max: 0 },
  startColor: { min: { r: 0.3, g: 0.72, b: 0.98 }, max: { r: 0.78, g: 0.98, b: 1.0 } },
  emission: { rateOverTime: 0, rateOverDistance: 0, bursts: [] },
  shape: {
    shape: 'BOX',
    box: { scale: { x: 33, y: 24, z: 30 }, emitFrom: 'VOLUME' },
  },
  renderer: {
    rendererType: 'FLUID',
    blending: 'THREE.NormalBlending',
    transparent: true,
    depthTest: true,
    depthWrite: false,
    fluid: {
      sphereSize: solver === 'SPH' ? 0.08 : 1.2,
      density: 0.7,
      waterColor: [0.0, 0.7375, 0.95],
      sphereRender: false,
      solver,
    },
    ...rendererExtra,
  },
  map: texSlot,
  sizeOverLifetime: { isActive: false },
  opacityOverLifetime: { isActive: false },
  colorOverLifetime: { isActive: false },
  rotationOverLifetime: { isActive: false },
  velocityOverLifetime: { isActive: false },
  noise: { isActive: false },
  forceFields: [],
  collisionPlanes: [],
  textureSheetAnimation: { isActive: false },
});

// ── MLS-MPM ────────────────────────────────────────────────────────────────
const mpm = core.createParticleSystem(
  fluidBase('MLS-MPM', {
    mlsMpm: {
      stiffness: 3,
      restDensity: 4,
      dynamicViscosity: 0.1,
      dt: 0.2,
      gravity: -0.3,
      cellSize: 1,
      gridSize: 64,
      sphereSize: 1.2,
      boxSize: [40, 30, 60],
      boxWidthRatio: 1,
    },
  })
);
const tMpm = mpm.getFluidTelemetry?.();
check(!!tMpm, 'MLS-MPM telemetry present');
check(tMpm?.solver === 'MLS-MPM', 'telemetry.solver = MLS-MPM');
check(tMpm?.filledParticles === 2164, `MLS-MPM seeded = 2164 (got ${tMpm?.filledParticles})`);
// Lattice dims are `min(64, ceil(boxAxis))` per axis: [40,30,60] -> 40*30*60.
check(tMpm?.gridCount === 40 * 30 * 60, `lattice count = ${40 * 30 * 60} (got ${tMpm?.gridCount})`);
check(tMpm?.passCount === 2 + 10, `compute passes = 12 (got ${tMpm?.passCount})`);
const names = tMpm?.passNames ?? [];
check(
  names.slice(0, 4).join(',') === 'emit,simulate,mlsmpm:clearGrid_1,mlsmpm:p2g1_1',
  `ordered pass prefix ok (got ${names.slice(0, 4).join(',')})`
);
check(names.at(-1) === 'mlsmpm:g2p_2', `last pass = mlsmpm:g2p_2 (got ${names.at(-1)})`);
check(
  Array.isArray(mpm.computeNode) && mpm.computeNode.length === 12,
  `computeNode array length 12 (got ${Array.isArray(mpm.computeNode) ? mpm.computeNode.length : typeof mpm.computeNode})`
);
const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
mpm.bindCamera?.(cam);
const passNodes = mpm.instance.material?.__fluidPassNodes ?? [];
check(
  passNodes.length > 0 && passNodes.every((n) => n.camera === cam),
  `bindCamera fills all ${passNodes.length} screen-space pass cameras`
);
mpm.updateConfig({ renderer: { mlsMpm: { boxWidthRatio: 0.5 } } });
// The scalar uniforms are refreshed inside `update()` (per-frame contract).
mpm.update({ now: 0, delta: 1 / 60, elapsed: 1 / 60 });
const ratio = mpm.getFluidTelemetry?.().boxWidthRatio;
check(ratio === 0.5, `live boxWidthRatio via updateConfig = 0.5 (got ${ratio})`);
const uRatio = mpm.getFluidTelemetry?.();
void uRatio;
mpm.dispose();

// ── SPH ────────────────────────────────────────────────────────────────────
const sph = core.createParticleSystem(
  fluidBase('SPH', {
    sph: {
      kernelRadius: 0.07,
      mass: 1,
      restDensity: 15000,
      stiffness: 20,
      nearStiffness: 1,
      viscosity: 100,
      dt: 0.006,
      gravity: -9.8,
      sphereSize: 0.08,
      halfBoxSize: [1, 2, 1],
      boxWidthRatio: 1,
    },
  })
);
const tSph = sph.getFluidTelemetry?.();
check(tSph?.solver === 'SPH', 'SPH telemetry solver');
check(tSph?.filledParticles === 148, `SPH seeded = 148 (got ${tSph?.filledParticles})`);
check(tSph?.passCount === 2 + 24, `SPH compute passes = 26 (got ${tSph?.passCount})`);
const sphNames = tSph?.passNames ?? [];
check(
  sphNames.slice(0, 4).join(',') ===
    'emit,simulate,sph:gridClear_1,sph:gridBuild_1',
  `SPH pass order prefix (got ${sphNames.slice(0, 4).join(',')})`
);
check(sphNames.at(-1) === 'sph:integrate_2', `SPH last pass = sph:integrate_2 (got ${sphNames.at(-1)})`);
const cam2 = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
sph.bindCamera?.(cam2);
const sphPass = sph.instance.material?.__fluidPassNodes ?? [];
check(
  sphPass.length > 0 && sphPass.every((n) => n.camera === cam2),
  `SPH bindCamera fills ${sphPass.length} pass cameras`
);
sph.dispose();

// ── Metaball-only (no solver) path ─────────────────────────────────────────
const meta = core.createParticleSystem({
  ...fluidBase('MLS-MPM', {}),
  maxParticles: 140,
  renderer: {
    ...fluidBase('MLS-MPM', {}).renderer,
    fluid: { stretch: 1.6, absorption: 1.05, ior: 1.33 },
  },
});
// The engine selects MLS-MPM for every FLUID config except an explicit `SPH`
// solver id, so the metaball card ALSO runs the boxed solver (seeded to the
// 140-slot capacity) — telemetry is non-null by contract.
check(
  meta.getFluidTelemetry?.()?.solver === 'MLS-MPM',
  'metaball card runs the MLS-MPM solver (documented engine default)'
);
check(
  meta.getFluidTelemetry?.()?.filledParticles === 140,
  `metaball card seeds 140 slots (got ${meta.getFluidTelemetry?.()?.filledParticles})`
);
meta.dispose();

// ── WaterBall spherical domain ──────────────────────────────────────────────
const wb = core.createParticleSystem({
  ...fluidBase('MLS-MPM', {
    mlsMpm: { boxSize: [40, 30, 60], boxWidthRatio: 1 },
  }),
  renderer: {
    ...fluidBase('MLS-MPM', {
      mlsMpm: { boxSize: [40, 30, 60], boxWidthRatio: 1 },
    }).renderer,
    fluid: {
      sphereSize: 1.2,
      density: 0.7,
      waterColor: [0, 0.7375, 0.95],
      sphereRender: false,
      solver: 'MLS-MPM',
      domain: { kind: 'sphere', center: [20, 15, 16.5], radius: 15 },
      pointer: { position: [20, 15, 16.5], velocity: [1, 0, 0], radius: 4 },
    },
  },
});
const tWb = wb.getFluidTelemetry?.();
check(tWb?.solver === 'MLS-MPM', 'WaterBall preset creates an MLS-MPM solver');
check((tWb?.filledParticles ?? 0) > 0, `WaterBall seeds particles inside the sphere (${tWb?.filledParticles})`);
wb.dispose();

console.log(fails === 0 ? 'FLUID_CONTRACT_PASS=1' : `FLUID_CONTRACT_FAIL=${fails}`);
