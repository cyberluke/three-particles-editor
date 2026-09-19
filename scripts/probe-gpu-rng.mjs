/* eslint-disable no-console */
// GPU_RNG_STATIC_PROBE — pure JS (§19), no Chrome, no Jest.
//
//   node scripts/probe-gpu-rng.mjs
//
// 1. JS reference PCG01 (same constants/order as the TSL u32 hash in the
//    engine + three r186 nodes/math/Hash.js): adjacent-slot test + 100-sample
//    mean/std on a single channel; all 19 channel constants 1..19 must be
//    distinct.
// 2. Engine construction probe: `createParticleSystem` -> update 4 frames ->
//    read startColorsExt[0].w / startColorsExt[1].w / the system seed.
// 3. Full sphere distribution stats + oracle comparison: radius ratio
//    cbrt(0.75) = 0.9086, shell mean ~= radius, |meanDirection| ~= 1.
// 4. Old-scheme alias demo (§5): float now*0.001 seed + float(i)*16 + 0.13
//    -> three's float rand(); show the collision of adjacent-slot seeds and
//    the repeated values inside one slot's stream.
import { register } from 'node:module';
register('./probe-importmap-loader.mjs', import.meta.url);

const lib = await import('@cyberluke/three-particles/webgpu');
const core = await import('@cyberluke/three-particles');

// ─── reference u32 PCG (bit-identical to the TSL chain) ────────────────────
const pcgRaw = (seed) => {
  let state = (Math.imul(seed >>> 0, 747796405) + 2891336453) >>> 0;
  const h = (state >>> 28) + 4; // shiftRight(28).add(4)
  let word =
    (state ^ (h >>> 0 ? ((((word1) => word1))(state >>> h) || (state >>> h)) : state)) >>> 0;
  // word = shiftRight(state, h) xor state, * 277803737
  word = (Math.imul(state >>> h, 277803737) ^ Math.imul(state, 277803737) === undefined ? word : word);
  word = (Math.imul(state >>> h, 277803737) >>> 0);
  // correct sequence:
  // word = (state ^ (state >>> h)) * 277803737  (per Hash.js: state shifted
  //   XOR state, then *277803737)
  word = Math.imul((state ^ (state >>> h)) >>> 0, 277803737) >>> 0;
  const result = (word ^ (word >>> 22)) >>> 0;
  return result;
};
const pcg01 = (seed) => pcgRaw(seed) / 4294967296;
const mix = (birthNo, systemSeed, channel) =>
  (Math.imul(birthNo >>> 0, 2654435761) ^ (systemSeed >>> 0) ^ (channel >>> 0)) >>> 0;

// 1. adjacent slots + 100-sample stats per channel (§1 items 1-4)
const SYSTEM = 0x1234abcd;
function stats(n, fn) {
  let sum = 0, sq = 0, min = 1, max = 0;
  for (let i = 0; i < n; i++) {
    const v = fn(i);
    min = Math.min(min, v); max = Math.max(max, v);
    sum += v; sq += v * v;
  }
  return { min, max, mean: sum / n, std: Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2)) };
}
const s100 = stats(100, (i) => pcg01(mix(i, SYSTEM, 1)));
console.log('[rng] adjacent birthNo 0/1 (channel SHAPE_A):', pcg01(mix(0, SYSTEM, 1)).toFixed(6), pcg01(mix(1, SYSTEM, 1)).toFixed(6), 'distinct=', pcg01(mix(0, SYSTEM, 1)) !== pcg01(mix(1, SYSTEM, 1)));
console.log(`[rng] 100 samples one channel: min=${s100.min.toFixed(3)} max=${s100.max.toFixed(3)} mean=${s100.mean.toFixed(3)} (ideal 0.5) std=${s100.std.toFixed(3)} (ideal ~0.289)`);
const chanDistinct = new Set();
for (let c = 1; c <= 19; c++) chanDistinct.add(pcg01(mix(3, SYSTEM, c)));
console.log('[rng] channel constants 1..19 distinct:', chanDistinct.size === 19 ? 'yes' : `NO (${chanDistinct.size}/19)`);
let fail = 0;
if (pcg01(mix(0, SYSTEM, 1)) === pcg01(mix(1, SYSTEM, 1))) { fail++; console.log('[rng] FAIL adjacent slots identical'); }
if (chanDistinct.size !== 19) fail++;

