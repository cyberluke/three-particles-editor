import { registerTSLMaterialFactory } from './three-particles.esm.js';
import { Fn, min, float, max, floor as floor$1, round, mod, vec2, If, texture, screenUV, smoothstep, cross, attribute, modelViewMatrix, vec4, positionLocal, length, varyingProperty, pointUV, cos, sin, Discard, normalLocal, cameraProjectionMatrix, uv, dot, vec3, uniform, normalize, cameraPosition, cameraViewMatrix, mix, abs, int, storage, atomicSub, instanceIndex, rand, sqrt, compute, numWorkgroups, atomicAdd, Loop, Continue, fract } from './three.tsl.js';
import * as THREE from './three.module.js';
import { DoubleSide, Vector3, DataTexture } from './three.module.js';
import { PointsNodeMaterial, MeshBasicNodeMaterial, StorageBufferAttribute, StorageInstancedBufferAttribute } from './three.webgpu.js';

// src/webgpu.ts
var PLANE_STRIDE = 12;
var MAX_COLLISION_PLANES = 16;
var COLLISION_PLANE_DATA_SIZE = MAX_COLLISION_PLANES * PLANE_STRIDE;
var _encodeBuf = null;
function encodeCollisionPlanesForGPU(planes) {
  if (!_encodeBuf || _encodeBuf.length !== COLLISION_PLANE_DATA_SIZE) {
    _encodeBuf = new Float32Array(COLLISION_PLANE_DATA_SIZE);
  }
  const data = _encodeBuf;
  data.fill(0);
  const count = Math.min(planes.length, MAX_COLLISION_PLANES);
  for (let i = 0; i < count; i++) {
    const cp = planes[i];
    const base = i * PLANE_STRIDE;
    data[base] = cp.isActive ? 1 : 0;
    let modeCode = 0;
    if (cp.mode === "CLAMP" /* CLAMP */) modeCode = 1;
    else if (cp.mode === "BOUNCE" /* BOUNCE */) modeCode = 2;
    data[base + 1] = modeCode;
    data[base + 2] = cp.position.x;
    data[base + 3] = cp.position.y;
    data[base + 4] = cp.position.z;
    data[base + 5] = cp.normal.x;
    data[base + 6] = cp.normal.y;
    data[base + 7] = cp.normal.z;
    data[base + 8] = cp.dampen;
    data[base + 9] = cp.lifetimeLoss;
    data[base + 10] = 0;
    data[base + 11] = 0;
  }
  return data;
}
function createCollisionPlaneTSL(sCurveData, collisionPlaneOffset, collisionPlaneCount) {
  const count = Math.min(collisionPlaneCount, MAX_COLLISION_PLANES);
  const uCollisionPlaneCount = uniform(float(count));
  const cpBase = collisionPlaneOffset;
  const applyCollisionPlanesTSL = Fn(
    ({
      pos,
      vel,
      oiaVec,
      sColorNode,
      ps,
      startLife,
      particleIdx,
      sOrbitalIsActiveNode
    }) => {
      Loop(uCollisionPlaneCount, ({ i }) => {
        const base = i.mul(PLANE_STRIDE).add(cpBase);
        const isActive = sCurveData.element(base);
        If(isActive.lessThan(0.5), () => {
          Continue();
        });
        const mode = sCurveData.element(base.add(1));
        const planePos = vec3(
          sCurveData.element(base.add(2)),
          sCurveData.element(base.add(3)),
          sCurveData.element(base.add(4))
        );
        const planeNormal = vec3(
          sCurveData.element(base.add(5)),
          sCurveData.element(base.add(6)),
          sCurveData.element(base.add(7))
        );
        const dampen = sCurveData.element(base.add(8));
        const lifetimeLoss = sCurveData.element(base.add(9));
        const toParticle = pos.sub(planePos);
        const signedDist = dot(toParticle, planeNormal);
        If(signedDist.lessThan(0), () => {
          If(mode.lessThan(0.5), () => {
            ps.x.assign(startLife.add(float(1)));
          }).ElseIf(mode.lessThan(1.5), () => {
            pos.assign(pos.sub(planeNormal.mul(signedDist)));
            const velDotN = dot(vel, planeNormal);
            If(velDotN.lessThan(0), () => {
              vel.assign(vel.sub(planeNormal.mul(velDotN)));
            });
          }).Else(() => {
            pos.assign(pos.sub(planeNormal.mul(signedDist)));
            const vDotN = dot(vel, planeNormal);
            const reflected = vel.sub(planeNormal.mul(vDotN.mul(2)));
            vel.assign(reflected.mul(dampen));
            If(lifetimeLoss.greaterThan(0), () => {
              ps.x.assign(ps.x.add(lifetimeLoss.mul(startLife).mul(1e3)));
            });
          });
        });
      });
    },
    "void"
  );
  return {
    /** Uniform for the active collision plane count. */
    countUniform: uCollisionPlaneCount,
    /** TSL function to call in the compute kernel: apply({ pos, vel, ... }) */
    apply: applyCollisionPlanesTSL
  };
}

// src/js/effects/three-particles/three-particles-bezier.ts
var cache = [];
var nCr = (n, k) => {
  let z = 1;
  for (let i = 1; i <= k; i++) z *= (n + 1 - i) / i;
  return z;
};
var createBezierCurveFunction = (particleSystemId, bezierPoints) => {
  const cacheEntry = cache.find((item) => item.bezierPoints === bezierPoints);
  if (cacheEntry) {
    if (!cacheEntry.referencedBy.includes(particleSystemId))
      cacheEntry.referencedBy.push(particleSystemId);
    return cacheEntry.curveFunction;
  }
  const entry = {
    referencedBy: [particleSystemId],
    bezierPoints,
    curveFunction: (percentage) => {
      if (percentage < 0) return bezierPoints[0].y;
      if (percentage > 1) return bezierPoints[bezierPoints.length - 1].y;
      let start = 0;
      let stop = bezierPoints.length - 1;
      for (let i = 0; i < bezierPoints.length; i++) {
        const point = bezierPoints[i];
        if (percentage < (point.percentage ?? 0)) {
          stop = i;
          break;
        }
        if (point.percentage !== void 0) start = i;
      }
      const n = stop - start;
      const calculatedPercentage = (percentage - (bezierPoints[start].percentage ?? 0)) / ((bezierPoints[stop].percentage ?? 1) - (bezierPoints[start].percentage ?? 0));
      let value = 0;
      for (let i = 0; i <= n; i++) {
        const p = bezierPoints[start + i];
        const c = nCr(n, i) * Math.pow(1 - calculatedPercentage, n - i) * Math.pow(calculatedPercentage, i);
        value += c * p.y;
      }
      return value;
    }
  };
  cache.push(entry);
  return entry.curveFunction;
};

// src/js/effects/three-particles/three-particles-utils.ts
var isLifeTimeCurve = (value) => {
  return typeof value !== "number" && "type" in value;
};
var getCurveFunctionFromConfig = (particleSystemId, lifetimeCurve) => {
  if (lifetimeCurve.type === "BEZIER" /* BEZIER */) {
    return createBezierCurveFunction(
      particleSystemId,
      lifetimeCurve.bezierPoints
    );
  }
  if (lifetimeCurve.type === "EASING" /* EASING */) {
    return lifetimeCurve.curveFunction;
  }
  throw new Error(`Unsupported value type: ${lifetimeCurve}`);
};
var calculateValue = (particleSystemId, value, time = 0) => {
  if (typeof value === "number") {
    return value;
  }
  if ("min" in value && "max" in value) {
    if (value.min === value.max) {
      return value.min ?? 0;
    }
    return THREE.MathUtils.randFloat(value.min ?? 0, value.max ?? 1);
  }
  const lifetimeCurve = value;
  return getCurveFunctionFromConfig(particleSystemId, lifetimeCurve)(time) * (lifetimeCurve.scale ?? 1);
};

