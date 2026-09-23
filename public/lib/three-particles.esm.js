import {
  blendingMap,
  resolveSimulationBackend,
  calculateValue,
  S_SIZE,
  S_COLOR_A,
  S_COLOR_R,
  S_COLOR_G,
  S_COLOR_B,
  S_ROTATION,
  SCALAR_STRIDE,
} from './chunk-3TGONQGU.js';
export {
  CollisionPlaneMode,
  EmitFrom,
  ForceFieldFalloff,
  ForceFieldType,
  LifeTimeCurve,
  RendererType,
  SCALAR_STRIDE,
  S_COLOR_A,
  S_COLOR_B,
  S_COLOR_G,
  S_COLOR_R,
  S_IS_ACTIVE,
  S_LIFETIME,
  S_ROTATION,
  S_SIZE,
  S_START_FRAME,
  S_START_LIFETIME,
  Shape,
  SimulationBackend,
  SimulationSpace,
  SubEmitterTrigger,
  TimeMode,
  assertNamed,
  blendingMap,
  calculateRandomPositionAndVelocityOnBox,
  calculateRandomPositionAndVelocityOnCircle,
  calculateRandomPositionAndVelocityOnCone,
  calculateRandomPositionAndVelocityOnRectangle,
  calculateRandomPositionAndVelocityOnSphere,
  calculateValue,
  createBezierCurveFunction,
  createDefaultMeshTexture,
  createDefaultParticleTexture,
  createParticleSystem,
  getBezierCacheSize,
  getCurveFunctionFromConfig,
  getDefaultParticleSystemConfig,
  isComputeCapableRenderer,
  isLifeTimeCurve,
  linearToSRGB,
  normalizeBackgroundToVector3,
  normalizeDepthTextureValue,
  normalizeTextureValue,
  normalizeVector2Value,
  prefillFluidState,
  registerTSLMaterialFactory,
  removeBezierCurveFunction,
  resolveSimulationBackend,
  resolveWebGPUEffectiveRendererType,
  rgbSRGBToLinear,
  sRGBToLinear,
  updateParticleSystems,
} from './chunk-3TGONQGU.js';
import * as THREE7 from 'three';
import Easing from 'easing-functions';

// src/js/effects/three-particles/version.ts
var REVISION = '4.1.2';
if (typeof globalThis !== 'undefined') {
  const g = globalThis;
  if (g.__THREE_PARTICLES__ && g.__THREE_PARTICLES__ !== REVISION) {
    console.warn('WARNING: Multiple instances of @cyberluke/three-particles being imported.');
  } else {
    g.__THREE_PARTICLES__ = REVISION;
  }
}

// src/js/effects/electric-arc/electric-arc-defaults.ts
var ELECTRIC_ARC_TIER_SEGMENTS = {
  low: 32,
  medium: 64,
  high: 96,
  cinematic: 128,
};
var ELECTRIC_ARC_TIERS = {
  low: {
    segments: 32,
    contacts: true,
    lighting: false,
    sparks: 0,
    branches: false,
  },
  medium: {
    segments: 64,
    contacts: true,
    lighting: true,
    sparks: 4,
    branches: false,
  },
  high: {
    segments: 96,
    contacts: true,
    lighting: true,
    sparks: 6,
    branches: true,
  },
  cinematic: {
    segments: 128,
    contacts: true,
    lighting: true,
    sparks: 7,
    branches: true,
  },
};
var ELECTRIC_ARC_PRESET_CINEMATIC = {
  color: '#baff63',
  coreColor: '#fffde0',
  thickness: 0.04,
  chaos: 0.19,
  speed: 1,
  segments: 128,
  intensity: 12,
  flickerHz: 24,
  endpointPinning: 0.72,
  glow: {
    enabled: true,
    width: 7.5,
    intensity: 1.4,
    profile: 'gaussian',
  },
  contact: {
    enabled: true,
    radius: 0.075,
    intensity: 15,
  },
  lighting: {
    enabled: true,
    endpointIntensity: 30,
    midpointIntensity: 14,
    distance: 1.6,
    decay: 2,
  },
};
var ELECTRIC_ARC_BASE = {
  color: 12255075,
  coreColor: 16776672,
  thickness: 0.04,
  chaos: 0.35,
  speed: 1,
  segments: 96,
  flickerHzDefault: lerpChaosToFlicker(0.35),
  intensity: 10,
  endpointPinning: 0.72,
  glow: { enabled: true, width: 6, intensity: 1.2, profile: 'gaussian' },
  contact: { enabled: true, radius: 0.07, intensity: 15 },
  lighting: {
    enabled: false,
    endpointIntensity: 1,
    midpointIntensity: 0.45,
    distance: 3,
    decay: 2,
  },
  sparks: {
    enabled: false,
    rate: 6,
    lifetime: [0.08, 0.25],
    speed: [0.6, 2.8],
    size: [0.05, 0.3],
  },
  branches: {
    enabled: false,
    maxCount: 3,
    probability: 0.15,
    length: [0.08, 0.28],
    thicknessScale: [0.18, 0.42],
  },
};
function lerpChaosToFlicker(c) {
  return 8 + (42 - 8) * Math.min(1, Math.max(0, c));
}

// src/js/effects/electric-arc/electric-arc-math.ts
var u32 = (n) => n >>> 0;
var pcgRawU32Scalar = (seedU) => {
  const s = u32(Math.imul(u32(seedU), 747796405) + 2891336453);
  const shifted = s >>> ((s >>> 28) + 4);
  let word = u32(shifted ^ s);
  word = u32(Math.imul(word, 277803737));
  return u32((word >>> 22) ^ word);
};
var pcg01Scalar = (seedU) => pcgRawU32Scalar(seedU) * (1 / 4294967296);
var mixSeedScalar = (a, b, c) => u32(u32(Math.imul(u32(a), 2654435761)) ^ u32(b) ^ u32(c));
var dischargeHash = (seed, epoch, cellIndex, axis) =>
  pcg01Scalar(mixSeedScalar(mixSeedScalar(cellIndex, seed, 1), epoch, axis + 2));
var clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
var lerp = (a, b, t) => a + (b - a) * t;
var coarseOffset = (seed, epoch, t, coarseKnots, axis) => {
  const cellF = t * coarseKnots;
  const cell0 = Math.floor(cellF);
  const f = cellF - cell0;
  const h0 = dischargeHash(seed, epoch, cell0, axis) * 2 - 1;
  const h1 = dischargeHash(seed, epoch, cell0 + 1, axis) * 2 - 1;
  return h0 + (h1 - h0) * f;
};
var chaosAmplitude = (distance, chaosity) => {
  const a = distance * lerp(25e-4, 0.045, Math.pow(clamp(chaosity, 0, 1), 1.6));
  return clamp(a, 25e-4, Math.max(0.05, distance * 0.25));
};
var PULSE_MAX_SLOTS = 21;
var PULSE_RISE = 0.15;
var PULSE_DECAY = 3;
var PULSE_DEG_GAIN = 0.5;
var PULSE_DEG_WIDTH = 0.5;
var pulseEnvelope = (f) => {
  if (f <= 0) return 0;
  if (f < PULSE_RISE) return f / PULSE_RISE;
  return Math.exp(-PULSE_DECAY * (f - PULSE_RISE));
};
var _pulseW = new Float32Array(PULSE_MAX_SLOTS);
var pulseOffset = (seed, epoch, t, slots, axis) => {
  const n = Math.min(PULSE_MAX_SLOTS, Math.max(1, Math.round(slots)));
  const wXor = u32(11 * (Math.round(axis) + 1));
  const lvlXor = u32(Math.round(axis) + 2);
  const clsXor = u32(Math.round(axis) + 5);
  const degXor = u32(Math.round(axis) + 9);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const w = 0.3 + 0.7 * pcg01Scalar(mixSeedScalar(i + 1, seed, epoch) ^ wXor);
    _pulseW[i] = w;
    total += w;
  }
  const inv = total > 0 ? 1 / total : 1;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const b0 = acc;
    acc += _pulseW[i] * inv;
    const wN = acc - b0;
    if (t < acc || i === n - 1) {
      const degOn = pcg01Scalar(mixSeedScalar(i + 900, seed, epoch) ^ degXor) < 0.25;
      const slotW = degOn ? wN * 0.5 : wN;
      if (t >= b0 + slotW && t < acc) return 0;
      const cls = pcg01Scalar(mixSeedScalar(i + 128, seed, epoch) ^ clsXor);
      const fRaw = t < b0 ? 0 : Math.min(1, (t - b0) / Math.max(slotW, 1e-6));
      const f = Math.min(fRaw, 0.999999);
      const level = pcg01Scalar(mixSeedScalar(i, seed, epoch) ^ lvlXor) * 2 - 1;
      let out;
      if (cls < 0.2) {
        out = 0;
      } else if (cls < 0.4) {
        out = level;
      } else {
        out = level * pulseEnvelope(f);
      }
      if (degOn) out *= PULSE_DEG_GAIN;
      return out;
    }
  }
  return 0;
};
var ORGANIC_HOLD_START = 0.45;
var ORGANIC_HOLD_SPAN = 0.4;
var organicOffset = (seed, epoch, t, knots, axis) => {
  const n = Math.min(PULSE_MAX_SLOTS, Math.max(1, Math.round(knots)));
  const ax = Math.round(axis);
  const lvlXor = u32(ax + 2);
  const holdXor = u32(31 * (ax + 1));
  const cellF = t * n;
  const cell0 = Math.floor(cellF);
  const f = cellF - cell0;
  const c1 = cell0 + 1 > n ? n : cell0 + 1;
  const h0 = pcg01Scalar(mixSeedScalar(Math.min(cell0, n), seed, epoch) ^ lvlXor) * 2 - 1;
  const h1 = pcg01Scalar(mixSeedScalar(c1, seed, epoch) ^ lvlXor) * 2 - 1;
  const holdFrac =
    ORGANIC_HOLD_START +
    ORGANIC_HOLD_SPAN * pcg01Scalar(mixSeedScalar(Math.min(cell0, n) + 700, seed, epoch) ^ holdXor);
  if (f >= holdFrac) return h1;
  const g = f / holdFrac;
  const e = g * g * (3 - 2 * g);
  return h0 + (h1 - h0) * e;
};
var chaosFlickerHz = (chaosity) => lerp(8, 42, clamp(chaosity, 0, 1));
var PULSE_THIN_MIN = 0.55;
var widthFactor = (ou, ov) => {
  const rot = Math.sqrt(ou * ou + ov * ov);
  return 1 - (1 - PULSE_THIN_MIN) * clamp(Math.min(1.4142136, rot), 0, 1);
};
var DEG = Math.PI / 180;
var rotateZ2 = (v, deg) => {
  if (!deg) return v;
  const r = deg * DEG;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const x = v.x * c - v.y * s;
  const y = v.x * s + v.y * c;
  v.x = x;
  v.y = y;
  return v;
};
var globalFlicker = (seed, epoch) => 0.78 + 0.27 * pcg01Scalar(mixSeedScalar(seed, epoch, 7));