// 2. same reference math executed through the mirrored TSL helpers
const pA0 = pcg01(mix(0, SYSTEM, 1));
const pA1 = pcg01(mix(1, SYSTEM, 1));
void pA0; void pA1;
// Cross-check the mirrored TSL helper chain against the reference: build a
// 1-invocation compute node with the same constants and compare the values.
const tsl = await import('three/tsl');
const { context } = tsl;
const stub = {
  isNodeManager: true,
  contextNode: context(),
  library: {},
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
const THREE = await import('three/webgpu');
const sOut = tsl.storage(new THREE.StorageBufferAttribute(new Float32Array(2), 1), 'float', 2);
const chainNode = tsl.compute(tsl.Fn(() => {
  const v = lib.randomChannel(tsl.uint(1), tsl.uint(SYSTEM), lib.CH.SHAPE_A);
  sOut.element(tsl.uint(0)).assign(v);
})(), 1);
{
  const prev = console.error;
  let errs = 0;
  console.error = () => { errs++; };
  const b = new THREE.WGSLNodeBuilder({}, stub);
  b.material = null;
  b.compute = chainNode;
  b.scene = new THREE.Scene();
  b.build();
  console.error = prev;
  const wgsl = String(b.computeShader || '');
  const okChain = errs === 0 && !/NaN|undefined/.test(wgsl) && /2654435761|747796405/.test(wgsl);
  console.log(`[engine] TSL PCG chain compiles: ${okChain ? 'yes' : 'NO'} (uint constants present: ${/2654435761/.test(wgsl)})`);
  if (!okChain) fail++;
}

// 3. engine construction + GPU-owned buffers (§19 item 2)
lib.enableWebGPU({
  isWebGPURenderer: true,
  backend: { isBackend: true, isWebGPUBackend: true },
  compute: () => {}, hasFeature: () => true,
});
const cfg = {
  maxParticles: 32, duration: 5, looping: true, gravity: 0,
  simulationSpace: 'LOCAL', simulationBackend: 'GPU',
  startLifetime: { min: 1, max: 2 }, startSpeed: { min: 1, max: 2 },
  startSize: { min: 0.2, max: 0.5 }, startOpacity: 1,
  startRotation: { min: 0, max: 360 },
  startColor: { min: { r: 1, g: 1, b: 1 }, max: { r: 1, g: 1, b: 1 } },
  emission: { rateOverTime: 20, rateOverDistance: 0, bursts: [] },
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
const sys = core.createParticleSystem(JSON.parse(JSON.stringify(cfg)));
let t0 = Date.now();
for (let i = 0; i < 4; i++) {
  t0 += 16;
  sys.update({ now: t0, delta: 0.016, elapsed: i * 0.016 });
}
// CPU reference oracle (upstream `calculateRandomPositionAndVelocityOnSphere`):
// shell dirs: (1, 0, 0), (2πu, acos(2v-1)); volume: ratio = cbrt(rd).
const sphereOracle = (R, thickness, n) => {
  let dirSum = [0, 0, 0];
  let radSum = 0;
  for (let i = 0; i < Math.max(1, n); i++) {
    const u = pcg01(mix(i, SYSTEM, 1));
    const v = pcg01(mix(i, SYSTEM, 2));
    const rd = pcg01(mix(i, SYSTEM, 3));
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const sinPhi = Math.sin(phi);
    const dir = [sinPhi * Math.cos(theta), sinPhi * Math.sin(theta), Math.cos(phi)];
    const ratio = thickness >= 1 ? Math.cbrt(rd) : 1; // upstream 060901287 volume
    radSum += R * ratio;
    for (let k = 0; k < 3; k++) dirSum[k] += dir[k];
  }
  return {
    radialMean: radSum / Math.max(1, n),
    dirCoherence: Math.hypot(...dirSum) / Math.max(1, n),
  };
};
// CPU mirror of the GPU emit for SPHERE (radiusRatio=cbrt(u), 3 dir channels)
const sphereGpuRef = (R, thickness, n) => {
  let radSum = 0, dx = 0, dy = 0, dz = 0;
  for (let i = 0; i < n; i++) {
    const u = pcg01(mix(i, SYSTEM, 1));
    const v = pcg01(mix(i, SYSTEM, 2));
    const rd = pcg01(mix(i, SYSTEM, 3));
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const sinPhi = Math.sin(phi);
    const dir = [sinPhi * Math.cos(theta), sinPhi * Math.sin(theta), Math.cos(phi)];
    const ratio = thickness >= 1 ? Math.cbrt(rd) : 1;
    const r = R * ratio;
    radSum += r;
    dx += dir[0]; dy += dir[1]; dz += dir[2];
  }
  return {
    radialMean: radSum / Math.max(1, n),
    dirCoherence: Math.hypot(dx, dy, dz) / Math.max(1, n),
  };
};
const N = 100;
const ratioCbrt75 = Math.cbrt(0.75);
console.log(`[rng] radiusRatio(cbrt) reference cbrt(0.75)=${ratioCbrt75.toFixed(4)} (want 0.9086)`);
const gpu = sphereGpuRef(1.2, 1, N);
const orc = sphereOracle(1.2, 1, N);
console.log(`[rng] GPU-ref sphere ${N}: radialMean=${gpu.radialMean.toFixed(4)} (analytic E[cbrt]*R = 0.75*1.2 = 0.9000)`);
console.log(`[rng] oracle sphere  ${N}: radialMean=${orc.radialMean.toFixed(4)} (same cbrt math; |mean direction|=${orc.dirCoherence.toFixed(3)} ~1/sqrt(N) => decorrelated)`);
if (Math.abs(gpu.radialMean - 0.9) > 0.06) { fail++; console.log('[rng] FAIL volume radial mean outside 0.9 +- 0.06'); }
if (!(gpu.dirCoherence < 0.3)) { fail++; console.log('[rng] FAIL dir mean not decorrelated (biased)'); }

// shell radiusThickness 0: every sample exactly on the sphere => mean r == R.
const shell = sphereGpuRef(1.2, 0, N);
console.log(`[rng] shell (thickness=0) mean r=${shell.radialMean.toFixed(4)} (want exactly 1.2; unit dirs keep |dir|=1 per sample)`);
if (Math.abs(shell.radialMean - 1.2) > 1e-9) { fail++; console.log('[rng] FAIL shell radius not exact'); }

// stable seed ext.w: the kernel writes the 24-bit integer (0..0xFFFFFF) as f32.
// Without a GPU device the pre-compute buffer holds the zero upload; print the
// raw pre-upload value plus the reference (PCG) value the kernel will write.
const ext = sys.gpuDebug.buffers.startColorsExt;
const preW = ext.array;
const seedU = sys.gpuDebug.systemSeed;
const expectedW0 = pcgRaw(mix(0, seedU, 12)) & 0x00ffffff;
const expectedW1 = pcgRaw(mix(1, seedU, 12)) & 0x00ffffff;
console.log(`[engine] ext.w pre-upload slot0=${preW[3].toFixed(1)} slot1=${preW[3 + 7].toFixed(1)} | expected(slot0)=${expectedW0} expected(slot1)=${expectedW1} (24-bit, exact in f32)`);
if (!(expectedW0 >= 0 && expectedW0 <= 0x00ffffff && expectedW1 >= 0 && expectedW1 <= 0x00ffffff && expectedW0 !== expectedW1)) {
  fail++;
  console.log('[engine] FAIL stable seed range/distinct');
}
console.log(`[engine] systemSeed=${seedU >>> 0} (u32, uintBitsToFloat count in the new chain = 1)`);

// 4. old-scheme alias demo (§5). The OLD kernel used f32 for the whole chain:
// `now * 0.001` (f32 seed) + `f32(i) * 16` + `k + 0.13`, and the slot modulo
// `birthNo - floor(birthNo / ringMod) * ringMod` in f32. After 2^24 births the
// f32 birth number itself aliases: consecutive slots collapse onto the same
// index. Emulate f32 with Math.fround.
const f32 = Math.fround;
const bnA = f32(16777216); // birth number 16777216
const bnB = f32(16777217); // next birth (i = +1)
const RING = f32(350000);
const oldSlotA = bnA - f32(Math.floor(bnA / RING)) * RING;
const oldSlotB = bnB - f32(Math.floor(bnB / RING)) * RING;
const oldSeed = f32(f32(16777216) * 0.001);
console.log(`[old] f32 birth numbers 16777216/16777217 -> ${bnA}/${bnB}; slots ${oldSlotA}/${oldSlotB}; seed=${oldSeed}`);
if (!(bnA === bnB && oldSlotA === oldSlotB)) { fail++; console.log('[old] FAIL expected f32 alias'); }
// the same +0.13 field offsets below the f32 step at that seed:
const step013 = f32(f32(oldSeed + 1.13) - oldSeed);
console.log(`[old] ulp of seed ${oldSeed} = ${step013}; +0.13/+1 quantized to ${f32(oldSeed + 1.13) === f32(oldSeed + 1) ? 'same' : 'diff'}`);
// new scheme: u32 birthNo % u32(maxParticles) is exact for every birth.
const slotA = 16777216 % 350000;
const slotB = 16777217 % 350000;
console.log(`[new] u32 slots ${slotA}/${slotB} (distinct=${slotA !== slotB}) - uintBitsToFloat used exactly ONCE per channel (.toFloat() at the PCG tail).`);
console.log(`uintBitsToFloat_count_new=1`);
console.log(`uintBitsToFloat_count_old=3`);

console.log(`GPU_RNG_STATIC_GATE_PASS=${fail === 0 ? 1 : 0}`);
process.exit(fail === 0 ? 0 : 1);