// src/js/effects/three-particles/webgpu/compute-force-fields.ts
var FIELD_STRIDE = 12;
var MAX_FORCE_FIELDS = 16;
var FORCE_FIELD_DATA_SIZE = MAX_FORCE_FIELDS * FIELD_STRIDE;
var GPU_INFINITY = 1e10;
var _encodeBuf2 = null;
function encodeForceFieldsForGPU(forceFields, particleSystemId, systemLifetimePercentage) {
  if (!_encodeBuf2 || _encodeBuf2.length !== FORCE_FIELD_DATA_SIZE) {
    _encodeBuf2 = new Float32Array(FORCE_FIELD_DATA_SIZE);
  }
  const data = _encodeBuf2;
  data.fill(0);
  const count = Math.min(forceFields.length, MAX_FORCE_FIELDS);
  for (let i = 0; i < count; i++) {
    const ff = forceFields[i];
    const base = i * FIELD_STRIDE;
    data[base] = ff.isActive ? 1 : 0;
    data[base + 1] = ff.type === "POINT" /* POINT */ ? 0 : 1;
    data[base + 2] = ff.position.x;
    data[base + 3] = ff.position.y;
    data[base + 4] = ff.position.z;
    data[base + 5] = ff.direction.x;
    data[base + 6] = ff.direction.y;
    data[base + 7] = ff.direction.z;
    data[base + 8] = calculateValue(
      particleSystemId,
      ff.strength,
      systemLifetimePercentage
    );
    data[base + 9] = ff.range === Infinity ? GPU_INFINITY : ff.range;
    let falloffCode = 0;
    if (ff.falloff === "LINEAR" /* LINEAR */) falloffCode = 1;
    else if (ff.falloff === "QUADRATIC" /* QUADRATIC */) falloffCode = 2;
    data[base + 10] = falloffCode;
    data[base + 11] = 0;
  }
  return data;
}
function createForceFieldTSL(sCurveData, forceFieldOffset, forceFieldCount) {
  const count = Math.min(forceFieldCount, MAX_FORCE_FIELDS);
  const uForceFieldCount = uniform(float(count));
  const ffBase = forceFieldOffset;
  const applyForceFieldsTSL = Fn(
    ({
      pos,
      vel,
      delta
    }) => {
      Loop(uForceFieldCount, ({ i }) => {
        const base = i.mul(FIELD_STRIDE).add(ffBase);
        const isActive = sCurveData.element(base);
        If(isActive.lessThan(0.5), () => {
          Continue();
        });
        const fieldType = sCurveData.element(base.add(1));
        const fieldPos = vec3(
          sCurveData.element(base.add(2)),
          sCurveData.element(base.add(3)),
          sCurveData.element(base.add(4))
        );
        const fieldDir = vec3(
          sCurveData.element(base.add(5)),
          sCurveData.element(base.add(6)),
          sCurveData.element(base.add(7))
        );
        const strength = sCurveData.element(base.add(8));
        const range = sCurveData.element(base.add(9));
        const falloffType = sCurveData.element(base.add(10));
        If(strength.equal(0), () => {
          Continue();
        });
        If(fieldType.greaterThan(0.5), () => {
          const force = strength.mul(delta);
          vel.assign(vel.add(fieldDir.mul(force)));
        });
        If(fieldType.lessThan(0.5), () => {
          const toField = fieldPos.sub(pos);
          const dist = length(toField);
          If(dist.greaterThan(1e-4), () => {
            const inRange = dist.lessThan(range);
            If(inRange, () => {
              const dir = normalize(toField);
              const normDist = dist.div(range);
              const falloffNone = float(1);
              const falloffLinear = float(1).sub(normDist);
              const falloffQuadratic = float(1).sub(normDist.mul(normDist));
              const useLinear = falloffType.greaterThan(0.5);
              const useQuadratic = falloffType.greaterThan(1.5);
              const falloff = useQuadratic.select(
                falloffQuadratic,
                useLinear.select(falloffLinear, falloffNone)
              );
              const force = strength.mul(falloff).mul(delta);
              vel.assign(vel.add(dir.mul(force)));
            });
          });
        });
      });
    },
    "void"
  );
  return {
    /** Uniform for the active force field count. */
    countUniform: uForceFieldCount,
    /** TSL function to call in the compute kernel: apply({ pos, vel, delta }) */
    apply: applyForceFieldsTSL
  };
}

// src/js/effects/three-particles/webgpu/curve-bake.ts
var CURVE_RESOLUTION = 256;
function bakeCurveIntoBuffer(buffer, writeOffset, particleSystemId, curve) {
  const curveFn = getCurveFunctionFromConfig(particleSystemId, curve);
  const lastIndex = CURVE_RESOLUTION - 1;
  for (let i = 0; i < CURVE_RESOLUTION; i++) {
    const t = i / lastIndex;
    buffer[writeOffset + i] = curveFn(t);
  }
  return writeOffset + CURVE_RESOLUTION;
}
function bakeVelocityAxisIntoBuffer(buffer, writeOffset, particleSystemId, value) {
  if (isLifeTimeCurve(value)) {
    return bakeCurveIntoBuffer(buffer, writeOffset, particleSystemId, value);
  }
  const constantValue = calculateValue(particleSystemId, value, 0.5);
  for (let i = 0; i < CURVE_RESOLUTION; i++) {
    buffer[writeOffset + i] = constantValue;
  }
  return writeOffset + CURVE_RESOLUTION;
}
function bakeParticleSystemCurves(normalizedConfig, particleSystemId) {
  let curveCount = 0;
  const {
    sizeOverLifetime,
    opacityOverLifetime,
    colorOverLifetime,
    velocityOverLifetime
  } = normalizedConfig;
  const hasSizeOverLifetime = sizeOverLifetime.isActive;
  const hasOpacityOverLifetime = opacityOverLifetime.isActive;
  const hasColorOverLifetime = colorOverLifetime.isActive;
  const isVelActive = velocityOverLifetime.isActive;
  const hasLinearVelX = isVelActive && velocityOverLifetime.linear.x !== void 0 && velocityOverLifetime.linear.x !== 0;
  const hasLinearVelY = isVelActive && velocityOverLifetime.linear.y !== void 0 && velocityOverLifetime.linear.y !== 0;
  const hasLinearVelZ = isVelActive && velocityOverLifetime.linear.z !== void 0 && velocityOverLifetime.linear.z !== 0;
  const hasOrbitalVelX = isVelActive && velocityOverLifetime.orbital.x !== void 0 && velocityOverLifetime.orbital.x !== 0;
  const hasOrbitalVelY = isVelActive && velocityOverLifetime.orbital.y !== void 0 && velocityOverLifetime.orbital.y !== 0;
  const hasOrbitalVelZ = isVelActive && velocityOverLifetime.orbital.z !== void 0 && velocityOverLifetime.orbital.z !== 0;
  if (hasSizeOverLifetime) curveCount++;
  if (hasOpacityOverLifetime) curveCount++;
  if (hasColorOverLifetime) curveCount += 3;
  if (hasLinearVelX) curveCount++;
  if (hasLinearVelY) curveCount++;
  if (hasLinearVelZ) curveCount++;
  if (hasOrbitalVelX) curveCount++;
  if (hasOrbitalVelY) curveCount++;
  if (hasOrbitalVelZ) curveCount++;
  const data = new Float32Array(curveCount * CURVE_RESOLUTION);
  let writeOffset = 0;
  let nextIndex = 0;
  let sizeOverLifetimeIdx = -1;
  let opacityOverLifetimeIdx = -1;
  let colorRIdx = -1;
  let colorGIdx = -1;
  let colorBIdx = -1;
  let linearVelXIdx = -1;
  let linearVelYIdx = -1;
  let linearVelZIdx = -1;
  let orbitalVelXIdx = -1;
  let orbitalVelYIdx = -1;
  let orbitalVelZIdx = -1;
  if (hasSizeOverLifetime) {
    sizeOverLifetimeIdx = nextIndex++;
    writeOffset = bakeCurveIntoBuffer(
      data,
      writeOffset,
      particleSystemId,
      sizeOverLifetime.lifetimeCurve
    );
  }
  if (hasOpacityOverLifetime) {
    opacityOverLifetimeIdx = nextIndex++;
    writeOffset = bakeCurveIntoBuffer(
      data,
      writeOffset,
      particleSystemId,
      opacityOverLifetime.lifetimeCurve
    );
  }
  if (hasColorOverLifetime) {
    colorRIdx = nextIndex++;
    writeOffset = bakeCurveIntoBuffer(
      data,
      writeOffset,
      particleSystemId,
      colorOverLifetime.r
    );
    colorGIdx = nextIndex++;
    writeOffset = bakeCurveIntoBuffer(
      data,
      writeOffset,
      particleSystemId,
      colorOverLifetime.g
    );
    colorBIdx = nextIndex++;
    writeOffset = bakeCurveIntoBuffer(
      data,
      writeOffset,
      particleSystemId,
      colorOverLifetime.b
    );
  }
  if (hasLinearVelX) {
    linearVelXIdx = nextIndex++;
    writeOffset = bakeVelocityAxisIntoBuffer(
      data,
      writeOffset,
      particleSystemId,
      velocityOverLifetime.linear.x
    );
  }
  if (hasLinearVelY) {
    linearVelYIdx = nextIndex++;
    writeOffset = bakeVelocityAxisIntoBuffer(
      data,
      writeOffset,
      particleSystemId,
      velocityOverLifetime.linear.y
    );
  }
  if (hasLinearVelZ) {
    linearVelZIdx = nextIndex++;
    writeOffset = bakeVelocityAxisIntoBuffer(
      data,
      writeOffset,
      particleSystemId,
      velocityOverLifetime.linear.z
    );
  }
  if (hasOrbitalVelX) {
    orbitalVelXIdx = nextIndex++;
    writeOffset = bakeVelocityAxisIntoBuffer(
      data,
      writeOffset,
      particleSystemId,
      velocityOverLifetime.orbital.x
    );
  }
  if (hasOrbitalVelY) {
    orbitalVelYIdx = nextIndex++;
    writeOffset = bakeVelocityAxisIntoBuffer(
      data,
      writeOffset,
      particleSystemId,
      velocityOverLifetime.orbital.y
    );
  }
  if (hasOrbitalVelZ) {
    orbitalVelZIdx = nextIndex++;
    writeOffset = bakeVelocityAxisIntoBuffer(
      data,
      writeOffset,
      particleSystemId,
      velocityOverLifetime.orbital.z
    );
  }
  return {
    data,
    curveCount,
    sizeOverLifetime: sizeOverLifetimeIdx,
    opacityOverLifetime: opacityOverLifetimeIdx,
    colorR: colorRIdx,
    colorG: colorGIdx,
    colorB: colorBIdx,
    linearVelX: linearVelXIdx,
    linearVelY: linearVelYIdx,
    linearVelZ: linearVelZIdx,
    orbitalVelX: orbitalVelXIdx,
    orbitalVelY: orbitalVelYIdx,
    orbitalVelZ: orbitalVelZIdx
  };
}