// src/js/effects/electric-arc/electric-arc-config.ts
var toVec3 = (p, out) => {
  if (!p) return out.set(0, 0, 0);
  return out.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
};
var isPlainObj = (v) => typeof v === 'object' && v !== null;
var toEuler = (r) => ({
  pitch: Number.isFinite(r?.pitch) ? Number(r?.pitch) : 0,
  yaw: Number.isFinite(r?.yaw) ? Number(r?.yaw) : 0,
  roll: Number.isFinite(r?.roll) ? Number(r?.roll) : 0,
});
var mergeVec3 = (p, out) => {
  if (!p) return;
  const q = p;
  if (Number.isFinite(q.x)) out.x = Number(q.x);
  if (Number.isFinite(q.y)) out.y = Number(q.y);
  if (Number.isFinite(q.z)) out.z = Number(q.z);
};
var nextElectricArcSeed = () =>
  pcg01Scalar(mixSeedScalar(Date.now(), Math.floor(Math.random() * 16777216) || 1, 3)) * 16777215;
function normalizeElectricArcConfig(config) {
  const tier = config.quality ? ELECTRIC_ARC_TIERS[config.quality] : null;
  const segments = Math.round(config.segments ?? (tier ? tier.segments : 96));
  const chaosity = clamp(config.chaos ?? 0.35, 0, 1);
  const start = toVec3(config.start, new THREE7.Vector3());
  const end = toVec3(config.end, new THREE7.Vector3());
  const distance = Math.max(end.distanceTo(start), 1e-4);
  const startOffset = toVec3(config.startOffset, new THREE7.Vector3());
  const endOffset = toVec3(config.endOffset, new THREE7.Vector3());
  const startRotation = toEuler(config.startRotation);
  const endRotation = toEuler(config.endRotation);
  const color = new THREE7.Color(config.color ?? 12255075);
  const coreColor = new THREE7.Color(config.coreColor ?? 16776672);
  const seed =
    config.seed !== void 0 && Number.isFinite(config.seed)
      ? Math.trunc(config.seed) >>> 0
      : nextElectricArcSeed() >>> 0;
  const sparksLifetime =
    Array.isArray(config.sparks?.lifetime) && config.sparks.lifetime.length === 2
      ? config.sparks.lifetime
      : [0.08, 0.25];
  const sparksSpeed =
    Array.isArray(config.sparks?.speed) && config.sparks.speed.length === 2
      ? config.sparks.speed
      : [0.6, 2.8];
  const sparksSize =
    Array.isArray(config.sparks?.size) && config.sparks.size.length === 2
      ? config.sparks.size
      : [0.05, 0.3];
  const branchLength =
    Array.isArray(config.branches?.length) && config.branches.length.length === 2
      ? config.branches.length
      : [0.08, 0.28];
  const branchThickness =
    Array.isArray(config.branches?.thicknessScale) && config.branches.thicknessScale.length === 2
      ? config.branches.thicknessScale
      : [0.18, 0.42];
  const glowWidth = Math.max(1, config.glow?.width ?? 6);
  const normalized = {
    simulationBackend: config.simulationBackend ?? 'AUTO' /* AUTO */,
    start,
    end,
    color: colorToNumber(color),
    coreColor: colorToNumber(coreColor),
    thickness: config.thickness ?? 0.04,
    chaos: chaosity,
    chaosAlgorithm:
      config.chaosAlgorithm === 'pulse'
        ? 'pulse'
        : config.chaosAlgorithm === 'organic'
          ? 'organic'
          : 'linear',
    speed: config.speed ?? 1,
    segments: clamp(segments, 8, 512),
    seed,
    flickerHz: config.flickerHz ?? chaosFlickerHz(chaosity),
    intensity: config.intensity ?? 10,
    endpointPinning: clamp(config.endpointPinning ?? 0.72, 0, 4),
    rotationZ: Number.isFinite(config.rotationZ) ? Number(config.rotationZ) : 0,
    startOffset,
    endOffset,
    startRotation,
    endRotation,
    glow: {
      enabled: config.glow?.enabled ?? true,
      width: glowWidth,
      intensity: config.glow?.intensity ?? 1.2,
      profile: config.glow?.profile === 'triangle' ? 'triangle' : 'gaussian',
    },
    contact: {
      enabled: config.contact?.enabled ?? true,
      radius: config.contact?.radius ?? 0.07,
      intensity: config.contact?.intensity ?? 15,
    },
    lighting: {
      enabled: isPlainObj(config.lighting) ? !!config.lighting.enabled : false,
      endpointIntensity: config.lighting?.endpointIntensity ?? 1,
      midpointIntensity: config.lighting?.midpointIntensity ?? 0.45,
      distance: config.lighting?.distance ?? 3,
      decay: config.lighting?.decay ?? 2,
    },
    sparks: {
      enabled: isPlainObj(config.sparks)
        ? (config.sparks.enabled ?? (!!tier && tier.sparks > 0))
        : !!tier && tier.sparks > 0,
      rate: config.sparks?.rate ?? (tier && tier.sparks > 0 ? tier.sparks : 6),
      lifetime: sparksLifetime,
      speed: sparksSpeed,
      size: sparksSize,
    },
    branches: {
      enabled: isPlainObj(config.branches)
        ? (config.branches.enabled ?? (!!tier && tier.branches))
        : !!tier && tier.branches,
      maxCount: Math.round(config.branches?.maxCount ?? 3),
      probability: config.branches?.probability ?? 0.15,
      length: branchLength,
      thicknessScale: branchThickness,
    },
    amplitude: chaosAmplitude(distance, chaosity),
    coarseKnots: Math.round(lerp(4, 20, chaosity)),
    microFrequency: lerp(15, 75, chaosity),
    brightnessVariation: lerp(0.05, 0.38, chaosity),
    branchProbability: Math.pow(chaosity, 2) * 0.32,
  };
  if (!normalized.branches.enabled) normalized.branches.probability = 0;
  if (normalized.branches.enabled && config.branches?.probability === void 0) {
    normalized.branches.probability =
      normalized.branchProbability || normalized.branches.probability;
  }
  return normalized;
}
function colorToNumber(c) {
  const r = Math.round(clamp(c.r, 0, 1) * 255);
  const g = Math.round(clamp(c.g, 0, 1) * 255);
  const b = Math.round(clamp(c.b, 0, 1) * 255);
  return (r << 16) | (g << 8) | b;
}
var fin = (v, fb) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
function touchesStructuralField(config) {
  return (
    config.segments !== void 0 ||
    config.quality !== void 0 ||
    config.simulationBackend !== void 0 ||
    config.chaosAlgorithm !== void 0
  );
}
function mergeLiveConfig(target, patch) {
  if (patch.start !== void 0) toVec3(patch.start, target.start);
  if (patch.end !== void 0) toVec3(patch.end, target.end);
  if (patch.color !== void 0) target.color = colorToNumber(new THREE7.Color(patch.color));
  if (patch.coreColor !== void 0)
    target.coreColor = colorToNumber(new THREE7.Color(patch.coreColor));
  if (patch.thickness !== void 0) target.thickness = patch.thickness;
  if (patch.speed !== void 0) target.speed = patch.speed;
  if (patch.flickerHz !== void 0) target.flickerHz = patch.flickerHz;
  if (patch.intensity !== void 0) target.intensity = patch.intensity;
  if (patch.endpointPinning !== void 0) target.endpointPinning = clamp(patch.endpointPinning, 0, 4);
  if (patch.rotationZ !== void 0)
    target.rotationZ = Number.isFinite(patch.rotationZ)
      ? Number(patch.rotationZ)
      : target.rotationZ;
  if (patch.startOffset !== void 0) mergeVec3(patch.startOffset, target.startOffset);
  if (patch.endOffset !== void 0) mergeVec3(patch.endOffset, target.endOffset);
  if (patch.startRotation !== void 0) {
    if (Number.isFinite(patch.startRotation.pitch))
      target.startRotation.pitch = Number(patch.startRotation.pitch);
    if (Number.isFinite(patch.startRotation.yaw))
      target.startRotation.yaw = Number(patch.startRotation.yaw);
    if (Number.isFinite(patch.startRotation.roll))
      target.startRotation.roll = Number(patch.startRotation.roll);
  }
  if (patch.endRotation !== void 0) {
    if (Number.isFinite(patch.endRotation.pitch))
      target.endRotation.pitch = Number(patch.endRotation.pitch);
    if (Number.isFinite(patch.endRotation.yaw))
      target.endRotation.yaw = Number(patch.endRotation.yaw);
    if (Number.isFinite(patch.endRotation.roll))
      target.endRotation.roll = Number(patch.endRotation.roll);
  }
  if (patch.glow?.intensity !== void 0) target.glow.intensity = patch.glow.intensity;
  if (patch.glow?.enabled !== void 0) target.glow.enabled = patch.glow.enabled;
  if (patch.glow?.width !== void 0) target.glow.width = Math.max(1, patch.glow.width);
  if (patch.glow?.profile !== void 0)
    target.glow.profile = patch.glow.profile === 'triangle' ? 'triangle' : 'gaussian';
  if (patch.contact?.enabled !== void 0) target.contact.enabled = patch.contact.enabled;
  if (patch.contact?.radius !== void 0) target.contact.radius = patch.contact.radius;
  if (patch.contact?.intensity !== void 0) target.contact.intensity = patch.contact.intensity;
  if (patch.lighting?.enabled !== void 0) target.lighting.enabled = patch.lighting.enabled;
  if (patch.lighting?.endpointIntensity !== void 0)
    target.lighting.endpointIntensity = patch.lighting.endpointIntensity;
  if (patch.lighting?.midpointIntensity !== void 0)
    target.lighting.midpointIntensity = patch.lighting.midpointIntensity;
  if (patch.lighting?.distance !== void 0) target.lighting.distance = patch.lighting.distance;
  if (patch.lighting?.decay !== void 0) target.lighting.decay = patch.lighting.decay;
  if (patch.sparks?.enabled !== void 0) target.sparks.enabled = patch.sparks.enabled;
  if (patch.sparks?.rate !== void 0) target.sparks.rate = patch.sparks.rate;
  if (patch.sparks) {
    const sp = patch.sparks;
    if (Array.isArray(sp.lifetime) && sp.lifetime.length === 2)
      target.sparks.lifetime = [
        fin(sp.lifetime[0], target.sparks.lifetime[0]),
        fin(sp.lifetime[1], target.sparks.lifetime[1]),
      ];
    if (Array.isArray(sp.speed) && sp.speed.length === 2)
      target.sparks.speed = [
        fin(sp.speed[0], target.sparks.speed[0]),
        fin(sp.speed[1], target.sparks.speed[1]),
      ];
    if (Array.isArray(sp.size) && sp.size.length === 2)
      target.sparks.size = [
        fin(sp.size[0], target.sparks.size[0]),
        fin(sp.size[1], target.sparks.size[1]),
      ];
  }
  if (patch.chaosAlgorithm !== void 0)
    target.chaosAlgorithm =
      patch.chaosAlgorithm === 'pulse'
        ? 'pulse'
        : patch.chaosAlgorithm === 'organic'
          ? 'organic'
          : 'linear';
  if (patch.simulationBackend !== void 0) target.simulationBackend = patch.simulationBackend;
  if (patch.chaos !== void 0 && Number.isFinite(patch.chaos)) {
    const c = clamp(patch.chaos, 0, 1);
    target.chaos = c;
    const distance = Math.max(target.end.distanceTo(target.start), 1e-4);
    target.amplitude = chaosAmplitude(distance, c);
    target.coarseKnots = Math.round(lerp(4, 20, c));
    target.microFrequency = lerp(15, 75, c);
    target.brightnessVariation = lerp(0.05, 0.38, c);
    target.branchProbability = Math.pow(c, 2) * 0.32;
    if (patch.flickerHz === void 0) target.flickerHz = chaosFlickerHz(c);
  }
}
var radialProfile = (d, k) => Math.exp(-d * d * k);
var triangleProfile = (d, k) => {
  const slope = Math.sqrt(0.55 * k);
  const v = 1 - Math.abs(d) * slope;
  return v > 0 ? v : 0;
};
var profileValue = (d, k, kind = 'gaussian') =>
  kind === 'triangle' ? triangleProfile(d, k) : radialProfile(d, k);