// src/js/effects/three-particles/color-utils.ts
var sRGBToLinear = (c) => c < 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

// src/js/effects/three-particles/webgpu/compute-modifiers.ts
function createModifierStorageBuffers(maxParticles, instanced, curveData, hasForceFields = false, hasCollisionPlanes = false) {
  const Cls = instanced ? StorageInstancedBufferAttribute : StorageBufferAttribute;
  const curveLen = Math.max(curveData.length, 1);
  const ffSize = hasForceFields ? FORCE_FIELD_DATA_SIZE : 0;
  const cpSize = hasCollisionPlanes ? COLLISION_PLANE_DATA_SIZE : 0;
  const freeListStart = curveLen + ffSize + cpSize;
  const totalLen = freeListStart + maxParticles + 1;
  const arr = new Float32Array(totalLen);
  arr.set(curveData, 0);
  arr[freeListStart] = maxParticles;
  for (let i = 0; i < maxParticles; i++) arr[freeListStart + 1 + i] = i;
  return {
    buffers: {
      position: new Cls(new Float32Array(maxParticles * 4), 4),
      velocity: new StorageBufferAttribute(new Float32Array(maxParticles * 4), 4),
      color: new Cls(new Float32Array(maxParticles * 4), 4),
      particleState: new Cls(new Float32Array(maxParticles * 4), 4),
      startValues: new Cls(new Float32Array(maxParticles * 4), 4),
      startColorsExt: new StorageBufferAttribute(new Float32Array(maxParticles * 4), 4),
      orbitalIsActive: new StorageBufferAttribute(new Float32Array(maxParticles * 4), 4),
      curveData: new StorageBufferAttribute(arr, 1)
    },
    freeListOffset: freeListStart
  };
}
function createCurveLookup(sCurveData) {
  return Fn(({ curveIndex, t }) => {
    const clamped = min(t, float(1));
    const pos = clamped.mul(CURVE_RESOLUTION - 1);
    const idx0 = floor(pos);
    const f = fract(pos);
    const base = curveIndex.mul(CURVE_RESOLUTION);
    const v0 = sCurveData.element(base.add(idx0));
    const v1 = sCurveData.element(base.add(min(idx0.add(1), float(CURVE_RESOLUTION - 1))));
    return mix(v0, v1, f);
  });
}
function createModifierComputeUpdate(buffers, maxParticles, curveMap, flags, shapeParams, forceFieldCount = 0, collisionPlaneCount = 0, freeListStart = 0) {
  const uDelta = uniform(float(0));
  const uDeltaMs = uniform(float(0));
  const uGravityVelocity = uniform(new Vector3(0, 0, 0));
  const uSeed = uniform(float(0));
  const uEmitCount = uniform(int(0));
  const uNoiseStrength = uniform(float(0));
  const uNoisePower = uniform(float(0));
  const uNoiseFrequency = uniform(float(1));
  const uNoisePosAmount = uniform(float(0));
  const uNoiseRotAmount = uniform(float(0));
  const uNoiseSizeAmount = uniform(float(0));
  const shapeUniforms = {};
  const sh = (name, v) => {
    const u = uniform(float(v));
    shapeUniforms[name] = u;
    return u;
  };
  const uShape = sh("shapeKind", shapeParams.shapeKind);
  const uRadius = sh("radius", shapeParams.radius);
  const uLength = sh("length", shapeParams.length);
  const uArc = sh("arc", shapeParams.arc);
  const uSpreadX = sh("spreadX", shapeParams.spreadX);
  const uSpreadY = sh("spreadY", shapeParams.spreadY);
  const uSpreadZ = sh("spreadZ", shapeParams.spreadZ);
  const uSpeedMin = sh("speedMin", shapeParams.speedMin);
  const uSpeedMax = sh("speedMax", shapeParams.speedMax);
  const uSizeMin = sh("sizeMin", shapeParams.sizeMin);
  const uSizeMax = sh("sizeMax", shapeParams.sizeMax);
  const uRotMin = sh("rotMin", shapeParams.rotMin);
  const uRotMax = sh("rotMax", shapeParams.rotMax);
  const uOpMin = sh("opacityMin", shapeParams.opacityMin);
  const uOpMax = sh("opacityMax", shapeParams.opacityMax);
  const uLifeMin = sh("lifeMin", shapeParams.lifeMin);
  const uLifeMax = sh("lifeMax", shapeParams.lifeMax);
  const uCRR = sh("colorRMin", sRGBToLinear(shapeParams.colorRMin));
  const uCRX = sh("colorRMax", sRGBToLinear(shapeParams.colorRMax));
  const uCGR = sh("colorGMin", sRGBToLinear(shapeParams.colorGMin));
  const uCGX = sh("colorGMax", sRGBToLinear(shapeParams.colorGMax));
  const uCBR = sh("colorBMin", sRGBToLinear(shapeParams.colorBMin));
  const uCBX = sh("colorBMax", sRGBToLinear(shapeParams.colorBMax));
  const uFrMin = sh("startFrameMin", shapeParams.startFrameMin);
  const uFrMax = sh("startFrameMax", shapeParams.startFrameMax);
  const sPos = storage(buffers.position, "vec4", maxParticles);
  const sVel = storage(buffers.velocity, "vec4", maxParticles);
  const sCol = storage(buffers.color, "vec4", maxParticles);
  const sPS = storage(buffers.particleState, "vec4", maxParticles);
  const sSV = storage(buffers.startValues, "vec4", maxParticles);
  const sEx = storage(buffers.startColorsExt, "vec4", maxParticles);
  const sOIA = storage(buffers.orbitalIsActive, "vec4", maxParticles);
  const sCD = storage(buffers.curveData, "float", buffers.curveData.array.length);
  const curveLen = Math.max(curveMap.data.length, 1);
  const forceFieldOffset = curveLen;
  const collisionOffset = forceFieldOffset + (flags.forceFields ? FORCE_FIELD_DATA_SIZE : 0);
  const flStart = freeListStart;
  const ffNodes = flags.forceFields ? createForceFieldTSL(sCD, forceFieldOffset, forceFieldCount) : null;
  const cpNodes = flags.collisionPlanes ? createCollisionPlaneTSL(sCD, collisionOffset, collisionPlaneCount) : null;
  const lookupCurve = createCurveLookup(sCD);
  const emitKernel = Fn(() => {
    const i = instanceIndex;
    const oldTop = atomicSub(sCD.element(flStart), float(1)).toVar();
    If(oldTop.greaterThan(float(0)), () => {
      const slotIdx = sCD.element(flStart.add(oldTop)).toVar();
      const base2 = i.mul(float(8));
      const r0 = rand(uSeed.add(base2.add(float(0.13))));
      const r1 = rand(uSeed.add(base2.add(float(1.17))));
      const r2 = rand(uSeed.add(base2.add(float(2.23))));
      const r3 = rand(uSeed.add(base2.add(float(3.31))));
      const r4 = rand(uSeed.add(base2.add(float(4.37))));
      const r5 = rand(uSeed.add(base2.add(float(5.41))));
      const r6 = rand(uSeed.add(base2.add(float(6.47))));
      const r7 = rand(uSeed.add(base2.add(float(7.53))));
      const phi = r0.mul(float(6.2831853)).toVar();
      const cosT = float(1).sub(r1.mul(float(2))).toVar();
      const sinT = sqrt(float(1).sub(cosT.mul(cosT))).toVar();
      const dx = sinT.mul(cos(phi));
      const dy = cosT;
      const dz = sinT.mul(sin(phi));
      const kind = uShape;
      const coneZ = float(1).sub(r1.mul(uArc).mul(float(0.3183098)));
      const planeZ = float(1);
      const dirX = select01(kind, dx, dx, float(0));
      const dirY = select01(kind, dy, dy, float(0));
      const dirZa = select01(kind, dz, dz, planeZ);
      const coneX = dirX.mul(float(1));
      const coneY = dirY.mul(float(1));
      const coneZ2 = select01(kind, coneZ, dirZa, planeZ);
      const dvx = select01(kind, coneX, dirX, coneX);
      const dvy = select01(kind, coneY, dirY, coneY);
      const dvz = select01(kind, coneZ2, coneZ2, planeZ);
      const sdX = mix(dvx, float(0), uSpreadX);
      const sdY = mix(dvy, float(1), uSpreadY);
      const sdZ = mix(dvz, float(0), uSpreadZ);
      const radial = r2.mul(uRadius);
      const ox = sdX.mul(radial);
      const oy = sdY.mul(radial);
      const oz = sdZ.mul(radial);
      const lenOffset = r3.sub(float(0.5)).mul(uLength);
      sPos.element(slotIdx).assign(vec4(ox, oy.add(lenOffset), oz, float(0)));
      const spMag = mix(uSpeedMin, uSpeedMax, r4).toVar();
      const vxAbs = sdX.mul(spMag);
      const vyAbs = sdY.mul(spMag);
      const vzAbs = sdZ.mul(spMag);
      sVel.element(slotIdx).assign(vec4(vxAbs, vyAbs, vzAbs, float(0)));
      const clR = mix(uCRR, uCRX, r6);
      const clG = mix(uCGR, uCGX, r6);
      const clB = mix(uCBR, uCBX, r6);
      const opac = mix(uOpMin, uOpMax, r7);
      const slife = mix(uLifeMin, uLifeMax, r5).mul(float(1e3));
      const ssize = mix(uSizeMin, uSizeMax, r4);
      const srot = mix(uRotMin, uRotMax, r3);
      sCol.element(slotIdx).assign(vec4(clR, clG, clB, opac));
      const startFrame = tslFloor(mix(uFrMin, uFrMax, r1)).toVar();
      sPS.element(slotIdx).assign(vec4(float(0), ssize, srot, startFrame));
      sSV.element(slotIdx).assign(vec4(slife, ssize, opac, clR));
      const rotSpeed = mix(uRotMin, uRotMax, r3);
      sEx.element(slotIdx).assign(vec4(clG, clB, rotSpeed, r6.mul(float(100))));
      sOIA.element(slotIdx).assign(vec4(ox, oy.add(lenOffset), oz, float(1)));
    });
  });
  const emitNode = compute(emitKernel(), numWorkgroups(uEmitCount));
  const simKernel = Fn(() => {
    const i = instanceIndex;
    If(float(i).lessThan(float(maxParticles)), () => {
      const oiaVec = sOIA.element(i).toVar();
      If(oiaVec.w.greaterThanEqual(float(0.5)), () => {
        const pos = sPos.element(i).xyz.toVar();
        const vel = sVel.element(i).xyz.toVar();
        const ps = sPS.element(i).toVar();
        const sv = sSV.element(i);
        const ex = sEx.element(i);
        const startLife = sv.x;
        const life = ps.x;
        const lifePct = min(life.div(startLife), float(1));
        vel.assign(vel.sub(vec3(uGravityVelocity).mul(uDelta)));
        if (ffNodes) ffNodes.apply({ pos, vel, delta: uDelta });
        pos.assign(pos.add(vel.mul(uDelta)));
        if (cpNodes) cpNodes.apply({
          pos,
          vel,
          oiaVec,
          sColorNode: sCol,
          ps,
          startLife,
          particleIdx: i,
          sOrbitalIsActiveNode: sOIA
        });
        if (flags.linearVelocity) {
          const lvx = curveMap.linearVelX >= 0 ? lookupCurve({ curveIndex: float(curveMap.linearVelX), t: lifePct }) : float(0);
          const lvy = curveMap.linearVelY >= 0 ? lookupCurve({ curveIndex: float(curveMap.linearVelY), t: lifePct }) : float(0);
          const lvz = curveMap.linearVelZ >= 0 ? lookupCurve({ curveIndex: float(curveMap.linearVelZ), t: lifePct }) : float(0);
          pos.assign(pos.add(vec3(lvx, lvy, lvz).mul(uDelta)));
        }
        if (flags.orbitalVelocity && (curveMap.orbitalVelX >= 0 || curveMap.orbitalVelY >= 0 || curveMap.orbitalVelZ >= 0)) {
          const offset = vec3(oiaVec.x, oiaVec.y, oiaVec.z).toVar();
          pos.assign(pos.sub(offset));
          const ovx = curveMap.orbitalVelX >= 0 ? lookupCurve({ curveIndex: float(curveMap.orbitalVelX), t: lifePct }) : float(0);
          const ovy = curveMap.orbitalVelY >= 0 ? lookupCurve({ curveIndex: float(curveMap.orbitalVelY), t: lifePct }) : float(0);
          const ovz = curveMap.orbitalVelZ >= 0 ? lookupCurve({ curveIndex: float(curveMap.orbitalVelZ), t: lifePct }) : float(0);
          const angX = ovx.mul(uDelta);
          const angY = ovz.mul(uDelta);
          const angZ = ovy.mul(uDelta);
          const c1 = cos(angX), s1 = sin(angX);
          const c2 = cos(angY), s2 = sin(angY);
          const c3 = cos(angZ), s3 = sin(angZ);
          const ny = offset.y.mul(c1).sub(offset.z.mul(s1));
          const nz = offset.y.mul(s1).add(offset.z.mul(c1));
          const nx1 = offset.x.mul(c2).add(nz.mul(s2));
          const nz1 = offset.x.mul(s2).negate().add(nz.mul(c2));
          const fx = nx1.mul(c3).sub(ny.mul(s3));
          const fy = nx1.mul(s3).add(ny.mul(c3));
          const fz = nz1;
          pos.assign(pos.add(vec3(fx, fy, fz)));
          oiaVec.assign(vec4(fx, fy, fz, oiaVec.w));
        }
        if (flags.sizeOverLifetime) {
          const s = lookupCurve({ curveIndex: float(curveMap.sizeOverLifetime), t: lifePct });
          ps.y.assign(s.mul(sv.y));
        }
        if (flags.opacityOverLifetime) {
          const op = lookupCurve({ curveIndex: float(curveMap.opacityOverLifetime), t: lifePct });
          const col = sCol.element(i).toVar();
          col.w.assign(op.mul(sv.z));
          sCol.element(i).assign(col);
        }
        if (flags.colorOverLifetime) {
          const col = sCol.element(i).toVar();
          const cr = lookupCurve({ curveIndex: float(curveMap.colorOverLifetimeR), t: lifePct }).mix(col.x, lifePct);
          const cg = lookupCurve({ curveIndex: float(curveMap.colorOverLifetimeG), t: lifePct }).mix(col.y, lifePct);
          const cb = lookupCurve({ curveIndex: float(curveMap.colorOverLifetimeB), t: lifePct }).mix(col.z, lifePct);
          col.assign(vec4(cr, cg, cb, col.w));
          sCol.element(i).assign(col);
        }
        if (flags.rotationOverLifetime) {
          ps.z.assign(ps.z.add(ex.z.mul(uDelta)));
        }
        if (flags.noise) {
          const freq = uNoiseFrequency;
          const p3 = pos.mul(freq);
          const seed = ex.w;
          const nx = fbm3(p3.x, p3.y, p3.z, seed);
          const ny = fbm3(p3.y + float(31.41), p3.z - float(17.53), p3.x + float(23.07), seed);
          const nz = fbm3(p3.z - float(51.07), p3.x + float(13.11), p3.y + float(41.79), seed);
          const noiseVec = vec3(nx, ny, nz).mul(uNoisePower);
          If(uNoisePosAmount.greaterThan(float(1e-3)), () => {
            pos.assign(pos.add(noiseVec.mul(uNoisePosAmount)));
          });
          If(uNoiseRotAmount.greaterThan(float(1e-3)), () => {
            ps.z.assign(ps.z.add(nx.mul(uNoisePower).mul(uNoiseRotAmount)));
          });
          If(uNoiseSizeAmount.greaterThan(float(1e-3)), () => {
            ps.y.assign(ps.y.add(nx.mul(uNoisePower).mul(uNoiseSizeAmount)));
          });
        }
        ps.x.assign(ps.x.add(uDeltaMs));
        sPos.element(i).assign(vec4(pos, float(0)));
        sVel.element(i).assign(vec4(vel, float(0)));
        sPS.element(i).assign(ps);
        sOIA.element(i).assign(oiaVec);
        If(ps.x.greaterThan(startLife), () => {
          const inactive = sOIA.element(i).toVar();
          sOIA.element(i).assign(vec4(inactive.x, inactive.y, inactive.z, float(0)));
          sCol.element(i).assign(vec4(float(0), float(0), float(0), float(0)));
          const top = atomicAdd(sCD.element(flStart), float(1)).toVar();
          sCD.element(flStart.add(top).add(float(1))).assign(float(i));
        });
      });
    });
  });
  const simNode = compute(simKernel(), maxParticles);
  return {
    emitNode,
    simNode,
    computeNodes: [emitNode, simNode],
    uniforms: {
      delta: uDelta,
      deltaMs: uDeltaMs,
      gravityVelocity: uGravityVelocity,
      noiseStrength: uNoiseStrength,
      noisePower: uNoisePower,
      noiseFrequency: uNoiseFrequency,
      noisePositionAmount: uNoisePosAmount,
      noiseRotationAmount: uNoiseRotAmount,
      noiseSizeAmount: uNoiseSizeAmount,
      emitCount: uEmitCount,
      seed: uSeed
    },
    shapeUniforms,
    buffers,
    freeListOffset: flStart,
    forceFieldInfo: ffNodes ? { offset: forceFieldOffset, countUniform: ffNodes.countUniform } : null,
    collisionPlaneInfo: cpNodes ? { offset: collisionOffset, countUniform: cpNodes.countUniform } : null
  };
}
function select01(kind, cone, sphere, planeVal) {
  const isCone = tslFloor(kind).equals(float(0));
  const isSph = tslFloor(kind).equals(float(1));
  const tmp = mix(cone, sphere, 0);
  isCone.toVar();
  const r = mix(planeVal, tmp, abs(isCone.sub(float(1))).min(abs(isSph.sub(float(1)))));
  return r;
}
function simplex3(xa, ya, za) {
  const x = float(xa).toVar();
  const y = float(ya).toVar();
  const z = float(za).toVar();
  const F = float(1).div(float(3));
  const G = float(1).div(float(6));
  const s = x.add(y).add(z).mul(F);
  const i = floor(x.add(s));
  const j = floor(y.add(s));
  const k = floor(z.add(s));
  const t = i.add(j).add(k).mul(G);
  const X0 = i.sub(t);
  const Y0 = j.sub(t);
  const Z0 = k.sub(t);
  const x0 = x.sub(X0);
  const y0 = y.sub(Y0);
  const z0 = z.sub(Z0);
  const sel1a = x0.greaterThan(y0).toVar();
  const sel1b = y0.greaterThan(z0).toVar();
  let i1;
  let j1;
  let k1;
  i1 = sel1a.greaterThan(float(0.5)).mul(float(1)).add(sel1a.lessThan(float(0.5)).sel(float(0), float(0)));
  i1 = If(i1.greaterThan(float(0.5)), () => i1).sel(i1, float(0));
  j1 = sel1b.greaterThan(float(0.5)).sel(float(1), float(0));
  k1 = float(1).sub(i1).sub(j1);
  const x1 = x0.sub(i1).add(float(1).div(float(3)));
  const y1 = y0.sub(j1).add(float(1).div(float(3)));
  const z1 = z0.sub(k1).add(float(1).div(float(3)));
  const x2 = x0.sub(float(2).div(float(3))).add(i1.mul(float(2).div(float(3))));
  const y2 = y0.sub(float(2).div(float(3))).add(j1.mul(float(2).div(float(3))));
  const z2 = z0.sub(float(2).div(float(3))).add(k1.mul(float(2).div(float(3))));
  const x3 = x0.sub(float(1)).add(float(1));
  const y3 = y0.sub(float(1)).add(float(1));
  const z3 = z0.sub(float(1)).add(float(1));
  const n = (px, py, pz) => px.mul(px).add(py.mul(py)).add(pz.mul(pz));
  const nn0 = max(float(0.6).sub(n(x0, y0, z0)), float(0));
  const nn1 = max(float(0.6).sub(n(x1, y1, z1)), float(0));
  const nn2 = max(float(0.6).sub(n(x2, y2, z2)), float(0));
  const nn3 = max(float(0.6).sub(n(x3, y3, z3)), float(0));
  const g = (xx, yy, zz, gx, gy, gz) => xx.mul(gx).add(yy.mul(gy)).add(zz.mul(gz)).mul(max(nn0, nn1).mul(max(nn2, nn3)));
  const v = g(x0, y0, z0, 1, 0, 0).add(g(x1, y1, z1, -1, 1, 0)).add(g(x2, y2, z2, 0, -1, 1)).add(g(x3, y3, z3, 0, -1, 1));
  return v.mul(float(2));
}
function fbm3(x0, y0, z0, offset) {
  const nx = x0.add(offset);
  const ny = y0.add(offset);
  const nz = z0.add(offset);
  const freq = float(0).toVar();
  const amp = float(0).toVar();
  const v = float(0).toVar();
  float(2);
  const ampDec = float(0.5);
  const f1 = float(1);
  freq.add(f1);
  amp.add(ampDec);
  const n1 = simplex3(nx.mul(f1), ny.mul(f1), nz.mul(f1));
  v.assign(v.add(n1.mul(ampDec)));
  return v;
}
function floor(v) {
  return tslFloor(v);
}

// src/js/effects/three-particles/three-particles-constants.ts
var POINT_SIZE_SCALE = 100;
var ALPHA_DISCARD_THRESHOLD = 1e-3;
var _dummyTexture = null;
function getDummyTexture() {
  if (!_dummyTexture) {
    _dummyTexture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    _dummyTexture.needsUpdate = true;
  }
  return _dummyTexture;
}
function createParticleUniforms(sharedUniforms) {
  const dummy = getDummyTexture();
  const map = sharedUniforms.map.value ?? dummy;
  return {
    uMap: map,
    uElapsed: uniform(float(sharedUniforms.elapsed.value)),
    uFps: uniform(float(sharedUniforms.fps.value)),
    uUseFPSForFrameIndex: uniform(
      float(sharedUniforms.useFPSForFrameIndex.value ? 1 : 0)
    ),
    uTiles: uniform(sharedUniforms.tiles.value),
    uDiscardBg: uniform(
      float(sharedUniforms.discardBackgroundColor.value ? 1 : 0)
    ),
    uBgColor: uniform(
      new Vector3(
        sharedUniforms.backgroundColor.value.r,
        sharedUniforms.backgroundColor.value.g,
        sharedUniforms.backgroundColor.value.b
      )
    ),
    uBgTolerance: uniform(float(sharedUniforms.backgroundColorTolerance.value)),
    uSoftEnabled: uniform(
      float(sharedUniforms.softParticlesEnabled.value ? 1 : 0)
    ),
    uSoftIntensity: uniform(float(sharedUniforms.softParticlesIntensity.value)),
    uSceneDepthTex: sharedUniforms.sceneDepthTexture.value ?? dummy,
    uCameraNearFar: uniform(sharedUniforms.cameraNearFar.value)
  };
}
var computeFrameIndex = Fn(
  ({
    vLifetime,
    vStartLifetime,
    vStartFrame,
    uFps,
    uUseFPSForFrameIndex,
    uTiles
  }) => {
    const totalFrames = uTiles.x.mul(uTiles.y);
    const lifePercent = min(vLifetime.div(vStartLifetime), float(1));
    const fpsBased = max(vLifetime.div(1e3).mul(uFps), float(0));
    const lifetimeBased = max(
      min(floor$1(lifePercent.mul(totalFrames)), totalFrames.sub(1)),
      float(0)
    );
    const fpsResult = uFps.equal(0).select(float(0), fpsBased);
    const frameOffset = uUseFPSForFrameIndex.greaterThan(0.5).select(fpsResult, lifetimeBased);
    return round(vStartFrame).add(frameOffset);
  }
);
var computeSpriteSheetUV = Fn(
  ({ baseUV, frameIndex, uTiles }) => {
    const spriteX = floor$1(mod(frameIndex, uTiles.x));
    const spriteY = floor$1(mod(frameIndex.div(uTiles.x), uTiles.y));
    return vec2(
      baseUV.x.div(uTiles.x).add(spriteX.div(uTiles.x)),
      baseUV.y.div(uTiles.y).add(spriteY.div(uTiles.y))
    );
  }
);
var linearizeDepth = Fn(
  ({ depthSample, near, far }) => {
    const zNdc = depthSample.mul(2).sub(1);
    return near.mul(2).mul(far).div(far.add(near).sub(zNdc.mul(far.sub(near))));
  }
);
var computeSoftParticleFade = Fn(
  ({
    viewZ,
    uSoftEnabled,
    uSoftIntensity,
    uSceneDepthTex,
    uCameraNearFar
  }) => {
    const softFade = float(1).toVar();
    If(uSoftEnabled.greaterThan(0.5), () => {
      const depthSample = texture(uSceneDepthTex, screenUV).x;
      const sceneDepthLinear = linearizeDepth({
        depthSample,
        near: uCameraNearFar.x,
        far: uCameraNearFar.y
      });
      const depthDiff = sceneDepthLinear.sub(viewZ);
      softFade.assign(smoothstep(float(0), uSoftIntensity, depthDiff));
    });
    return softFade;
  }
);
function applyBackgroundDiscard({
  texColor,
  uDiscardBg,
  uBgColor,
  uBgTolerance
}) {
  const diff = vec3(
    texColor.x.sub(uBgColor.x),
    texColor.y.sub(uBgColor.y),
    texColor.z.sub(uBgColor.z)
  );
  Discard(
    uDiscardBg.greaterThan(0.5).and(abs(length(diff)).lessThan(uBgTolerance))
  );
}