var fillProfileTexture = (data, size, k, kind) => {
  const innerK = k * 0.16;
  for (let i = 0; i < size; i++) {
    const d = (i / (size - 1)) * 2 - 1;
    const core = profileValue(d, k, kind);
    const inner = profileValue(d, innerK, kind);
    const a = Math.min(1, core + inner * 0.35);
    const o = i * 4;
    data[o] = 255;
    data[o + 1] = 255;
    data[o + 2] = 255;
    data[o + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
  }
};
function createProfileTexture(size, k, kind = 'gaussian') {
  const data = new Uint8Array(size * 4);
  fillProfileTexture(data, size, k, kind);
  const tex = new THREE7.DataTexture(data, size, 1, THREE7.RGBAFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE7.LinearFilter;
  tex.magFilter = THREE7.LinearFilter;
  return tex;
}
function writeProfileTexture(tex, size, k, kind) {
  const img = tex.image;
  if (!img?.data) return;
  fillProfileTexture(img.data, size, k, kind);
  tex.needsUpdate = true;
}
function createContactTexture(size = 64) {
  const data = new Uint8Array(size * size * 4);
  const half = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const r2 = dx * dx + dy * dy;
      const a = r2 > 1 ? 0 : Math.min(1, Math.exp(-r2 * 6) + Math.exp(-r2 * 1.7) * 0.4);
      const o = (y * size + x) * 4;
      data[o] = 255;
      data[o + 1] = 255;
      data[o + 2] = 255;
      data[o + 3] = Math.round(a * 255);
    }
  }
  const tex = new THREE7.DataTexture(data, size, size, THREE7.RGBAFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE7.LinearFilter;
  tex.magFilter = THREE7.LinearFilter;
  return tex;
}
function createContactSprites(radius, intensity, color, texture) {
  const baseColor = new THREE7.Color(color);
  const scale = Math.max(radius * 2, 0.01);
  const mk = () => {
    const mat = new THREE7.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE7.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    mat.color.setRGB(baseColor.r * intensity, baseColor.g * intensity, baseColor.b * intensity);
    const s = new THREE7.Sprite(mat);
    s.scale.set(scale, scale, 1);
    return s;
  };
  const start = mk();
  const end = mk();
  const group = new THREE7.Group();
  group.add(start);
  group.add(end);
  return {
    group,
    start,
    end,
    materials: [start.material, end.material],
    baseScale: scale,
  };
}
function updateContactSprites(start, end, sx, sy, sz, ex, ey, ez, flicker, baseScale) {
  const s = baseScale * (0.96 + 0.04 * flicker);
  start.scale.set(s, s, 1);
  end.scale.set(s, s, 1);
  start.position.set(sx, sy, sz);
  end.position.set(ex, ey, ez);
}
function buildRibbonGeometry(segments) {
  const vertexCount = segments * 2;
  const geometry = new THREE7.BufferGeometry();
  const positionArray = new Float32Array(vertexCount * 3);
  const uvArray = new Float32Array(vertexCount * 2);
  const arcIndexArr = new Float32Array(vertexCount);
  const arcSideArr = new Float32Array(vertexCount);
  const index = new Uint16Array((segments - 1) * 6);
  const inv = 1 / (segments - 1);
  for (let s = 0; s < segments; s++) {
    const u = s * inv;
    const li = s * 2;
    const ri = li + 1;
    uvArray[li * 2] = u;
    uvArray[li * 2 + 1] = 0;
    uvArray[ri * 2] = u;
    uvArray[ri * 2 + 1] = 1;
    arcIndexArr[li] = s;
    arcIndexArr[ri] = s;
    arcSideArr[li] = -1;
    arcSideArr[ri] = 1;
  }
  for (let s = 0; s < segments - 1; s++) {
    const l0 = s * 2;
    const r0 = l0 + 1;
    const l1 = l0 + 2;
    const r1 = l1 + 1;
    const o = s * 6;
    index[o] = l0;
    index[o + 1] = r0;
    index[o + 2] = l1;
    index[o + 3] = r0;
    index[o + 4] = r1;
    index[o + 5] = l1;
  }
  geometry.setAttribute('position', new THREE7.BufferAttribute(positionArray, 3));
  geometry.setAttribute('uv', new THREE7.BufferAttribute(uvArray, 2));
  const arcIndex = new THREE7.BufferAttribute(arcIndexArr, 1);
  const arcSide = new THREE7.BufferAttribute(arcSideArr, 1);
  geometry.setAttribute('arcIndex', arcIndex);
  geometry.setAttribute('arcSide', arcSide);
  geometry.setIndex(new THREE7.BufferAttribute(index, 1));
  geometry.boundingSphere = new THREE7.Sphere(new THREE7.Vector3(), 8);
  return { geometry, positionArray, arcIndex, arcSide };
}

// src/js/effects/electric-arc/electric-arc-noise.ts
var GRAD3 = new Float32Array([
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1,
  0, 1, -1, 0, -1, -1,
]);
var F3 = 1 / 3;
var G3 = 1 / 6;
var snoise3 = (x, y, z) => {
  const s = (x + y + z) * F3;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const k = Math.floor(z + s);
  const t = (i + j + k) * G3;
  const x0 = x - (i - t);
  const y0 = y - (j - t);
  const z0 = z - (k - t);
  let i1, j1, k1;
  let i2, j2, k2;
  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1;
      j1 = 0;
      k1 = 0;
      i2 = 1;
      j2 = 1;
      k2 = 0;
    } else if (x0 >= z0) {
      i1 = 1;
      j1 = 0;
      k1 = 0;
      i2 = 1;
      j2 = 0;
      k2 = 1;
    } else {
      i1 = 0;
      j1 = 0;
      k1 = 1;
      i2 = 1;
      j2 = 0;
      k2 = 1;
    }
  } else {
    if (y0 < z0) {
      i1 = 0;
      j1 = 0;
      k1 = 1;
      i2 = 0;
      j2 = 1;
      k2 = 1;
    } else if (x0 < z0) {
      i1 = 0;
      j1 = 1;
      k1 = 0;
      i2 = 0;
      j2 = 1;
      k2 = 1;
    } else {
      i1 = 0;
      j1 = 1;
      k1 = 0;
      i2 = 1;
      j2 = 1;
      k2 = 0;
    }
  }
  const x1 = x0 - i1 + G3;
  const y1 = y0 - j1 + G3;
  const z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2 * G3;
  const y2 = y0 - j2 + 2 * G3;
  const z2 = z0 - k2 + 2 * G3;
  const x3 = x0 - 1 + 3 * G3;
  const y3 = y0 - 1 + 3 * G3;
  const z3 = z0 - 1 + 3 * G3;
  const ii = i & 255;
  const jj = j & 255;
  const kk = k & 255;
  let n = 0;
  let m = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (m > 0) {
    const g = (ii % 12) * 3;
    m *= m;
    n += m * m * (GRAD3[g] * x0 + GRAD3[g + 1] * y0 + GRAD3[g + 2] * z0);
  }
  m = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (m > 0) {
    const g = (((ii + i1) % 12) + (jj + j1) + (kk + k1)) % 12;
    const gg = g * 3;
    m *= m;
    n += m * m * (GRAD3[gg] * x1 + GRAD3[gg + 1] * y1 + GRAD3[gg + 2] * z1);
  }
  m = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (m > 0) {
    const g = ((((ii + i2) % 12) + (jj + j2) + (kk + k2)) % 12) | 0;
    const gg = g * 3;
    m *= m;
    n += m * m * (GRAD3[gg] * x2 + GRAD3[gg + 1] * y2 + GRAD3[gg + 2] * z2);
  }
  m = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (m > 0) {
    const g = (((ii + 1) % 12) + (jj + 1) + (kk + 1)) % 12;
    const gg = g * 3;
    m *= m;
    n += m * m * (GRAD3[gg] * x3 + GRAD3[gg + 1] * y3 + GRAD3[gg + 2] * z3);
  }
  return n * 0.8389;
};
var microNoise = (t, time, microFrequency, channel) => {
  const p = t * microFrequency;
  return (
    snoise3(p, time, channel) * 0.6 +
    snoise3(p * 2.13, time * 2.13, channel) * 0.27 +
    snoise3(p * 4.71, time * 4.71, channel) * 0.13
  );
};
var impulseNoise = (t, time, microFrequency, channel) =>
  snoise3(t * microFrequency * 2.7 + 11.37, time * 1.7 + 3.1, channel + 9.7);