// src/js/effects/three-particles/webgpu/tsl-instanced-billboard-material.ts
function createInstancedBillboardTSLMaterial(sharedUniforms, rendererConfig, gpuCompute = false) {
  const u = createParticleUniforms(sharedUniforms);
  const uViewportHeight = uniform(
    typeof sharedUniforms.viewportHeight?.value === "number" ? sharedUniforms.viewportHeight.value : 1
  );
  sharedUniforms.viewportHeight = uViewportHeight;
  const aInstanceOffset = attribute("instanceOffset");
  const aColor = attribute("instanceColor");
  const aParticleState = gpuCompute ? attribute("instanceParticleState") : null;
  const aStartValues = gpuCompute ? attribute("instanceStartValues") : null;
  const aSize = gpuCompute ? null : attribute("instanceSize");
  const aLifetime = gpuCompute ? null : attribute("instanceLifetime");
  const aStartLifetime = gpuCompute ? null : attribute("instanceStartLifetime");
  const aRotation = gpuCompute ? null : attribute("instanceRotation");
  const aStartFrame = gpuCompute ? null : attribute("instanceStartFrame");
  const vColor = varyingProperty("vec4", "vColor");
  const vLifetime = varyingProperty("float", "vLifetime");
  const vStartLifetime = varyingProperty("float", "vStartLifetime");
  const vRotation = varyingProperty("float", "vRotation");
  const vStartFrame = varyingProperty("float", "vStartFrame");
  const vUv = varyingProperty("vec2", "vUv");
  const vViewZ = varyingProperty("float", "vViewZ");
  const vertexNode = Fn(() => {
    const clipPos = vec4(0, 0, 0, -1).toVar();
    If(aColor.w.greaterThan(0), () => {
      vColor.assign(aColor.toVar());
      if (gpuCompute) {
        vLifetime.assign(aParticleState.x);
        vStartLifetime.assign(aStartValues.x);
        vRotation.assign(aParticleState.z);
        vStartFrame.assign(aParticleState.w);
      } else {
        vLifetime.assign(aLifetime);
        vStartLifetime.assign(aStartLifetime);
        vRotation.assign(aRotation);
        vStartFrame.assign(aStartFrame);
      }
      vUv.assign(
        vec2(positionLocal.x.add(0.5), float(0.5).sub(positionLocal.y))
      );
      const mvPosition = modelViewMatrix.mul(vec4(aInstanceOffset.xyz, 1)).toVar();
      const dist = length(mvPosition.xyz);
      const sizeVal = gpuCompute ? aParticleState.y : aSize;
      const pointSizePx = sizeVal.mul(POINT_SIZE_SCALE).div(dist);
      const projY = cameraProjectionMatrix.element(1).element(1);
      const perspectiveSize = pointSizePx.mul(mvPosition.z.negate()).div(projY.mul(uViewportHeight).mul(0.5));
      mvPosition.x.addAssign(positionLocal.x.mul(perspectiveSize));
      mvPosition.y.addAssign(positionLocal.y.mul(perspectiveSize));
      vViewZ.assign(mvPosition.z.negate());
      clipPos.assign(cameraProjectionMatrix.mul(mvPosition));
    });
    return clipPos;
  })();
  const fragmentColor = Fn(() => {
    const outColor = vColor.toVar();
    const center = vec2(0.5, 0.5);
    const centered = vUv.sub(center);
    const cosR = cos(vRotation);
    const sinR = sin(vRotation);
    const rotated = vec2(
      centered.x.mul(cosR).add(centered.y.mul(sinR)),
      centered.x.mul(sinR).negate().add(centered.y.mul(cosR))
    );
    const rotatedUV = rotated.add(center);
    const dist = length(rotatedUV.sub(center));
    If(dist.greaterThan(0.5), () => {
      Discard();
    });
    const frameIndex = computeFrameIndex({
      vLifetime,
      vStartLifetime,
      vStartFrame,
      uFps: u.uFps,
      uUseFPSForFrameIndex: u.uUseFPSForFrameIndex,
      uTiles: u.uTiles
    });
    const uvPoint = computeSpriteSheetUV({
      baseUV: rotatedUV,
      frameIndex,
      uTiles: u.uTiles
    });
    const texColor = texture(u.uMap, uvPoint);
    outColor.assign(outColor.mul(texColor));
    applyBackgroundDiscard({
      texColor,
      uDiscardBg: u.uDiscardBg,
      uBgColor: u.uBgColor,
      uBgTolerance: u.uBgTolerance
    });
    const softFade = computeSoftParticleFade({
      viewZ: vViewZ,
      uSoftEnabled: u.uSoftEnabled,
      uSoftIntensity: u.uSoftIntensity,
      uSceneDepthTex: u.uSceneDepthTex,
      uCameraNearFar: u.uCameraNearFar
    });
    outColor.assign(vec4(outColor.xyz, outColor.w.mul(softFade)));
    Discard(outColor.w.lessThan(ALPHA_DISCARD_THRESHOLD));
    return outColor;
  })();
  const material = new MeshBasicNodeMaterial();
  material.transparent = rendererConfig.transparent;
  material.blending = rendererConfig.blending;
  material.depthTest = rendererConfig.depthTest;
  material.depthWrite = rendererConfig.depthWrite;
  material.toneMapped = false;
  material.fog = false;
  material.vertexNode = vertexNode;
  material.colorNode = fragmentColor;
  return material;
}
var applyQuaternion = Fn(
  ({ v, q }) => {
    const t = cross(q.xyz, v).mul(2);
    return v.add(t.mul(q.w)).add(cross(q.xyz, t));
  }
);
function createMeshParticleTSLMaterial(sharedUniforms, rendererConfig, gpuCompute = false) {
  const u = createParticleUniforms(sharedUniforms);
  const aInstanceOffset = attribute("instanceOffset");
  const aColor = attribute("instanceColor");
  const aParticleState = gpuCompute ? attribute("instanceParticleState") : null;
  const aStartValues = gpuCompute ? attribute("instanceStartValues") : null;
  const aInstanceQuat = gpuCompute ? null : attribute("instanceQuat");
  const aSize = gpuCompute ? null : attribute("instanceSize");
  const aLifetime = gpuCompute ? null : attribute("instanceLifetime");
  const aStartLifetime = gpuCompute ? null : attribute("instanceStartLifetime");
  const aRotation = gpuCompute ? null : attribute("instanceRotation");
  const aStartFrame = gpuCompute ? null : attribute("instanceStartFrame");
  const vColor = varyingProperty("vec4", "vColor");
  const vLifetime = varyingProperty("float", "vLifetime");
  const vStartLifetime = varyingProperty("float", "vStartLifetime");
  const vStartFrame = varyingProperty("float", "vStartFrame");
  const vRotation = varyingProperty("float", "vRotation");
  const vNormal = varyingProperty("vec3", "vNormal");
  const vViewZ = varyingProperty("float", "vViewZ");
  const vertexSetup = Fn(() => {
    const clipPos = vec4(0, 0, 0, -1).toVar();
    If(aColor.w.greaterThan(0), () => {
      vColor.assign(aColor.toVar());
      if (gpuCompute) {
        vLifetime.assign(aParticleState.x);
        vStartLifetime.assign(aStartValues.x);
        vStartFrame.assign(aParticleState.w);
        vRotation.assign(aParticleState.z);
      } else {
        vLifetime.assign(aLifetime);
        vStartLifetime.assign(aStartLifetime);
        vStartFrame.assign(aStartFrame);
        vRotation.assign(aRotation);
      }
      let quat;
      if (gpuCompute) {
        const halfZ = aParticleState.z.mul(0.5);
        quat = vec4(0, 0, sin(halfZ), cos(halfZ));
      } else {
        quat = aInstanceQuat;
      }
      const rotatedPos = applyQuaternion({
        v: positionLocal,
        q: quat
      });
      const scaledPos = rotatedPos.mul(gpuCompute ? aParticleState.y : aSize);
      const worldPos = scaledPos.add(aInstanceOffset.xyz);
      const mvPos = modelViewMatrix.mul(vec4(worldPos, 1));
      vViewZ.assign(mvPos.z.negate());
      const rotatedNormal = applyQuaternion({
        v: normalLocal,
        q: quat
      });
      const mvNormal = modelViewMatrix.mul(vec4(rotatedNormal, 0)).xyz;
      vNormal.assign(mvNormal.normalize());
      clipPos.assign(cameraProjectionMatrix.mul(mvPos));
    });
    return clipPos;
  })();
  const fragmentColor = Fn(() => {
    const outColor = vColor.toVar();
    const uvPoint = vec2(uv()).toVar();
    If(u.uTiles.x.greaterThan(1).or(u.uTiles.y.greaterThan(1)), () => {
      const frameIndex = computeFrameIndex({
        vLifetime,
        vStartLifetime,
        vStartFrame,
        uFps: u.uFps,
        uUseFPSForFrameIndex: u.uUseFPSForFrameIndex,
        uTiles: u.uTiles
      });
      uvPoint.assign(
        computeSpriteSheetUV({
          baseUV: uv(),
          frameIndex,
          uTiles: u.uTiles
        })
      );
    });
    const texColor = texture(u.uMap, uvPoint);
    outColor.assign(outColor.mul(texColor));
    applyBackgroundDiscard({
      texColor,
      uDiscardBg: u.uDiscardBg,
      uBgColor: u.uBgColor,
      uBgTolerance: u.uBgTolerance
    });
    const lightIntensity = float(0.5).add(
      float(0.5).mul(max(dot(vNormal, vec3(0, 0, 1)), float(0)))
    );
    outColor.assign(vec4(outColor.xyz.mul(lightIntensity), outColor.w));
    const softFade = computeSoftParticleFade({
      viewZ: vViewZ,
      uSoftEnabled: u.uSoftEnabled,
      uSoftIntensity: u.uSoftIntensity,
      uSceneDepthTex: u.uSceneDepthTex,
      uCameraNearFar: u.uCameraNearFar
    });
    outColor.assign(vec4(outColor.xyz, outColor.w.mul(softFade)));
    Discard(outColor.w.lessThan(ALPHA_DISCARD_THRESHOLD));
    return outColor;
  })();
  const material = new MeshBasicNodeMaterial();
  material.transparent = rendererConfig.transparent;
  material.blending = rendererConfig.blending;
  material.depthTest = rendererConfig.depthTest;
  material.depthWrite = rendererConfig.depthWrite;
  material.toneMapped = false;
  material.fog = false;
  material.vertexNode = vertexSetup;
  material.colorNode = fragmentColor;
  return material;
}
function createPointSpriteTSLMaterial(sharedUniforms, rendererConfig, gpuCompute = false) {
  const u = createParticleUniforms(sharedUniforms);
  const aColor = attribute("color");
  const aParticleState = gpuCompute ? attribute("particleState") : null;
  const aStartValues = gpuCompute ? attribute("startValues") : null;
  const aSize = gpuCompute ? null : attribute("size");
  const aLifetime = gpuCompute ? null : attribute("lifetime");
  const aStartLifetime = gpuCompute ? null : attribute("startLifetime");
  const aRotation = gpuCompute ? null : attribute("rotation");
  const aStartFrame = gpuCompute ? null : attribute("startFrame");
  const mvPos = modelViewMatrix.mul(vec4(positionLocal, 1));
  const sizeVal = gpuCompute ? aParticleState.y : aSize;
  const sizeNode = aColor.w.greaterThan(0).select(sizeVal.mul(POINT_SIZE_SCALE).div(length(mvPos.xyz)), float(0));
  const vColor = varyingProperty("vec4", "vColor");
  const vLifetime = varyingProperty("float", "vLifetime");
  const vStartLifetime = varyingProperty("float", "vStartLifetime");
  const vRotation = varyingProperty("float", "vRotation");
  const vStartFrame = varyingProperty("float", "vStartFrame");
  const vViewZ = varyingProperty("float", "vViewZ");
  const vertexSetup = Fn(() => {
    If(aColor.w.greaterThan(0), () => {
      vColor.assign(aColor.toVar());
      if (gpuCompute) {
        vLifetime.assign(aParticleState.x);
        vStartLifetime.assign(aStartValues.x);
        vRotation.assign(aParticleState.z);
        vStartFrame.assign(aParticleState.w);
      } else {
        vLifetime.assign(aLifetime);
        vStartLifetime.assign(aStartLifetime);
        vRotation.assign(aRotation);
        vStartFrame.assign(aStartFrame);
      }
      vViewZ.assign(mvPos.z.negate());
    });
    return positionLocal;
  })();
  const fragmentColor = Fn(() => {
    const outColor = vColor.toVar();
    const frameIndex = computeFrameIndex({
      vLifetime,
      vStartLifetime,
      vStartFrame,
      uFps: u.uFps,
      uUseFPSForFrameIndex: u.uUseFPSForFrameIndex,
      uTiles: u.uTiles
    });
    const center = vec2(0.5, 0.5);
    const centered = pointUV.sub(center);
    const cosR = cos(vRotation);
    const sinR = sin(vRotation);
    const rotated = vec2(
      centered.x.mul(cosR).add(centered.y.mul(sinR)),
      centered.x.mul(sinR).negate().add(centered.y.mul(cosR))
    );
    const rotatedUV = rotated.add(center);
    const dist = length(rotatedUV.sub(center));
    Discard(dist.greaterThan(0.5));
    const uvPoint = computeSpriteSheetUV({
      baseUV: rotatedUV,
      frameIndex,
      uTiles: u.uTiles
    });
    const texColor = texture(u.uMap, uvPoint);
    outColor.assign(outColor.mul(texColor));
    applyBackgroundDiscard({
      texColor,
      uDiscardBg: u.uDiscardBg,
      uBgColor: u.uBgColor,
      uBgTolerance: u.uBgTolerance
    });
    const softFade = computeSoftParticleFade({
      viewZ: vViewZ,
      uSoftEnabled: u.uSoftEnabled,
      uSoftIntensity: u.uSoftIntensity,
      uSceneDepthTex: u.uSceneDepthTex,
      uCameraNearFar: u.uCameraNearFar
    });
    outColor.assign(vec4(outColor.xyz, outColor.w.mul(softFade)));
    Discard(outColor.w.lessThan(ALPHA_DISCARD_THRESHOLD));
    return outColor;
  })();
  const material = new PointsNodeMaterial();
  material.transparent = rendererConfig.transparent;
  material.blending = rendererConfig.blending;
  material.depthTest = rendererConfig.depthTest;
  material.depthWrite = rendererConfig.depthWrite;
  material.toneMapped = false;
  material.fog = false;
  material.sizeNode = sizeNode;
  material.positionNode = vertexSetup;
  material.colorNode = fragmentColor;
  return material;
}
function createTrailUniforms(trailUniforms) {
  const dummy = getDummyTexture();
  const map = trailUniforms.map.value ?? dummy;
  return {
    uMap: map,
    uUseMap: uniform(float(trailUniforms.useMap.value ? 1 : 0)),
    uDiscardBg: uniform(
      float(trailUniforms.discardBackgroundColor.value ? 1 : 0)
    ),
    uBgColor: uniform(
      new trailUniforms.cameraNearFar.value.constructor(
        trailUniforms.backgroundColor.value.r,
        trailUniforms.backgroundColor.value.g,
        trailUniforms.backgroundColor.value.b
      )
    ),
    uBgTolerance: uniform(float(trailUniforms.backgroundColorTolerance.value)),
    uSoftEnabled: uniform(
      float(trailUniforms.softParticlesEnabled.value ? 1 : 0)
    ),
    uSoftIntensity: uniform(float(trailUniforms.softParticlesIntensity.value)),
    uSceneDepthTex: trailUniforms.sceneDepthTexture.value ?? dummy,
    uCameraNearFar: uniform(trailUniforms.cameraNearFar.value)
  };
}
function createTrailRibbonTSLMaterial(trailUniforms, rendererConfig) {
  const u = createTrailUniforms(trailUniforms);
  const aTrailAlpha = attribute("trailAlpha");
  const aTrailColor = attribute("trailColor", "vec4");
  const aTrailOffset = attribute("trailOffset");
  const aTrailHalfWidth = attribute("trailHalfWidth");
  const aTrailNext = attribute("trailNext", "vec3");
  const aTrailUV = attribute("trailUV", "vec2");
  const vAlpha = varyingProperty("float", "vAlpha");
  const vColor = varyingProperty("vec4", "vColor");
  const vUv = varyingProperty("vec2", "vUv");
  const vViewZ = varyingProperty("float", "vViewZ");
  const positionNode = Fn(() => {
    vAlpha.assign(aTrailAlpha);
    vColor.assign(aTrailColor);
    vUv.assign(aTrailUV);
    const current = vec3(positionLocal);
    const next = vec3(aTrailNext);
    const rawTangent = next.sub(current);
    const tangentLen = length(rawTangent);
    const tangent = normalize(
      tangentLen.lessThan(1e-4).select(vec3(0, 1, 0), rawTangent)
    );
    modelViewMatrix.mul(vec4(current, 1));
    const viewDir = normalize(cameraPosition.sub(current));
    const rawPerp = cross(tangent, viewDir);
    const perpLen = length(rawPerp);
    const camRight = vec3(
      cameraViewMatrix.element(0).element(0),
      cameraViewMatrix.element(1).element(0),
      cameraViewMatrix.element(2).element(0)
    );
    const camRightDotTangent = dot(camRight, tangent);
    const fallbackPerp = normalize(
      camRight.sub(tangent.mul(camRightDotTangent))
    );
    const perp = normalize(
      perpLen.lessThan(1e-4).select(
        fallbackPerp,
        normalize(
          mix(
            fallbackPerp,
            normalize(rawPerp),
            smoothstep(float(0), float(0.7), perpLen)
          )
        )
      )
    );
    const offsetPos = current.add(perp.mul(aTrailOffset).mul(aTrailHalfWidth));
    const mvOffset = modelViewMatrix.mul(vec4(offsetPos, 1));
    vViewZ.assign(mvOffset.z.negate());
    return offsetPos;
  })();
  const colorNode = Fn(() => {
    const outColor = vColor.toVar();
    const edgeDist = float(1).sub(abs(vUv.x.mul(2).sub(1)));
    const edgeFade = smoothstep(float(0), float(0.4), edgeDist);
    If(u.uUseMap.greaterThan(0.5), () => {
      const texColor = texture(u.uMap, vUv);
      const texBrightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
      outColor.rgb.assign(
        outColor.rgb.mul(float(0.5).add(texBrightness.mul(0.5)))
      );
      outColor.a.assign(outColor.a.mul(texColor.a));
    });
    outColor.a.assign(outColor.a.mul(vAlpha).mul(edgeFade));
    Discard(outColor.a.lessThan(ALPHA_DISCARD_THRESHOLD));
    If(u.uSoftEnabled.greaterThan(0.5), () => {
      const depthSample = texture(u.uSceneDepthTex, screenUV).x;
      const sceneDepthLinear = linearizeDepth({
        depthSample,
        near: u.uCameraNearFar.x,
        far: u.uCameraNearFar.y
      });
      const depthDiff = sceneDepthLinear.sub(vViewZ);
      const softFade = smoothstep(float(0), u.uSoftIntensity, depthDiff);
      outColor.a.assign(outColor.a.mul(softFade));
    });
    Discard(outColor.a.lessThan(ALPHA_DISCARD_THRESHOLD));
    const diff = vec3(
      outColor.r.sub(u.uBgColor.x),
      outColor.g.sub(u.uBgColor.y),
      outColor.b.sub(u.uBgColor.z)
    );
    Discard(
      u.uDiscardBg.greaterThan(0.5).and(abs(length(diff)).lessThan(u.uBgTolerance))
    );
    return outColor;
  })();
  const material = new MeshBasicNodeMaterial();
  material.transparent = rendererConfig.transparent;
  material.blending = rendererConfig.blending;
  material.depthTest = rendererConfig.depthTest;
  material.depthWrite = rendererConfig.depthWrite;
  material.toneMapped = false;
  material.fog = false;
  material.side = DoubleSide;
  material.positionNode = positionNode;
  material.colorNode = colorNode;
  return material;
}