// src/js/effects/electric-arc/electric-arc-cpu.ts
var N_ARC = 0.68;
var N_MICRO = 0.24;
var N_IMPULSE = 0.08;
var _dir = new THREE7.Vector3();
var _helper = new THREE7.Vector3();
var _basisU = new THREE7.Vector3();
var _basisV = new THREE7.Vector3();
var _tangent = new THREE7.Vector3();
var _prev = new THREE7.Vector3();
var _next = new THREE7.Vector3();
var _camRight = new THREE7.Vector3();
function createElectricArcCpu(config) {
  const cfg = config;
  const root = new THREE7.Group();
  root.name = 'electric-arc-cpu';
  const seg = cfg.segments;
  const maxKnots = 21;
  const center = new Float32Array(seg * 4);
  const widths = new Float32Array(seg);
  const knotsU = new Float32Array(maxKnots);
  const knotsV = new Float32Array(maxKnots);
  let lastEpoch = -1;
  let lastKnots = -1;
  const PROFILE_SIZE = 48;
  const coreMap = createProfileTexture(PROFILE_SIZE, 700, cfg.glow.profile);
  const innerMap = createProfileTexture(PROFILE_SIZE, 70, cfg.glow.profile);
  const haloMap = createProfileTexture(PROFILE_SIZE, 8, cfg.glow.profile);
  let lastProfile = cfg.glow.profile;
  const arcColor = new THREE7.Color(cfg.color);
  const coreColor = new THREE7.Color(cfg.coreColor);
  const makeLayer = (segments, halfWidth, color, map) => {
    const geometry = buildRibbonGeometry(segments);
    const brightnessArr = new Float32Array(segments * 2 * 3);
    geometry.geometry.setAttribute('color', new THREE7.BufferAttribute(brightnessArr, 3));
    const material = new THREE7.MeshBasicMaterial({
      transparent: true,
      blending: THREE7.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      vertexColors: true,
      side: THREE7.DoubleSide,
      map,
    });
    material.color.copy(color);
    const mesh = new THREE7.Mesh(geometry.geometry, material);
    mesh.frustumCulled = false;
    return { geometry, mesh, material, halfWidth };
  };
  const glowOuter = Math.max(2, cfg.glow.width);
  const layers = [
    makeLayer(seg, cfg.thickness * 0.5, coreColor.clone().multiplyScalar(cfg.intensity), coreMap),
    makeLayer(
      seg,
      cfg.thickness * 0.5 * 2,
      arcColor.clone().multiplyScalar(cfg.glow.intensity * 0.8),
      innerMap
    ),
    makeLayer(
      seg,
      cfg.thickness * 0.5 * glowOuter,
      arcColor.clone().multiplyScalar(cfg.glow.intensity * 0.4),
      haloMap
    ),
  ];
  const layerAll = [...layers];
  for (const l of layers) root.add(l.mesh);
  const branchSegments = 8;
  const branches = [];
  if (cfg.branches.enabled && cfg.branches.maxCount > 0) {
    for (let b = 0; b < cfg.branches.maxCount; b++) {
      const [ts0, ts1] = cfg.branches.thicknessScale;
      const w = ts0 + (ts1 - ts0) * 0.5;
      const coreL = makeLayer(
        branchSegments,
        cfg.thickness * w,
        coreColor.clone().multiplyScalar(cfg.intensity * 0.8),
        coreMap
      );
      const glowL = makeLayer(
        branchSegments,
        cfg.thickness * w * 3,
        arcColor.clone().multiplyScalar(cfg.glow.intensity * 0.7),
        innerMap
      );
      root.add(coreL.mesh);
      root.add(glowL.mesh);
      const branch = {
        core: coreL,
        glow: glowL,
        center: new Float32Array(branchSegments * 4),
        w: new Float32Array(branchSegments),
      };
      branches.push(branch);
      layerAll.push(coreL, glowL);
    }
  }
  const contactTex = createContactTexture(64);
  const contacts = cfg.contact.enabled
    ? createContactSprites(cfg.contact.radius, cfg.contact.intensity, cfg.color, contactTex)
    : null;
  if (contacts) root.add(contacts.group);
  const coarseKind =
    cfg.chaosAlgorithm === 'pulse'
      ? 'pulse'
      : cfg.chaosAlgorithm === 'organic'
        ? 'organic'
        : 'linear';
  const rebuildKnots = (epoch) => {
    const kn = clamp(cfg.coarseKnots, 1, maxKnots - 1);
    for (let c = 0; c <= kn; c++) {
      knotsU[c] = coarseOffset(cfg.seed, epoch, c, kn, 0);
      knotsV[c] = coarseOffset(cfg.seed, epoch, c, kn, 1);
    }
    lastKnots = kn;
  };
  const brightness = (i, epoch, flicker) =>
    clamp(
      flicker *
        (1 +
          cfg.brightnessVariation *
            (mixSeedScalar(i + 1, cfg.seed, epoch) * (1 / 4294967296) - 0.5) *
            2),
      0.15,
      1.6
    );
  const update = (cycle, start, end) => {
    const sx = start.x,
      sy = start.y,
      sz = start.z;
    const ex = end.x,
      ey = end.y,
      ez = end.z;
    _dir.set(ex - sx, ey - sy, ez - sz);
    const dist = Math.max(_dir.length(), 1e-4);
    _dir.multiplyScalar(1 / dist);
    if (_dir.y < 0.85 && _dir.y > -0.85) _helper.set(0, 1, 0);
    else _helper.set(1, 0, 0);
    _basisU.crossVectors(_dir, _helper).normalize();
    _basisV.crossVectors(_dir, _basisU).normalize();
    const bUx = _basisU.x,
      bUy = _basisU.y,
      bUz = _basisU.z;
    const bVx = _basisV.x,
      bVy = _basisV.y,
      bVz = _basisV.z;
    const epoch = Math.floor(cycle.elapsed * cfg.flickerHz * cfg.speed);
    if (epoch !== lastEpoch || cfg.coarseKnots !== lastKnots) {
      rebuildKnots(epoch);
      lastEpoch = epoch;
    }
    const flicker = globalFlicker(cfg.seed, epoch);
    const amp = cfg.amplitude;
    const pin = cfg.endpointPinning;
    const time = cycle.elapsed * cfg.speed;
    const mf = cfg.microFrequency;
    const kn = clamp(cfg.coarseKnots, 1, maxKnots - 1);
    const inv = 1 / (seg - 1);
    const ux0 = ex - sx,
      uy0 = ey - sy,
      uz0 = ez - sz;
    for (let i = 0; i < seg; i++) {
      const t = i * inv;
      const env =
        i === 0 ? 0 : i === seg - 1 ? 0 : Math.pow(Math.max(Math.sin(Math.PI * t), 0), pin);
      let cu;
      let cvs;
      if (coarseKind === 'linear') {
        const cellF = t * kn;
        const cell0 = Math.floor(cellF);
        const fCell = cellF - cell0;
        const c1 = cell0 + 1 > kn ? kn : cell0 + 1;
        const ku0 = knotsU[cell0];
        const ku1 = knotsU[c1];
        const kv0 = knotsV[cell0];
        const kv1 = knotsV[c1];
        cu = ku0 + (ku1 - ku0) * fCell;
        cvs = kv0 + (kv1 - kv0) * fCell;
      } else if (coarseKind === 'pulse') {
        cu = pulseOffset(cfg.seed, epoch, t, kn, 0);
        cvs = pulseOffset(cfg.seed, epoch, t, kn, 1);
      } else {
        cu = organicOffset(cfg.seed, epoch, t, kn, 0);
        cvs = organicOffset(cfg.seed, epoch, t, kn, 1);
      }
      const ou =
        N_ARC * cu +
        N_MICRO * microNoise(t, time, mf, 0) +
        N_IMPULSE * impulseNoise(t, time, mf, 0);
      const ov =
        N_ARC * cvs +
        N_MICRO * microNoise(t, time, mf, 1) +
        N_IMPULSE * impulseNoise(t, time, mf, 1);
      let x = sx + ux0 * t;
      let y = sy + uy0 * t;
      let z = sz + uz0 * t;
      x += (bUx * ou + bVx * ov) * amp * env;
      y += (bUy * ou + bVy * ov) * amp * env;
      z += (bUz * ou + bVz * ov) * amp * env;
      widths[i] = widthFactor(ou * env, ov * env);
      if (i === 0) {
        x = sx;
        y = sy;
        z = sz;
      } else if (i === seg - 1) {
        x = ex;
        y = ey;
        z = ez;
      }
      const o = i * 4;
      center[o] = x;
      center[o + 1] = y;
      center[o + 2] = z;
      center[o + 3] = brightness(i, epoch, flicker);
    }
    if (branches.length > 0) {
      const prob = cfg.branchProbability || cfg.branches.probability || 0.04;
      const invB = 1 / (branchSegments - 1);
      const [l0, l1] = cfg.branches.length;
      const [ts0, ts1] = cfg.branches.thicknessScale;
      for (let b = 0; b < branches.length; b++) {
        const bc = branches[b];
        const h = mixSeedScalar(b + 1, cfg.seed, epoch) * (1 / 4294967296);
        const active = h < prob ? 1 : 0;
        const oT = mixSeedScalar(b, cfg.seed, 11) * (1 / 4294967296);
        const originIdx = Math.min(Math.round(oT * (seg - 1)), seg - 1);
        const oo0 = originIdx * 4;
        const ox = center[oo0],
          oy = center[oo0 + 1],
          oz = center[oo0 + 2];
        const dh = (ch) => mixSeedScalar(b, cfg.seed, ch) * (2 / 4294967296) - 1;
        let dxn = dh(13),
          dyn = dh(14),
          dzn = dh(15);
        const dl = Math.sqrt(dxn * dxn + dyn * dyn + dzn * dzn) || 1;
        dxn /= dl;
        dyn /= dl;
        dzn /= dl;
        const len = l0 + (l1 - l0) * (mixSeedScalar(b, cfg.seed, 16) * (1 / 4294967296));
        const scaleA = active ? len : 0;
        const w = ts0 + (ts1 - ts0) * (mixSeedScalar(b, cfg.seed, 17) * (1 / 4294967296));
        const wf = widths[originIdx];
        for (let i = 0; i < branchSegments; i++) bc.w[i] = wf;
        const bend = dh(18) * 0.28;
        const cX = ox + (dxn * 0.5 + bUx * bend) * scaleA;
        const cY = oy + (dyn * 0.5 + bUy * bend) * scaleA;
        const cZ = oz + (dzn * 0.5 + bUz * bend) * scaleA;
        const eX = ox + dxn * scaleA;
        const eY = oy + dyn * scaleA;
        const eZ = oz + dzn * scaleA;
        for (let i = 0; i < branchSegments; i++) {
          const s = i * invB;
          const w0 = (1 - s) * (1 - s);
          const w1 = 2 * (1 - s) * s;
          const w2 = s * s;
          const o = i * 4;
          bc.center[o] = w0 * ox + w1 * cX + w2 * eX;
          bc.center[o + 1] = w0 * oy + w1 * cY + w2 * eY;
          bc.center[o + 2] = w0 * oz + w1 * cZ + w2 * eZ;
          bc.center[o + 3] = active ? 1 : 0;
        }
        ((bc.core.halfWidth = cfg.thickness * w), (bc.glow.halfWidth = cfg.thickness * w * 3));
        for (const l of [bc.core, bc.glow]) {
          const arr = l.geometry.geometry.getAttribute('color');
          const fa = arr.array;
          for (let i = 0; i < branchSegments; i++) {
            const bv = active ? 1 : 0;
            const vi = i * 6;
            fa[vi] = bv;
            fa[vi + 1] = bv;
            fa[vi + 2] = bv;
            fa[vi + 3] = bv;
            fa[vi + 4] = bv;
            fa[vi + 5] = bv;
          }
          arr.needsUpdate = true;
        }
      }
    }
    for (const l of layers) {
      const arr = l.geometry.geometry.getAttribute('color');
      const fa = arr.array;
      for (let i = 0; i < seg; i++) {
        const bv = center[i * 4 + 3];
        const vi = i * 6;
        fa[vi] = bv;
        fa[vi + 1] = bv;
        fa[vi + 2] = bv;
        fa[vi + 3] = bv;
        fa[vi + 4] = bv;
        fa[vi + 5] = bv;
      }
      arr.needsUpdate = true;
    }
    if (contacts) {
      updateContactSprites(
        contacts.start,
        contacts.end,
        sx,
        sy,
        sz,
        ex,
        ey,
        ez,
        flicker,
        contacts.baseScale
      );
    }
    return flicker;
  };
  const hook = (layer, src, n, w) => {
    const posAttr = layer.geometry.geometry.getAttribute('position');
    const out = layer.geometry.positionArray;
    layer.mesh.onBeforeRender = (_r, _s, camera) => {
      const e = camera.matrixWorld.elements;
      _camRight.set(e[0], e[1], e[2]);
      const camX = e[12],
        camY = e[13],
        camZ = e[14];
      for (let i = 0; i < n; i++) {
        const o = i * 4;
        const cx = src[o],
          cy = src[o + 1],
          cz = src[o + 2];
        const pi = i > 0 ? (i - 1) * 4 : o;
        const ni = i < n - 1 ? (i + 1) * 4 : o;
        _prev.set(src[pi], src[pi + 1], src[pi + 2]);
        _next.set(src[ni], src[ni + 1], src[ni + 2]);
        _tangent.subVectors(_next, _prev);
        const tl = _tangent.length();
        if (tl < 1e-4) {
          _tangent.set(0, 1, 0);
        } else {
          _tangent.multiplyScalar(1 / tl);
        }
        const vx = camX - cx,
          vy = camY - cy,
          vz = camZ - cz;
        const vl = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
        const ux = vx / vl,
          uy = vy / vl,
          uz = vz / vl;
        const tx = _tangent.x,
          ty = _tangent.y,
          tz = _tangent.z;
        let px = ty * uz - tz * uy;
        let py = tz * ux - tx * uz;
        let pz = tx * uy - ty * ux;
        const pl = Math.sqrt(px * px + py * py + pz * pz);
        if (pl < 1e-4) {
          const cr = _camRight;
          const d = cr.x * tx + cr.y * ty + cr.z * tz;
          px = cr.x - tx * d;
          py = cr.y - ty * d;
          pz = cr.z - tz * d;
          const fl = Math.sqrt(px * px + py * py + pz * pz) || 1;
          px /= fl;
          py /= fl;
          pz /= fl;
        } else if (pl < 0.7) {
          const w2 = pl / 0.7;
          const nx = px / pl,
            ny = py / pl,
            nz = pz / pl;
          const cr = _camRight;
          const d = cr.x * tx + cr.y * ty + cr.z * tz;
          let fx = cr.x - tx * d;
          let fy = cr.y - ty * d;
          let fz = cr.z - tz * d;
          const fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
          fx /= fl;
          fy /= fl;
          fz /= fl;
          px = nx + (fx - nx) * (1 - w2);
          py = ny + (fy - ny) * (1 - w2);
          pz = nz + (fz - nz) * (1 - w2);
          const nl = Math.sqrt(px * px + py * py + pz * pz) || 1;
          px /= nl;
          py /= nl;
          pz /= nl;
        } else {
          px /= pl;
          py /= pl;
          pz /= pl;
        }
        const hw = w ? layer.halfWidth * w[i] : layer.halfWidth;
        const oL = i * 6;
        const oR = oL + 3;
        out[oL] = cx - px * hw;
        out[oL + 1] = cy - py * hw;
        out[oL + 2] = cz - pz * hw;
        out[oR] = cx + px * hw;
        out[oR + 1] = cy + py * hw;
        out[oR + 2] = cz + pz * hw;
      }
      posAttr.needsUpdate = true;
    };
  };
  const refreshHooks = () => {
    layers.forEach((l) => hook(l, center, seg, widths));
    for (const b of branches) {
      hook(b.core, b.center, branchSegments, b.w);
      hook(b.glow, b.center, branchSegments, b.w);
    }
  };
  refreshHooks();
  const updateLive = (patch) => {
    const cc = new THREE7.Color(cfg.coreColor).multiplyScalar(cfg.intensity);
    layers[0].material.color.copy(cc);
    layers[1].material.color
      .copy(new THREE7.Color(cfg.color))
      .multiplyScalar(cfg.glow.intensity * 0.8);
    layers[2].material.color
      .copy(new THREE7.Color(cfg.color))
      .multiplyScalar(cfg.glow.intensity * 0.4);
    layers[0].halfWidth = cfg.thickness * 0.5;
    layers[1].halfWidth = cfg.thickness * 0.5 * 2;
    layers[2].halfWidth = cfg.thickness * 0.5 * Math.max(2, cfg.glow.width);
    if (cfg.glow.profile !== lastProfile && patch?.glow?.profile !== void 0) {
      lastProfile = cfg.glow.profile;
      writeProfileTexture(coreMap, PROFILE_SIZE, 700, lastProfile);
      writeProfileTexture(innerMap, PROFILE_SIZE, 70, lastProfile);
      writeProfileTexture(haloMap, PROFILE_SIZE, 8, lastProfile);
    }
    if (contacts) {
      const col = new THREE7.Color(cfg.color);
      for (const m of contacts.materials) {
        m.color.setRGB(
          col.r * cfg.contact.intensity,
          col.g * cfg.contact.intensity,
          col.b * cfg.contact.intensity
        );
      }
      contacts.baseScale = Math.max(cfg.contact.radius * 2, 0.01);
    }
  };
  let disposed = false;
  return {
    root,
    update: (cycle, start, end) => update(cycle, start, end),
    updateLive,
    backend: 'CPU' /* CPU */,
    computeNode: null,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const l of layerAll) {
        l.mesh.onBeforeRender = void 0;
        l.material.dispose();
        l.geometry.geometry.dispose();
      }
      coreMap.dispose();
      innerMap.dispose();
      haloMap.dispose();
      if (contacts) {
        contacts.materials.forEach((m) => m.dispose());
      }
      contactTex.dispose();
    },
  };
}

// src/js/effects/electric-arc/electric-arc-gpu-registry.ts
var gpuFactory = null;
var gpuRenderer = null;
function registerElectricArcGPUFactory(factory, renderer) {
  gpuFactory = factory;
  gpuRenderer = renderer === void 0 ? null : renderer;
}
function getElectricArcGPUFactory() {
  return gpuFactory;
}
function getElectricArcGPURenderer() {
  return gpuRenderer;
}
function createArcLighting(cfg) {
  if (!cfg.lighting.enabled) return null;
  const color = new THREE7.Color(cfg.color);
  const makeLight = (intensity) => {
    const l = new THREE7.PointLight(16777215, intensity, cfg.lighting.distance, cfg.lighting.decay);
    l.color.copy(color);
    return l;
  };
  const startL = makeLight(cfg.lighting.endpointIntensity);
  const midL = makeLight(cfg.lighting.midpointIntensity);
  const endL = makeLight(cfg.lighting.endpointIntensity);
  const group = new THREE7.Group();
  group.add(startL, midL, endL);
  let disposed = false;
  return {
    group,
    lights: [startL, midL, endL],
    update: (start, end, flicker) => {
      if (disposed) return;
      startL.position.copy(start);
      endL.position.copy(end);
      midL.position.set((start.x + end.x) * 0.5, (start.y + end.y) * 0.5, (start.z + end.z) * 0.5);
      const base = Math.max(cfg.intensity, 1e-3);
      const micro = 0.9 + 0.1 * flicker;
      startL.intensity = cfg.lighting.endpointIntensity * micro;
      endL.intensity = cfg.lighting.endpointIntensity * micro;
      midL.intensity = ((cfg.lighting.midpointIntensity * micro) / (base > 1 ? 1 : 1)) * 1;
      midL.intensity = cfg.lighting.midpointIntensity * micro;
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      startL.dispose();
      midL.dispose();
      endL.dispose();
    },
  };
}
var _createParticleSystem = null;
async function resolveParticleSystemFactory() {
  if (_createParticleSystem) return _createParticleSystem;
  const mod = await import('./three-particles-XJBIM5P3.js');
  _createParticleSystem = mod.createParticleSystem;
  return _createParticleSystem;
}
var sparkConfig = (cfg) => {
  const s = cfg.sparks;
  return {
    duration: 0,
    looping: true,
    startLifetime: {
      min: Math.max(0.02, s.lifetime[0]),
      max: Math.max(0.03, s.lifetime[1]),
    },
    startSpeed: { min: s.speed[0], max: s.speed[1] },
    startSize: { min: s.size[0], max: s.size[1] },
    startOpacity: 1,
    startColor: {
      min: { r: 1, g: 1, b: 0.85 },
      max: { r: 0.72, g: 1, b: 0.39 },
    },
    maxParticles: Math.min(64, Math.max(8, Math.round(s.rate * 0.6))),
    gravity: 1.5,
    emission: { rateOverTime: s.rate },
    shape: { shape: 'SPHERE', sphere: { radius: 0.02, radiusThickness: 1 } },
    renderer: {
      blending: THREE7.AdditiveBlending,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    },
    opacityOverLifetime: {
      isActive: true,
      lifetimeCurve: {
        type: 'BEZIER',
        bezierPoints: [
          { x: 0, y: 1 },
          { x: 1, y: 0 },
        ],
      },
    },
  };
};
var pushSparkLiveConfig = (systems, cfg) => {
  const s = cfg.sparks;
  const patch = {
    startLifetime: {
      min: Math.max(0.02, s.lifetime[0]),
      max: Math.max(0.03, s.lifetime[1]),
    },
    startSpeed: { min: s.speed[0], max: s.speed[1] },
    startSize: { min: s.size[0], max: s.size[1] },
    maxParticles: Math.min(64, Math.max(8, Math.round(s.rate * 0.6))),
    emission: { rateOverTime: s.rate },
  };
  for (const sys of systems) {
    try {
      sys.updateConfig(patch);
    } catch {}
  }
};
function createArcSparks(cfg) {
  if (!cfg.sparks.enabled || cfg.sparks.rate <= 0) return null;
  const base = sparkConfig(cfg);
  const group = new THREE7.Group();
  const systems = [];
  void resolveParticleSystemFactory().then((factory) => {
    if (!factory || systems.length > 0) return;
    try {
      for (let i = 0; i < 3; i++) systems.push(factory({ ...base }));
      for (const s of systems) group.add(s.instance);
    } catch {
      systems.length = 0;
    }
  });
  const posA = new THREE7.Vector3();
  const posB = new THREE7.Vector3();
  const posC = new THREE7.Vector3();
  let disposed = false;
  return {
    group,
    systems,
    update: (cycle, start, end) => {
      if (disposed) return;
      const mix = mixSeedScalar(cfg.seed, 1, 17) * (1 / 4294967296);
      const t = 0.3 + mix * 0.4;
      posC.set(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t,
        start.z + (end.z - start.z) * t
      );
      posA.copy(start);
      posB.copy(end);
      if (systems.length < 3) return;
      systems[0].instance.position.copy(posA);
      systems[1].instance.position.copy(posB);
      systems[2].instance.position.copy(posC);
      systems[0].update(cycle);
      systems[1].update(cycle);
      systems[2].update(cycle);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const s of systems) {
        try {
          s.dispose();
        } catch {}
      }
    },
  };
}