// src/js/effects/three-particles/webgpu/tsl-materials.ts
function createTSLParticleMaterial(rendererType, sharedUniforms, rendererConfig, gpuCompute = false) {
  switch (rendererType) {
    case "INSTANCED" /* INSTANCED */:
      return createInstancedBillboardTSLMaterial(sharedUniforms, rendererConfig, gpuCompute);
    case "MESH" /* MESH */:
      return createMeshParticleTSLMaterial(sharedUniforms, rendererConfig, gpuCompute);
    case "POINTS" /* POINTS */:
    default:
      return createPointSpriteTSLMaterial(sharedUniforms, rendererConfig, gpuCompute);
  }
}
function createTSLTrailMaterial(trailUniforms, rendererConfig) {
  return createTrailRibbonTSLMaterial(trailUniforms, rendererConfig);
}
var pair = (v) => {
  if (typeof v === "number") return [v, v];
  if (v && typeof v === "object") {
    const o = v;
    return [Number(o.min) || 0, Number(o.max) || 0];
  }
  return [0, 0];
};
var shapeKind = (t) => {
  switch (t) {
    case "SPHERE":
      return 1;
    case "CONE":
    default:
      return 0;
  }
};
function createComputePipeline(maxParticles, instanced, normalizedConfig, particleSystemId, forceFieldCount, collisionPlaneCount = 0) {
  const bakedCurves = bakeParticleSystemCurves(normalizedConfig, particleSystemId);
  const v = normalizedConfig.velocityOverLifetime;
  const flags = {
    sizeOverLifetime: normalizedConfig.sizeOverLifetime.isActive,
    opacityOverLifetime: normalizedConfig.opacityOverLifetime.isActive,
    colorOverLifetime: normalizedConfig.colorOverLifetime.isActive,
    rotationOverLifetime: normalizedConfig.rotationOverLifetime.isActive,
    linearVelocity: v.isActive && (isLifeTimeCurve(v.linear.x ?? 0) || isLifeTimeCurve(v.linear.y ?? 0) || isLifeTimeCurve(v.linear.z ?? 0) || v.linear.x !== 0 || v.linear.y !== 0 || v.linear.z !== 0),
    orbitalVelocity: v.isActive && (isLifeTimeCurve(v.orbital.x ?? 0) || isLifeTimeCurve(v.orbital.y ?? 0) || isLifeTimeCurve(v.orbital.z ?? 0) || v.orbital.x !== 0 || v.orbital.y !== 0 || v.orbital.z !== 0),
    noise: normalizedConfig.noise.isActive,
    forceFields: forceFieldCount > 0,
    collisionPlanes: collisionPlaneCount > 0
  };
  const [lifeMin, lifeMax] = pair(normalizedConfig.startLifetime);
  const [spdMin, spdMax] = pair(normalizedConfig.startSpeed);
  const [szMin, szMax] = pair(normalizedConfig.startSize);
  const [rotMin, rotMax] = pair(normalizedConfig.startRotation);
  const [opMin, opMax] = pair(normalizedConfig.startOpacity);
  const cMin = normalizedConfig.startColor.min || { r: 1, g: 1, b: 1 };
  const cMax = normalizedConfig.startColor.max || { r: 1, g: 1, b: 1 };
  const sf = normalizedConfig.textureSheetAnimation && normalizedConfig.textureSheetAnimation.startFrame || 0;
  const sfPair = pair(sf);
  const shp = normalizedConfig.shape;
  const shapeParams = {
    shapeKind: shapeKind(shp.shapeType),
    radius: shp.radius ?? 1,
    length: shp.length ?? 0,
    arc: shp.arc ?? 360,
    spreadX: shp.spreadX ?? 0,
    spreadY: shp.spreadY ?? 0,
    spreadZ: shp.spreadZ ?? 0,
    speedMin: spdMin,
    speedMax: spdMax,
    sizeMin: szMin,
    sizeMax: szMax,
    rotMin,
    rotMax,
    opacityMin: opMin,
    opacityMax: opMax,
    lifeMin,
    lifeMax,
    colorRMin: cMin.r,
    colorRMax: cMax.r,
    colorGMin: cMin.g,
    colorGMax: cMax.g,
    colorBMin: cMin.b,
    colorBMax: cMax.b,
    startFrameMin: sfPair[0],
    startFrameMax: sfPair[1],
    rotationCurveActive: normalizedConfig.rotationOverLifetime.isActive,
    rotationalXCurve: bakedCurves.orbitalVelX ?? -1,
    rotationalYCurve: bakedCurves.orbitalVelY ?? -1,
    rotationalZCurve: bakedCurves.orbitalVelZ ?? -1,
    linearXCurve: bakedCurves.linearVelX ?? -1,
    linearYCurve: bakedCurves.linearVelY ?? -1,
    linearZCurve: bakedCurves.linearVelZ ?? -1
  };
  const built = createModifierStorageBuffers(
    maxParticles,
    instanced,
    bakedCurves.data,
    flags.forceFields,
    flags.collisionPlanes
  );
  return createModifierComputeUpdate(
    built.buffers,
    maxParticles,
    bakedCurves,
    flags,
    shapeParams,
    forceFieldCount,
    collisionPlaneCount,
    built.freeListOffset
  );
}

// src/webgpu.ts
function enableWebGPU(renderer) {
  const factory = {
    createTSLParticleMaterial,
    createTSLTrailMaterial,
    createComputePipeline,
    encodeForceFieldsForGPU,
    encodeCollisionPlanesForGPU
  };
  return registerTSLMaterialFactory(
    factory,
    renderer !== void 0 ? { renderer } : void 0
  );
}

export { createComputePipeline, createTSLParticleMaterial, createTSLTrailMaterial, enableWebGPU, encodeCollisionPlanesForGPU, encodeForceFieldsForGPU };
//# sourceMappingURL=webgpu.js.map
//# sourceMappingURL=webgpu.js.map