// src/js/effects/electric-arc/electric-arc.ts
var _zero = new THREE7.Vector3();
var _tmp = new THREE7.Vector3();
var _helper2 = new THREE7.Vector3();
var _local = new THREE7.Vector3();
new THREE7.Vector3();
var _euler = new THREE7.Euler(0, 0, 0, 'XYZ');
var _rotM = new THREE7.Matrix4();
var DEG2 = Math.PI / 180;
var resolveEndpoint = (ref, out) => {
  if (!ref) return;
  if (ref instanceof THREE7.Object3D) {
    ref.updateWorldMatrix(true, false);
    out.setFromMatrixPosition(ref.matrixWorld);
    return;
  }
  const maybe = ref;
  if (maybe.object instanceof THREE7.Object3D) {
    maybe.object.updateWorldMatrix(true, false);
    const { x = 0, y = 0, z = 0 } = maybe.offset ?? _zero;
    _tmp.set(x, y, z);
    out.copy(maybe.object.matrixWorld ? _tmp.applyMatrix4(maybe.object.matrixWorld) : out);
    return;
  }
  const p = ref;
  if (typeof p.x === 'number' || typeof p.y === 'number' || typeof p.z === 'number') {
    out.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
  }
};
function createElectricArc(config) {
  const normalized = normalizeElectricArcConfig(config);
  const gpuFactory2 = getElectricArcGPUFactory();
  const gpuRenderer2 = gpuFactory2 ? getElectricArcGPURenderer() : null;
  const resolved = resolveSimulationBackend(gpuRenderer2 ?? void 0, normalized.simulationBackend);
  const useGPU = resolved === 'GPU' /* GPU */ && !!gpuFactory2;
  const instance = new THREE7.Group();
  instance.name = 'electric-arc';
  const createBackend = (cfg) => {
    if (useGPU && gpuFactory2) return gpuFactory2.create(cfg);
    return createElectricArcCpu(cfg);
  };
  let backend = createBackend(normalized);
  instance.add(backend.root);
  let lighting = createArcLighting(normalized);
  let sparks = createArcSparks(normalized);
  if (lighting) instance.add(lighting.group);
  if (sparks) instance.add(sparks.group);
  let startDirect = normalized.start.clone();
  let endDirect = normalized.end.clone();
  let binding = null;
  const scratchStart = new THREE7.Vector3();
  const scratchEnd = new THREE7.Vector3();
  const _effStart = new THREE7.Vector3();
  const _effEnd = new THREE7.Vector3();
  const _chordN = new THREE7.Vector3();
  const _chordU = new THREE7.Vector3();
  const _chordV = new THREE7.Vector3();
  const _startN = new THREE7.Vector3();
  const _startU = new THREE7.Vector3();
  const _startV = new THREE7.Vector3();
  const _endN = new THREE7.Vector3();
  const _endU = new THREE7.Vector3();
  const _endV = new THREE7.Vector3();
  let _startFrameSource = 'chord';
  let _endFrameSource = 'chord';
  const resolveEndpoints = () => {
    if (binding) {
      resolveEndpoint(binding.start, scratchStart);
      resolveEndpoint(binding.end, scratchEnd);
    } else {
      scratchStart.copy(startDirect);
      scratchEnd.copy(endDirect);
    }
  };
  resolveEndpoints();
  const chordFrame = () => {
    _chordN.subVectors(scratchEnd, scratchStart);
    const len = _chordN.length();
    if (len < 1e-4 || !Number.isFinite(len)) {
      _chordN.set(0, 0, 1);
      _chordU.set(1, 0, 0);
      _chordV.set(0, 1, 0);
      return;
    }
    _chordN.multiplyScalar(1 / len);
    if (_chordN.y < 0.85 && _chordN.y > -0.85) _helper2.set(0, 1, 0);
    else _helper2.set(1, 0, 0);
    _chordU.crossVectors(_chordN, _helper2).normalize();
    _chordV.crossVectors(_chordN, _chordU).normalize();
  };
  const objectFrame = (ref, n, u, v) => {
    const obj = ref instanceof THREE7.Object3D ? ref : ref?.object;
    if (!(obj instanceof THREE7.Object3D)) return false;
    obj.updateWorldMatrix(true, false);
    const m = obj.matrixWorld.elements;
    u.set(m[0], m[1], m[2]);
    v.set(m[4], m[5], m[6]);
    n.set(m[8], m[9], m[10]);
    if (u.lengthSq() < 1e-8 || v.lengthSq() < 1e-8 || n.lengthSq() < 1e-8) return false;
    u.normalize();
    v.normalize();
    n.normalize();
    return true;
  };
  const copyChordInto = (n, u, v) => {
    n.copy(_chordN);
    u.copy(_chordU);
    v.copy(_chordV);
  };
  const applyEndpointTransform = (base, offset, rot, u, v, n, out) => {
    out.copy(base);
    if (offset.lengthSq() === 0) return;
    _euler.set(rot.pitch * DEG2, rot.yaw * DEG2, rot.roll * DEG2, 'XYZ');
    _rotM.makeRotationFromEuler(_euler);
    _local.copy(offset).applyMatrix4(_rotM);
    out.addScaledVector(u, _local.x);
    out.addScaledVector(v, _local.y);
    out.addScaledVector(n, _local.z);
  };
  const composeEndpoints = () => {
    chordFrame();
    _startFrameSource = objectFrame(
      binding ? binding.start : startDirect,
      _startN,
      _startU,
      _startV
    )
      ? 'object'
      : (copyChordInto(_startN, _startU, _startV), 'chord');
    _endFrameSource = objectFrame(binding ? binding.end : endDirect, _endN, _endU, _endV)
      ? 'object'
      : (copyChordInto(_endN, _endU, _endV), 'chord');
    applyEndpointTransform(
      scratchStart,
      normalized.startOffset,
      normalized.startRotation,
      _startU,
      _startV,
      _startN,
      _effStart
    );
    applyEndpointTransform(
      scratchEnd,
      normalized.endOffset,
      normalized.endRotation,
      _endU,
      _endV,
      _endN,
      _effEnd
    );
    scratchStart.copy(_effStart);
    scratchEnd.copy(_effEnd);
  };
  let disposedFlag = false;
  const rebuild = () => {
    instance.remove(backend.root);
    backend.dispose();
    backend = createBackend(normalized);
    instance.add(backend.root);
  };
  const update = (cycle) => {
    if (disposedFlag) return;
    resolveEndpoints();
    composeEndpoints();
    if (normalized.rotationZ) {
      rotateZ2(scratchStart, normalized.rotationZ);
      rotateZ2(scratchEnd, normalized.rotationZ);
    }
    const flicker = backend.update(cycle, scratchStart, scratchEnd);
    if (lighting) lighting.update(scratchStart, scratchEnd, flicker);
    if (sparks) sparks.update(cycle, scratchStart, scratchEnd);
  };
  const updateConfig = (patch) => {
    if (disposedFlag) return;
    const structural = touchesStructuralField(patch);
    mergeLiveConfig(normalized, patch);
    if (structural) {
      if (lighting) {
        instance.remove(lighting.group);
        lighting.dispose();
        lighting = createArcLighting(normalized);
        if (lighting) instance.add(lighting.group);
      }
      if (sparks) {
        instance.remove(sparks.group);
        sparks.dispose();
        sparks = createArcSparks(normalized);
        if (sparks) instance.add(sparks.group);
      }
      rebuild();
    } else {
      backend.updateLive(patch);
      if (sparks && patch.sparks !== void 0 && sparks.systems.length > 0) {
        pushSparkLiveConfig(sparks.systems, normalized);
      }
    }
  };
  return {
    instance,
    update,
    updateConfig,
    setEndpoints(start, end) {
      startDirect = toPoint(start);
      endDirect = toPoint(end);
    },
    bindEndpoints(next) {
      binding = next;
    },
    clearEndpointBinding() {
      binding = null;
    },
    getRuntimeEndpoints() {
      resolveEndpoints();
      const baseStart = {
        x: scratchStart.x,
        y: scratchStart.y,
        z: scratchStart.z,
      };
      const baseEnd = {
        x: scratchEnd.x,
        y: scratchEnd.y,
        z: scratchEnd.z,
      };
      composeEndpoints();
      const startFrame = {
        tangent: { x: _startN.x, y: _startN.y, z: _startN.z },
        normal: { x: _startU.x, y: _startU.y, z: _startU.z },
        binormal: { x: _startV.x, y: _startV.y, z: _startV.z },
        frameSource: _startFrameSource,
      };
      const endFrame = {
        tangent: { x: _endN.x, y: _endN.y, z: _endN.z },
        normal: { x: _endU.x, y: _endU.y, z: _endU.z },
        binormal: { x: _endV.x, y: _endV.y, z: _endV.z },
        frameSource: _endFrameSource,
      };
      if (normalized.rotationZ) {
        rotateZ2(scratchStart, normalized.rotationZ);
        rotateZ2(scratchEnd, normalized.rotationZ);
      }
      const sourceId =
        (binding &&
          (binding.start instanceof THREE7.Object3D
            ? binding.start.name
            : binding.start.object?.name)) ||
        void 0;
      return {
        mode: binding ? 'bound' : 'standalone',
        ...(sourceId ? { sourceId } : {}),
        baseStart,
        baseEnd,
        effectiveStart: {
          x: scratchStart.x,
          y: scratchStart.y,
          z: scratchStart.z,
        },
        effectiveEnd: { x: scratchEnd.x, y: scratchEnd.y, z: scratchEnd.z },
        startFrame,
        endFrame,
      };
    },
    get backend() {
      return backend.backend;
    },
    get computeNode() {
      const arcNode = backend.computeNode;
      if (sparks && sparks.systems.length > 0) {
        const nodes = [];
        if (Array.isArray(arcNode)) nodes.push(...arcNode);
        else if (arcNode) nodes.push(arcNode);
        for (const s of sparks.systems) {
          const sn = s.computeNode;
          if (Array.isArray(sn)) nodes.push(...sn);
          else if (sn) nodes.push(sn);
        }
        return nodes.length > 0 ? nodes : null;
      }
      return arcNode;
    },
    dispose() {
      if (disposedFlag) return;
      disposedFlag = true;
      backend.dispose();
      lighting?.dispose();
      sparks?.dispose();
      for (const child of [...instance.children]) instance.remove(child);
    },
  };
}
var toPoint = (p) => new THREE7.Vector3(p.x ?? 0, p.y ?? 0, p.z ?? 0);
var CurveFunctionId = /* @__PURE__ */ ((CurveFunctionId3) => {
  CurveFunctionId3['BEZIER'] = 'BEZIER';
  CurveFunctionId3['LINEAR'] = 'LINEAR';
  CurveFunctionId3['QUADRATIC_IN'] = 'QUADRATIC_IN';
  CurveFunctionId3['QUADRATIC_OUT'] = 'QUADRATIC_OUT';
  CurveFunctionId3['QUADRATIC_IN_OUT'] = 'QUADRATIC_IN_OUT';
  CurveFunctionId3['CUBIC_IN'] = 'CUBIC_IN';
  CurveFunctionId3['CUBIC_OUT'] = 'CUBIC_OUT';
  CurveFunctionId3['CUBIC_IN_OUT'] = 'CUBIC_IN_OUT';
  CurveFunctionId3['QUARTIC_IN'] = 'QUARTIC_IN';
  CurveFunctionId3['QUARTIC_OUT'] = 'QUARTIC_OUT';
  CurveFunctionId3['QUARTIC_IN_OUT'] = 'QUARTIC_IN_OUT';
  CurveFunctionId3['QUINTIC_IN'] = 'QUINTIC_IN';
  CurveFunctionId3['QUINTIC_OUT'] = 'QUINTIC_OUT';
  CurveFunctionId3['QUINTIC_IN_OUT'] = 'QUINTIC_IN_OUT';
  CurveFunctionId3['SINUSOIDAL_IN'] = 'SINUSOIDAL_IN';
  CurveFunctionId3['SINUSOIDAL_OUT'] = 'SINUSOIDAL_OUT';
  CurveFunctionId3['SINUSOIDAL_IN_OUT'] = 'SINUSOIDAL_IN_OUT';
  CurveFunctionId3['EXPONENTIAL_IN'] = 'EXPONENTIAL_IN';
  CurveFunctionId3['EXPONENTIAL_OUT'] = 'EXPONENTIAL_OUT';
  CurveFunctionId3['EXPONENTIAL_IN_OUT'] = 'EXPONENTIAL_IN_OUT';
  CurveFunctionId3['CIRCULAR_IN'] = 'CIRCULAR_IN';
  CurveFunctionId3['CIRCULAR_OUT'] = 'CIRCULAR_OUT';
  CurveFunctionId3['CIRCULAR_IN_OUT'] = 'CIRCULAR_IN_OUT';
  CurveFunctionId3['ELASTIC_IN'] = 'ELASTIC_IN';
  CurveFunctionId3['ELASTIC_OUT'] = 'ELASTIC_OUT';
  CurveFunctionId3['ELASTIC_IN_OUT'] = 'ELASTIC_IN_OUT';
  CurveFunctionId3['BACK_IN'] = 'BACK_IN';
  CurveFunctionId3['BACK_OUT'] = 'BACK_OUT';
  CurveFunctionId3['BACK_IN_OUT'] = 'BACK_IN_OUT';
  CurveFunctionId3['BOUNCE_IN'] = 'BOUNCE_IN';
  CurveFunctionId3['BOUNCE_OUT'] = 'BOUNCE_OUT';
  CurveFunctionId3['BOUNCE_IN_OUT'] = 'BOUNCE_IN_OUT';
  return CurveFunctionId3;
})(CurveFunctionId || {});
var curveFunctionIdMap = {
  ['LINEAR' /* LINEAR */]: Easing.Linear.None,
  ['QUADRATIC_IN' /* QUADRATIC_IN */]: Easing.Quadratic.In,
  ['QUADRATIC_OUT' /* QUADRATIC_OUT */]: Easing.Quadratic.Out,
  ['QUADRATIC_IN_OUT' /* QUADRATIC_IN_OUT */]: Easing.Quadratic.InOut,
  ['CUBIC_IN' /* CUBIC_IN */]: Easing.Cubic.In,
  ['CUBIC_OUT' /* CUBIC_OUT */]: Easing.Cubic.Out,
  ['CUBIC_IN_OUT' /* CUBIC_IN_OUT */]: Easing.Cubic.InOut,
  ['QUARTIC_IN' /* QUARTIC_IN */]: Easing.Quartic.In,
  ['QUARTIC_OUT' /* QUARTIC_OUT */]: Easing.Quartic.Out,
  ['QUARTIC_IN_OUT' /* QUARTIC_IN_OUT */]: Easing.Quartic.InOut,
  ['QUINTIC_IN' /* QUINTIC_IN */]: Easing.Quintic.In,
  ['QUINTIC_OUT' /* QUINTIC_OUT */]: Easing.Quintic.Out,
  ['QUINTIC_IN_OUT' /* QUINTIC_IN_OUT */]: Easing.Quintic.InOut,
  ['SINUSOIDAL_IN' /* SINUSOIDAL_IN */]: Easing.Sinusoidal.In,
  ['SINUSOIDAL_OUT' /* SINUSOIDAL_OUT */]: Easing.Sinusoidal.Out,
  ['SINUSOIDAL_IN_OUT' /* SINUSOIDAL_IN_OUT */]: Easing.Sinusoidal.InOut,
  ['EXPONENTIAL_IN' /* EXPONENTIAL_IN */]: Easing.Exponential.In,
  ['EXPONENTIAL_OUT' /* EXPONENTIAL_OUT */]: Easing.Exponential.Out,
  ['EXPONENTIAL_IN_OUT' /* EXPONENTIAL_IN_OUT */]: Easing.Exponential.InOut,
  ['CIRCULAR_IN' /* CIRCULAR_IN */]: Easing.Circular.In,
  ['CIRCULAR_OUT' /* CIRCULAR_OUT */]: Easing.Circular.Out,
  ['CIRCULAR_IN_OUT' /* CIRCULAR_IN_OUT */]: Easing.Circular.InOut,
  ['ELASTIC_IN' /* ELASTIC_IN */]: Easing.Elastic.In,
  ['ELASTIC_OUT' /* ELASTIC_OUT */]: Easing.Elastic.Out,
  ['ELASTIC_IN_OUT' /* ELASTIC_IN_OUT */]: Easing.Elastic.InOut,
  ['BACK_IN' /* BACK_IN */]: Easing.Back.In,
  ['BACK_OUT' /* BACK_OUT */]: Easing.Back.Out,
  ['BACK_IN_OUT' /* BACK_IN_OUT */]: Easing.Back.InOut,
  ['BOUNCE_IN' /* BOUNCE_IN */]: Easing.Bounce.In,
  ['BOUNCE_OUT' /* BOUNCE_OUT */]: Easing.Bounce.Out,
  ['BOUNCE_IN_OUT' /* BOUNCE_IN_OUT */]: Easing.Bounce.InOut,
};
var getCurveFunction = (curveFunctionId) =>
  typeof curveFunctionId === 'function' ? curveFunctionId : curveFunctionIdMap[curveFunctionId];
var noiseInput = new THREE7.Vector3(0, 0, 0);
var orbitalEuler = new THREE7.Euler();
var applyModifiers = ({
  delta,
  generalData,
  normalizedConfig,
  attributes,
  scalarArray,
  particleLifetimePercentage,
  particleIndex,
  updateFlags,
}) => {
  const {
    particleSystemId,
    startValues,
    lifetimeValues,
    linearVelocityData,
    orbitalVelocityData,
    noise,
    modifierCurves,
  } = generalData;
  const positionIndex = particleIndex * 3;
  const positionArr = attributes.position.array;
  const base = particleIndex * SCALAR_STRIDE;
  if (linearVelocityData) {
    const { speed, valueModifiers } = linearVelocityData[particleIndex];
    const normalizedXSpeed = valueModifiers.x
      ? valueModifiers.x(particleLifetimePercentage)
      : speed.x;
    const normalizedYSpeed = valueModifiers.y
      ? valueModifiers.y(particleLifetimePercentage)
      : speed.y;
    const normalizedZSpeed = valueModifiers.z
      ? valueModifiers.z(particleLifetimePercentage)
      : speed.z;
    positionArr[positionIndex] += normalizedXSpeed * delta;
    positionArr[positionIndex + 1] += normalizedYSpeed * delta;
    positionArr[positionIndex + 2] += normalizedZSpeed * delta;
    if (updateFlags) updateFlags.position = true;
    else attributes.position.needsUpdate = true;
  }
  if (orbitalVelocityData) {
    const { speed, positionOffset, valueModifiers } = orbitalVelocityData[particleIndex];
    positionArr[positionIndex] -= positionOffset.x;
    positionArr[positionIndex + 1] -= positionOffset.y;
    positionArr[positionIndex + 2] -= positionOffset.z;
    const normalizedXSpeed = valueModifiers.x
      ? valueModifiers.x(particleLifetimePercentage)
      : speed.x;
    const normalizedYSpeed = valueModifiers.y
      ? valueModifiers.y(particleLifetimePercentage)
      : speed.y;
    const normalizedZSpeed = valueModifiers.z
      ? valueModifiers.z(particleLifetimePercentage)
      : speed.z;
    orbitalEuler.set(normalizedXSpeed * delta, normalizedZSpeed * delta, normalizedYSpeed * delta);
    positionOffset.applyEuler(orbitalEuler);
    positionArr[positionIndex] += positionOffset.x;
    positionArr[positionIndex + 1] += positionOffset.y;
    positionArr[positionIndex + 2] += positionOffset.z;
    if (updateFlags) updateFlags.position = true;
    else attributes.position.needsUpdate = true;
  }
  if (normalizedConfig.sizeOverLifetime.isActive) {
    const multiplier = modifierCurves?.size
      ? modifierCurves.size(particleLifetimePercentage)
      : calculateValue(
          particleSystemId,
          normalizedConfig.sizeOverLifetime.lifetimeCurve,
          particleLifetimePercentage
        );
    scalarArray[base + S_SIZE] = startValues.startSize[particleIndex] * multiplier;
  }
  if (normalizedConfig.opacityOverLifetime.isActive) {
    const multiplier = modifierCurves?.opacity
      ? modifierCurves.opacity(particleLifetimePercentage)
      : calculateValue(
          particleSystemId,
          normalizedConfig.opacityOverLifetime.lifetimeCurve,
          particleLifetimePercentage
        );
    scalarArray[base + S_COLOR_A] = startValues.startOpacity[particleIndex] * multiplier;
  }
  if (normalizedConfig.colorOverLifetime.isActive) {
    const rMultiplier = modifierCurves?.colorR
      ? modifierCurves.colorR(particleLifetimePercentage)
      : calculateValue(
          particleSystemId,
          normalizedConfig.colorOverLifetime.r,
          particleLifetimePercentage
        );
    const gMultiplier = modifierCurves?.colorG
      ? modifierCurves.colorG(particleLifetimePercentage)
      : calculateValue(
          particleSystemId,
          normalizedConfig.colorOverLifetime.g,
          particleLifetimePercentage
        );
    const bMultiplier = modifierCurves?.colorB
      ? modifierCurves.colorB(particleLifetimePercentage)
      : calculateValue(
          particleSystemId,
          normalizedConfig.colorOverLifetime.b,
          particleLifetimePercentage
        );
    scalarArray[base + S_COLOR_R] = startValues.startColorR[particleIndex] * rMultiplier;
    scalarArray[base + S_COLOR_G] = startValues.startColorG[particleIndex] * gMultiplier;
    scalarArray[base + S_COLOR_B] = startValues.startColorB[particleIndex] * bMultiplier;
  }
  if (lifetimeValues.rotationOverLifetime) {
    scalarArray[base + S_ROTATION] +=
      lifetimeValues.rotationOverLifetime[particleIndex] * delta * 0.02;
  }
  if (noise.isActive) {
    const { sampler, strength, noisePower, offsets, positionAmount, rotationAmount, sizeAmount } =
      noise;
    let noiseOnPosition;
    const noisePosition =
      (particleLifetimePercentage + (offsets ? offsets[particleIndex] : 0)) * 10 * strength;
    noiseInput.set(noisePosition, 0, 0);
    noiseOnPosition = sampler.get3(noiseInput);
    positionArr[positionIndex] += noiseOnPosition * noisePower * positionAmount;
    if (rotationAmount !== 0) {
      scalarArray[base + S_ROTATION] += noiseOnPosition * noisePower * rotationAmount;
    }
    if (sizeAmount !== 0) {
      scalarArray[base + S_SIZE] += noiseOnPosition * noisePower * sizeAmount;
    }
    noiseInput.set(noisePosition, noisePosition, 0);
    noiseOnPosition = sampler.get3(noiseInput);
    positionArr[positionIndex + 1] += noiseOnPosition * noisePower * positionAmount;
    noiseInput.set(noisePosition, noisePosition, noisePosition);
    noiseOnPosition = sampler.get3(noiseInput);
    positionArr[positionIndex + 2] += noiseOnPosition * noisePower * positionAmount;
    if (updateFlags) updateFlags.position = true;
    else attributes.position.needsUpdate = true;
  }
  if (attributes.quat) {
    const rotZ = scalarArray[base + S_ROTATION];
    const halfZ = rotZ * 0.5;
    const qi = particleIndex * 4;
    attributes.quat.array[qi] = 0;
    attributes.quat.array[qi + 1] = 0;
    attributes.quat.array[qi + 2] = Math.sin(halfZ);
    attributes.quat.array[qi + 3] = Math.cos(halfZ);
    if (updateFlags) updateFlags.quat = true;
    else attributes.quat.needsUpdate = true;
  }
};
var SERIALIZATION_VERSION = 1;
var reverseBlendingMap = new Map(Object.entries(blendingMap).map(([k, v]) => [v, k]));
var reverseCurveFunctionMap = /* @__PURE__ */ new Map();
for (const [id, fn] of Object.entries(curveFunctionIdMap)) {
  if (fn) reverseCurveFunctionMap.set(fn, id);
}
function serializeAny(value, key) {
  if (value === null || value === void 0) return value;
  if (value instanceof THREE7.Vector3) return { x: value.x, y: value.y, z: value.z };
  if (value instanceof THREE7.Vector2) return { x: value.x, y: value.y };
  if (value instanceof THREE7.Texture) return void 0;
  if (typeof value === 'function') return void 0;
  if (Array.isArray(value)) return value.map((item) => serializeAny(item));
  if (typeof value === 'object') {
    const obj = value;
    if (obj['type'] === 'EASING' /* EASING */ && typeof obj['curveFunction'] === 'function') {
      const id = reverseCurveFunctionMap.get(obj['curveFunction']);
      if (!id) {
        throw new Error(
          'Cannot serialize a custom curveFunction. Use a predefined CurveFunctionId instead.'
        );
      }
      return {
        type: 'EASING' /* EASING */,
        curveFunctionId: id,
        ...(obj['scale'] !== void 0 ? { scale: obj['scale'] } : {}),
      };
    }
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'onUpdate' || k === 'onComplete') continue;
      if (k === 'blending' && typeof v === 'number') {
        result[k] = reverseBlendingMap.get(v) ?? v;
        continue;
      }
      const serialized = serializeAny(v);
      if (serialized !== void 0) result[k] = serialized;
    }
    return result;
  }
  return value;
}
function serializeParticleSystem(config) {
  const serialized = serializeAny(config);
  return JSON.stringify({ _version: SERIALIZATION_VERSION, ...serialized });
}
function deserializeCurve(raw) {
  const obj = raw;
  if (Array.isArray(obj['bezierPoints']) && !obj['type']) {
    return { type: 'BEZIER' /* BEZIER */, ...obj };
  }
  if (obj['type'] === 'EASING' /* EASING */) {
    const id = obj['curveFunctionId'];
    const fn = getCurveFunction(id);
    if (!fn) {
      throw new Error(`Unknown curveFunctionId: "${id}". Use a value from CurveFunctionId.`);
    }
    const curve = {
      type: 'EASING' /* EASING */,
      curveFunction: fn,
    };
    if (obj['scale'] !== void 0) curve.scale = obj['scale'];
    return curve;
  }
  return obj;
}
function deserializeCurveOrValue(value) {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'object') return value;
  const obj = value;
  const looksLikeCurve =
    Array.isArray(obj['bezierPoints']) ||
    obj['type'] === 'BEZIER' /* BEZIER */ ||
    obj['type'] === 'EASING' /* EASING */ ||
    typeof obj['curveFunctionId'] === 'string';
  if (looksLikeCurve) return deserializeCurve(obj);
  return obj;
}
function deserializeVector3(raw) {
  if (!raw || typeof raw !== 'object') return void 0;
  const { x = 0, y = 0, z = 0 } = raw;
  return new THREE7.Vector3(x, y, z);
}
function deserializeVector2(raw) {
  if (!raw || typeof raw !== 'object') return void 0;
  const { x = 1, y = 1 } = raw;
  return new THREE7.Vector2(x, y);
}
function deserializeConfig(raw) {
  const config = {};
  if (raw['transform'] && typeof raw['transform'] === 'object') {
    const t = raw['transform'];
    config.transform = {
      position: deserializeVector3(t['position']),
      rotation: deserializeVector3(t['rotation']),
      scale: deserializeVector3(t['scale']),
    };
  }
  for (const field of [
    'duration',
    'looping',
    'gravity',
    'simulationSpace',
    'simulationBackend',
    'maxParticles',
  ]) {
    if (field in raw) config[field] = raw[field];
  }
  for (const field of [
    'startDelay',
    'startLifetime',
    'startSpeed',
    'startSize',
    'startOpacity',
    'startRotation',
  ]) {
    if (field in raw) config[field] = deserializeCurveOrValue(raw[field]);
  }
  if ('startColor' in raw) config.startColor = raw['startColor'];
  if (raw['emission'] && typeof raw['emission'] === 'object') {
    const e = raw['emission'];
    config.emission = {
      rateOverTime: deserializeCurveOrValue(e['rateOverTime']),
      rateOverDistance: deserializeCurveOrValue(e['rateOverDistance']),
      bursts: Array.isArray(e['bursts']) ? e['bursts'] : [],
    };
  }
  if ('shape' in raw) config.shape = raw['shape'];
  if (raw['renderer'] && typeof raw['renderer'] === 'object') {
    const r = raw['renderer'];
    const blending =
      typeof r['blending'] === 'string'
        ? (blendingMap[r['blending']] ?? THREE7.NormalBlending)
        : (r['blending'] ?? THREE7.NormalBlending);
    config.renderer = { ...r, blending };
  }
  if (raw['velocityOverLifetime'] && typeof raw['velocityOverLifetime'] === 'object') {
    const vol = raw['velocityOverLifetime'];
    const deserializeAxis = (axis) => {
      if (!axis || typeof axis !== 'object') return {};
      const a = axis;
      return {
        ...(a['x'] !== void 0 ? { x: deserializeCurveOrValue(a['x']) } : {}),
        ...(a['y'] !== void 0 ? { y: deserializeCurveOrValue(a['y']) } : {}),
        ...(a['z'] !== void 0 ? { z: deserializeCurveOrValue(a['z']) } : {}),
      };
    };
    config.velocityOverLifetime = {
      isActive: vol['isActive'] ?? false,
      linear: deserializeAxis(vol['linear']),
      orbital: deserializeAxis(vol['orbital']),
    };
  }
  for (const field of ['sizeOverLifetime', 'opacityOverLifetime']) {
    if (raw[field] && typeof raw[field] === 'object') {
      const m = raw[field];
      config[field] = {
        isActive: m['isActive'] ?? false,
        lifetimeCurve: deserializeCurve(m['lifetimeCurve']),
      };
    }
  }
  if (raw['colorOverLifetime'] && typeof raw['colorOverLifetime'] === 'object') {
    const col = raw['colorOverLifetime'];
    config.colorOverLifetime = {
      isActive: col['isActive'] ?? true,
      r: deserializeCurve(col['r']),
      g: deserializeCurve(col['g']),
      b: deserializeCurve(col['b']),
    };
  }
  if (raw['rotationOverLifetime'] && typeof raw['rotationOverLifetime'] === 'object') {
    config.rotationOverLifetime = raw['rotationOverLifetime'];
  }
  if (raw['noise'] && typeof raw['noise'] === 'object') {
    config.noise = raw['noise'];
  }
  if (raw['textureSheetAnimation'] && typeof raw['textureSheetAnimation'] === 'object') {
    const tsa = raw['textureSheetAnimation'];
    config.textureSheetAnimation = {
      ...tsa,
      tiles: deserializeVector2(tsa['tiles']),
      startFrame: deserializeCurveOrValue(tsa['startFrame']),
    };
  }
  if (Array.isArray(raw['subEmitters'])) {
    config.subEmitters = raw['subEmitters'].map((se) => ({
      ...se,
      config: deserializeConfig(se['config']),
    }));
  }
  if (Array.isArray(raw['forceFields'])) {
    config.forceFields = raw['forceFields'].map((ff) => {
      const result = {};
      if ('isActive' in ff) result.isActive = ff['isActive'];
      if ('type' in ff) result.type = ff['type'];
      if (ff['position']) result.position = deserializeVector3(ff['position']);
      if (ff['direction']) result.direction = deserializeVector3(ff['direction']);
      if ('strength' in ff) result.strength = deserializeCurveOrValue(ff['strength']);
      if ('range' in ff) result.range = ff['range'] === null ? Infinity : ff['range'];
      if ('falloff' in ff) result.falloff = ff['falloff'];
      return result;
    });
  }
  if (Array.isArray(raw['collisionPlanes'])) {
    config.collisionPlanes = raw['collisionPlanes'].map((cp) => {
      const result = {};
      if ('isActive' in cp) result.isActive = cp['isActive'];
      if ('mode' in cp) result.mode = cp['mode'];
      if (cp['position']) result.position = deserializeVector3(cp['position']);
      if (cp['normal']) result.normal = deserializeVector3(cp['normal']);
      if ('dampen' in cp) result.dampen = cp['dampen'];
      if ('lifetimeLoss' in cp) result.lifetimeLoss = cp['lifetimeLoss'];
      return result;
    });
  }
  for (const key of Object.keys(raw)) {
    if (!(key in config) && key !== '_version' && raw[key] !== null) {
      config[key] = raw[key];
    }
  }
  return config;
}
function deserializeParticleSystem(json) {
  const parsed = JSON.parse(json);
  const { _version: _, ...raw } = parsed;
  return deserializeConfig(raw);
}

export {
  CurveFunctionId,
  ELECTRIC_ARC_BASE,
  ELECTRIC_ARC_PRESET_CINEMATIC,
  ELECTRIC_ARC_TIERS,
  ELECTRIC_ARC_TIER_SEGMENTS,
  ORGANIC_HOLD_SPAN,
  ORGANIC_HOLD_START,
  PULSE_DECAY,
  PULSE_DEG_GAIN,
  PULSE_DEG_WIDTH,
  PULSE_MAX_SLOTS,
  PULSE_RISE,
  PULSE_THIN_MIN,
  REVISION,
  applyModifiers,
  chaosAmplitude,
  chaosFlickerHz,
  coarseOffset,
  colorToNumber,
  createElectricArc,
  curveFunctionIdMap,
  deserializeParticleSystem,
  dischargeHash,
  getCurveFunction,
  getElectricArcGPUFactory,
  getElectricArcGPURenderer,
  globalFlicker,
  mergeLiveConfig,
  nextElectricArcSeed,
  normalizeElectricArcConfig,
  organicOffset,
  pulseEnvelope,
  pulseOffset,
  registerElectricArcGPUFactory,
  rotateZ2,
  serializeParticleSystem,
  touchesStructuralField,
  widthFactor,
};
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
