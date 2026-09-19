import { registerTSLMaterialFactory } from '@cyberluke/three-particles';
import { Fn, mod, float, floor, dot, vec3, step, min, max, vec4, vec2, abs, round, If, texture, screenUV, smoothstep, cross, uniform, storage, uint, atomicStore, compute, atomicLoad, instanceIndex, atomicAdd, sqrt, mix, rand, buffer, cos, sin, fract, attribute, modelViewMatrix, positionLocal, length, varyingProperty, pointUV, Discard, normalLocal, cameraProjectionMatrix, uv, normalize, cameraPosition, cameraViewMatrix, Loop, Continue } from './three.tsl.js?v=8';
import * as THREE from './three.module.js?v=8';
import { Vector4, Vector3, DoubleSide, DataTexture } from './three.module.js?v=8';
import { StorageBufferAttribute, StorageInstancedBufferAttribute, PointsNodeMaterial, MeshBasicNodeMaterial } from './three.webgpu.js?v=8';

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
  const raw = lifetimeCurve;
  if (Array.isArray(raw.bezierPoints)) {
    return createBezierCurveFunction(
      particleSystemId,
      raw.bezierPoints
    );
  }
  if (typeof raw.curveFunction === "function") {
    return raw.curveFunction;
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
function bakeCurve(curveFn, resolution = CURVE_RESOLUTION) {
  const samples = new Float32Array(resolution);
  const lastIndex = resolution - 1;
  for (let i = 0; i < resolution; i++) {
    const t = lastIndex === 0 ? 0 : i / lastIndex;
    samples[i] = curveFn(t);
  }
  return samples;
}
function bakeCurveIntoBuffer(buffer2, writeOffset, particleSystemId, curve) {
  const curveFn = getCurveFunctionFromConfig(particleSystemId, curve);
  const lastIndex = CURVE_RESOLUTION - 1;
  for (let i = 0; i < CURVE_RESOLUTION; i++) {
    const t = i / lastIndex;
    buffer2[writeOffset + i] = curveFn(t);
  }
  return writeOffset + CURVE_RESOLUTION;
}
function bakeVelocityAxisIntoBuffer(buffer2, writeOffset, particleSystemId, value) {
  if (isLifeTimeCurve(value)) {
    return bakeCurveIntoBuffer(buffer2, writeOffset, particleSystemId, value);
  }
  return writeOffset;
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
  const isCurveAxis = (v) => isVelActive && v !== void 0 && isLifeTimeCurve(v);
  const hasLinearVelX = isCurveAxis(velocityOverLifetime.linear.x);
  const hasLinearVelY = isCurveAxis(velocityOverLifetime.linear.y);
  const hasLinearVelZ = isCurveAxis(velocityOverLifetime.linear.z);
  const hasOrbitalVelX = isCurveAxis(velocityOverLifetime.orbital.x);
  const hasOrbitalVelY = isCurveAxis(velocityOverLifetime.orbital.y);
  const hasOrbitalVelZ = isCurveAxis(velocityOverLifetime.orbital.z);
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
var permute = Fn(({ x }) => {
  return mod(x.mul(34).add(10).mul(x), float(289));
});
var taylorInvSqrt = Fn(({ r }) => {
  return float(1.79284291400159).sub(float(0.85373472095314).mul(r));
});
var snoise3D = Fn(
  ({ v }) => {
    const ONE_THIRD = float(1 / 3);
    const ONE_SIXTH = float(1 / 6);
    const i = floor(
      v.add(dot(v, vec3(ONE_THIRD, ONE_THIRD, ONE_THIRD)))
    ).toVar();
    const x0 = v.sub(i).add(dot(i, vec3(ONE_SIXTH, ONE_SIXTH, ONE_SIXTH))).toVar();
    const g = step(x0.yzx, x0.xyz).toVar();
    const l = float(1).sub(g).toVar();
    const i1 = min(g.xyz, l.zxy).toVar();
    const i2 = max(g.xyz, l.zxy).toVar();
    const x1 = x0.sub(i1).add(ONE_SIXTH).toVar();
    const x2 = x0.sub(i2).add(ONE_SIXTH.mul(2)).toVar();
    const x3 = x0.sub(float(1)).add(ONE_SIXTH.mul(3)).toVar();
    const iw = mod(i, float(289)).toVar();
    const p0_yz = permute({
      x: permute({
        x: vec4(
          vec2(iw.z, iw.z.add(i1.z)),
          vec2(iw.z.add(i2.z), iw.z.add(1))
        )
      }).add(
        vec4(vec2(iw.y, iw.y.add(i1.y)), vec2(iw.y.add(i2.y), iw.y.add(1)))
      )
    });
    const p = permute({
      x: p0_yz.add(
        vec4(vec2(iw.x, iw.x.add(i1.x)), vec2(iw.x.add(i2.x), iw.x.add(1)))
      )
    });
    const n_ = float(0.142857142857142);
    const j = p.sub(float(49).mul(floor(p.mul(n_).mul(n_)))).toVar();
    const x_ = floor(j.mul(n_)).toVar();
    const y_ = floor(j.sub(float(7).mul(x_))).toVar();
    const NS_X = float(0.285714285714286);
    const NS_Y = float(-0.928571428571429);
    const gx = x_.mul(NS_X).add(NS_Y);
    const gy = y_.mul(NS_X).add(NS_Y);
    const gz = float(1).sub(abs(gx)).sub(abs(gy)).toVar();
    const gz_neg = step(gz, vec4(0));
    const ox = gz_neg.mul(floor(gx).add(0.5));
    const oy = gz_neg.mul(floor(gy).add(0.5));
    const gx_final = gx.sub(ox);
    const gy_final = gy.sub(oy);
    const g0 = vec3(gx_final.x, gy_final.x, gz.x).toVar();
    const g1 = vec3(gx_final.y, gy_final.y, gz.y).toVar();
    const g2 = vec3(gx_final.z, gy_final.z, gz.z).toVar();
    const g3 = vec3(gx_final.w, gy_final.w, gz.w).toVar();
    const norm = taylorInvSqrt({
      r: vec4(vec2(dot(g0, g0), dot(g1, g1)), vec2(dot(g2, g2), dot(g3, g3)))
    });
    g0.assign(g0.mul(norm.x));
    g1.assign(g1.mul(norm.y));
    g2.assign(g2.mul(norm.z));
    g3.assign(g3.mul(norm.w));
    const m = max(
      vec4(
        vec2(float(0.5).sub(dot(x0, x0)), float(0.5).sub(dot(x1, x1))),
        vec2(float(0.5).sub(dot(x2, x2)), float(0.5).sub(dot(x3, x3)))
      ),
      float(0)
    ).toVar();
    const m2 = m.mul(m).toVar();
    const m4 = m2.mul(m2).toVar();
    const gdot = vec4(
      vec2(dot(g0, x0), dot(g1, x1)),
      vec2(dot(g2, x2), dot(g3, x3))
    );
    return float(42).mul(dot(m4, gdot));
  }
);
Fn(
  ({ t }) => {
    const noiseX = snoise3D({ v: vec3(t, float(0), float(0)) });
    const noiseY = snoise3D({ v: vec3(t, t, float(0)) });
    const noiseZ = snoise3D({ v: vec3(t, t, t) });
    return vec3(noiseX, noiseY, noiseZ);
  }
);

// src/js/effects/three-particles/color-utils.ts
var sRGBToLinear = (c) => c < 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

// src/js/effects/three-particles/webgpu/compute-modifiers.ts
var SUB_EMITTER_EVENT_STRIDE = 6;
var subEmitterWindowSize = (capacity) => SUB_EMITTER_EVENT_STRIDE * Math.max(1, capacity);
var createSubEmitterFifoAttribute = (capacity) => ({
  counter: new StorageBufferAttribute(new Uint32Array(2), 1),
  payload: new StorageBufferAttribute(
    new Float32Array(
      2 * SUB_EMITTER_EVENT_STRIDE * Math.max(1, capacity)
    ),
    1
  ),
  trigger: 1,
  capacity: Math.max(1, capacity),
  windowSize: subEmitterWindowSize(capacity)
});
function createModifierStorageBuffers(maxParticles, instanced, curveData, hasForceFields = false, hasCollisionPlanes = false, trailLength = 0) {
  const Cls = instanced ? StorageInstancedBufferAttribute : StorageBufferAttribute;
  const curveLen = Math.max(curveData.length, 1);
  const ffSize = hasForceFields ? FORCE_FIELD_DATA_SIZE : 0;
  const cpSize = hasCollisionPlanes ? COLLISION_PLANE_DATA_SIZE : 0;
  const packedData = new Float32Array(curveLen + ffSize + cpSize);
  packedData.set(curveData, 0);
  const allocatorCount = maxParticles + 1;
  const allocatorData = new Uint32Array(allocatorCount);
  allocatorData[0] = 0;
  for (let i = 0; i < maxParticles; i++) allocatorData[i + 1] = i;
  const trailMeta = trailLength > 0 ? new StorageBufferAttribute(
    new Uint32Array(Math.max(1, maxParticles) * 2),
    1
  ) : null;
  return {
    buffers: {
      position: new Cls(new Float32Array(maxParticles * 4), 4),
      velocity: new StorageBufferAttribute(new Float32Array(maxParticles * 4), 4),
      color: new Cls(new Float32Array(maxParticles * 4), 4),
      particleState: new Cls(new Float32Array(maxParticles * 4), 4),
      startValues: new Cls(new Float32Array(maxParticles * 4), 4),
      startColorsExt: new StorageBufferAttribute(new Float32Array(maxParticles * 4), 4),
      orbitalIsActive: new StorageBufferAttribute(new Float32Array(maxParticles * 4), 4),
      allocator: new StorageBufferAttribute(allocatorData, 1),
      trailMeta,
      packedData
    },
    allocatorCount
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
function shapeEmitNodes(u, rA, rB, rC, rSpeed) {
  const DEG = float(0.01745329);
  const uRadius = u.radius;
  const uRadiusThickness = u.thickness;
  const thetaS = rA.mul(u.arcDeg).mul(DEG);
  const cosPhi = rB.mul(float(2)).sub(float(1));
  const sinPhi = sqrt(float(1).sub(cosPhi.mul(cosPhi)));
  const dirSx = sinPhi.mul(cos(thetaS));
  const dirSy = sinPhi.mul(sin(thetaS));
  const dirSz = cosPhi;
  const distS = uRadius.mul(float(1).sub(uRadiusThickness)).add(uRadius.mul(uRadiusThickness).mul(rC));
  const pSx = dirSx.mul(distS);
  const pSy = dirSy.mul(distS);
  const pSz = dirSz.mul(distS);
  const spS = mix(u.speedMin, u.speedMax, rSpeed);
  const vSx = dirSx.mul(spS);
  const vSy = dirSy.mul(spS);
  const vSz = dirSz.mul(spS);
  const thetaB = rA.mul(u.arcDeg).mul(DEG);
  const dirBx = cos(thetaB);
  const dirBy = sin(thetaB);
  const distB = uRadius.mul(float(1).sub(uRadiusThickness)).add(uRadius.mul(uRadiusThickness).mul(rB));
  const pBx = dirBx.mul(distB);
  const pBy = dirBy.mul(distB);
  const pBz = float(0);
  const nAngle = distB.div(uRadius.max(float(1e-6))).mul(u.coneAngleDeg.mul(DEG));
  const spB = mix(u.speedMin, u.speedMax, rSpeed);
  const sinNA = sin(nAngle);
  const vCx = dirBx.mul(sinNA).mul(spB);
  const vCy = dirBy.mul(sinNA).mul(spB);
  const vCz = cos(nAngle).mul(spB);
  const vIx = dirBx.mul(spB);
  const vIy = dirBy.mul(spB);
  const vIz = float(0);
  const rxOff = rA.mul(u.rectSX).sub(u.rectSX.mul(float(0.5)));
  const ryOff = rB.mul(u.rectSY).sub(u.rectSY.mul(float(0.5)));
  const rotXr = u.rectRX.mul(DEG);
  const rotYr = u.rectRY.mul(DEG);
  const pRx = rxOff.mul(cos(rotYr));
  const pRy = ryOff.mul(cos(rotXr));
  const pRz = rxOff.mul(sin(rotYr)).sub(ryOff.mul(sin(rotXr)));
  const halfX = u.boxSX.mul(float(0.5));
  const halfY = u.boxSY.mul(float(0.5));
  const halfZ = u.boxSZ.mul(float(0.5));
  const pVx = rA.mul(u.boxSX).sub(halfX);
  const pVy = rB.mul(u.boxSY).sub(halfY);
  const pVz = rC.mul(u.boxSZ).sub(halfZ);
  const side = floor(rA.mul(float(6))).min(float(5));
  const pa = side.sub(floor(side.div(float(3))).mul(float(3)));
  const a0 = side.greaterThan(float(2)).select(float(1), float(0));
  const isPa0 = pa.equal(float(0));
  const isPa1 = pa.equal(float(1));
  const shX = isPa0.select(a0, isPa1.select(rC, rB));
  const shY = isPa0.select(rB, isPa1.select(a0, rC));
  const shZ = isPa0.select(rC, isPa1.select(rB, a0));
  const pShx = shX.mul(u.boxSX).sub(halfX);
  const pShy = shY.mul(u.boxSY).sub(halfY);
  const pShz = shZ.mul(u.boxSZ).sub(halfZ);
  const edge = floor(rB.mul(float(4))).min(float(3));
  const lowEdge = edge.lessThan(float(2));
  const e1 = lowEdge.select(rC, edge.sub(float(2)));
  const e2 = lowEdge.select(edge, rC);
  const edX = isPa0.select(a0, isPa1.select(e2, e1));
  const edY = isPa0.select(e1, isPa1.select(a0, e2));
  const edZ = isPa0.select(e2, isPa1.select(e1, a0));
  const pEdx = edX.mul(u.boxSX).sub(halfX);
  const pEdy = edY.mul(u.boxSY).sub(halfY);
  const pEdz = edZ.mul(u.boxSZ).sub(halfZ);
  const boxFrom = u.boxFrom;
  const pBX = boxFrom.equal(float(0)).select(pVx, boxFrom.equal(float(1)).select(pShx, pEdx));
  const pBY = boxFrom.equal(float(0)).select(pVy, boxFrom.equal(float(1)).select(pShy, pEdy));
  const pBZ = boxFrom.equal(float(0)).select(pVz, boxFrom.equal(float(1)).select(pShz, pEdz));
  const vPlaneZ = mix(u.speedMin, u.speedMax, rSpeed);
  const kind = u.kind;
  const isSphereKind = kind.equal(float(0));
  const isConeKind = kind.equal(float(1));
  const isCircleKind = kind.equal(float(2));
  const isRectKind = kind.equal(float(3));
  const planeX = isRectKind.select(pRx, pBX);
  const planeY = isRectKind.select(pRy, pBY);
  const planeZ = isRectKind.select(pRz, pBZ);
  const isDiscKind = isConeKind.or(isCircleKind);
  const discX = isDiscKind.select(pBx, planeX);
  const discY = isDiscKind.select(pBy, planeY);
  const discZ = isDiscKind.select(pBz, planeZ);
  const px = isSphereKind.select(pSx, discX);
  const py = isSphereKind.select(pSy, discY);
  const pz = isSphereKind.select(pSz, discZ);
  const cOrI_X = isConeKind.select(vCx, vIx);
  const cOrI_Y = isConeKind.select(vCy, vIy);
  const cOrI_Z = isConeKind.select(vCz, vIz);
  const isDisc = isConeKind.or(isCircleKind);
  const nonSphereVX = isDisc.select(cOrI_X, float(0));
  const nonSphereVY = isDisc.select(cOrI_Y, float(0));
  const nonSphereVZ = isDisc.select(cOrI_Z, vPlaneZ);
  const vx = isSphereKind.select(vSx, nonSphereVX);
  const vy = isSphereKind.select(vSy, nonSphereVY);
  const vz = isSphereKind.select(vSz, nonSphereVZ);
  return { px, py, pz, vx, vy, vz };
}
function quatRotateNodes(x, y, z, q) {
  const qx = q.x;
  const qy = q.y;
  const qz = q.z;
  const qw = q.w;
  const projD = qx.mul(x).add(qy.mul(y)).add(qz.mul(z)).mul(float(2));
  const scaleV = qw.mul(qw).mul(float(2)).sub(float(1));
  const twoW = qw.mul(float(2));
  return [
    x.mul(scaleV).add(qx.mul(projD)).add(qy.mul(z).sub(qz.mul(y)).mul(twoW)),
    y.mul(scaleV).add(qy.mul(projD)).add(qz.mul(x).sub(qx.mul(z)).mul(twoW)),
    z.mul(scaleV).add(qz.mul(projD)).add(qx.mul(y).sub(qy.mul(x)).mul(twoW))
  ];
}
function createModifierComputeUpdate(buffers, maxParticles, curveMap, flags, shapeParams, forceFieldCount = 0, collisionPlaneCount = 0, subFifos = [], trailDesc, velocityValues) {
  const uDelta = uniform(float(0));
  const uDeltaMs = uniform(float(0));
  const uNowMs = uniform(float(0));
  const uGravityVelocity = uniform(new Vector3(0, 0, 0));
  const uSeed = uniform(float(0));
  const uEmitCount = uniform(0, "uint");
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
  const uRadiusThickness = sh("radiusThickness", shapeParams.radiusThickness);
  const uArcDeg = sh("arcDeg", shapeParams.arcDeg);
  const uConeAngleDeg = sh("coneAngleDeg", shapeParams.coneAngleDeg);
  const uRectRX = sh("rectangleRotXDeg", shapeParams.rectangleRotXDeg);
  const uRectRY = sh("rectangleRotYDeg", shapeParams.rectangleRotYDeg);
  const uRectSX = sh("rectangleScaleX", shapeParams.rectangleScaleX);
  const uRectSY = sh("rectangleScaleY", shapeParams.rectangleScaleY);
  const uBoxSX = sh("boxScaleX", shapeParams.boxScaleX);
  const uBoxSY = sh("boxScaleY", shapeParams.boxScaleY);
  const uBoxSZ = sh("boxScaleZ", shapeParams.boxScaleZ);
  const uBoxEmitFrom = sh("boxEmitFrom", shapeParams.boxEmitFrom);
  const uEmitterPos = uniform(new Vector4(0, 0, 0, 0));
  const uWrapperQuat = uniform(new Vector4(0, 0, 0, 1));
  const uWorldScale = uniform(new Vector3(1, 1, 1));
  const uSpeedMin = sh("speedMin", shapeParams.speedMin);
  const uSpeedMax = sh("speedMax", shapeParams.speedMax);
  const uSizeMin = sh("sizeMin", shapeParams.sizeMin);
  const uSizeMax = sh("sizeMax", shapeParams.sizeMax);
  const uRotMin = sh("rotMin", shapeParams.rotMin);
  const uRotMax = sh("rotMax", shapeParams.rotMax);
  const uRotOLMin = sh("rotOverLifeMin", shapeParams.rotOverLifeMin);
  const uRotOLMax = sh("rotOverLifeMax", shapeParams.rotOverLifeMax);
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
  const allocatorCount = maxParticles + 1;
  const ringMod = float(maxParticles);
  const sAllocator = storage(buffers.allocator, "uint", Math.max(1, allocatorCount)).toAtomic();
  const sCD = buffer(buffers.packedData, "float", buffers.packedData.length);
  const lookupCurve = createCurveLookup(sCD);
  const uFifoBase = uniform(float(0), "uint");
  const fifoNodes = subFifos.map((f) => ({
    trigger: f.trigger,
    capacity: Math.max(1, f.capacity),
    windowSize: subEmitterWindowSize(Math.max(1, f.capacity)),
    count: storage(
      f.counter,
      "uint",
      Math.max(1, f.counter.array.length)
    ).toAtomic(),
    payload: storage(
      f.payload,
      "float",
      Math.max(1, f.payload.array.length)
    )
  }));
  const birthFifos = fifoNodes.filter((f) => f.trigger === 0);
  const deathFifos = fifoNodes.filter((f) => f.trigger === 1);
  const hasDeathFifo = deathFifos.length > 0;
  const writeFifoEvent = (f, x, y, z, vx, vy, vz) => {
    const winBase = uFifoBase.mul(float(f.windowSize)).toVar();
    const oldCount = float(
      atomicAdd(f.count.element(uFifoBase), uint(1))
    ).toVar();
    If(oldCount.lessThan(float(f.capacity)), () => {
      const b = winBase.add(oldCount.mul(float(SUB_EMITTER_EVENT_STRIDE)));
      f.payload.element(b).assign(x);
      f.payload.element(b.add(float(1))).assign(y);
      f.payload.element(b.add(float(2))).assign(z);
      f.payload.element(b.add(float(3))).assign(vx);
      f.payload.element(b.add(float(4))).assign(vy);
      f.payload.element(b.add(float(5))).assign(vz);
    });
  };
  const trailRows = trailDesc ? trailDesc.length + 1 : 0;
  const sTrail = trailDesc ? storage(trailDesc.attribute, "vec4", trailRows * maxParticles) : null;
  const sTrailMeta = trailDesc && buffers.trailMeta ? storage(buffers.trailMeta, "uint", maxParticles * 2).toAtomic() : null;
  const curveLen = Math.max(curveMap.data.length, 1);
  const forceFieldOffset = curveLen;
  const collisionOffset = forceFieldOffset + (flags.forceFields ? FORCE_FIELD_DATA_SIZE : 0);
  const ffNodes = flags.forceFields ? createForceFieldTSL(sCD, forceFieldOffset, forceFieldCount) : null;
  const cpNodes = flags.collisionPlanes ? createCollisionPlaneTSL(sCD, collisionOffset, collisionPlaneCount) : null;
  const parseAxis = (rawAxis, curveIdx) => {
    if (curveIdx >= 0) {
      return { ci: curveIdx, min: 0, max: 0, isRange: false };
    }
    if (rawAxis && typeof rawAxis === "object" && "min" in rawAxis && "max" in rawAxis) {
      const mn = Number(rawAxis.min) || 0;
      const mx = Number(rawAxis.max) || 0;
      return { ci: -1, min: mn, max: mx, isRange: mn !== mx };
    }
    const c = typeof rawAxis === "number" ? rawAxis : 0;
    return { ci: -1, min: c, max: c, isRange: false };
  };
  const vv = velocityValues ?? {
    linear: [void 0, void 0, void 0],
    orbital: [void 0, void 0, void 0]
  };
  const linAxes = [
    parseAxis(vv.linear[0], curveMap.linearVelX),
    parseAxis(vv.linear[1], curveMap.linearVelY),
    parseAxis(vv.linear[2], curveMap.linearVelZ)
  ];
  const orbAxes = [
    parseAxis(vv.orbital[0], curveMap.orbitalVelX),
    parseAxis(vv.orbital[1], curveMap.orbitalVelY),
    parseAxis(vv.orbital[2], curveMap.orbitalVelZ)
  ];
  const axisUniforms = /* @__PURE__ */ new Map();
  for (const a of [...linAxes, ...orbAxes]) {
    if (a.isRange) {
      axisUniforms.set(a, [uniform(float(a.min)), uniform(float(a.max))]);
    }
  }
  const simAxis = (a, lifePct, particleSeed, salt) => {
    if (a.ci >= 0) {
      return lookupCurve({
        curveIndex: float(a.ci),
        t: lifePct
      });
    }
    if (a.isRange) {
      const [mn, mx] = axisUniforms.get(a);
      return mix(
        mn,
        mx,
        rand(particleSeed.add(float(salt)))
      );
    }
    return float(a.min);
  };
  const emitKernel = Fn(() => {
    const i = instanceIndex;
    If(i.lessThan(uEmitCount), () => {
      const birthNo = float(atomicAdd(sAllocator.element(0), uint(1))).toVar();
      const slotIdx = birthNo.sub(floor(birthNo.div(ringMod)).mul(ringMod)).toVar();
      const base2 = float(i).mul(float(16));
      const rnd = (k) => rand(uSeed.add(base2.add(float(k + 0.13))));
      const rA = rnd(1);
      const rB = rnd(2);
      const rC = rnd(3);
      const rSheet = rnd(5);
      const rSpeed = rnd(6);
      const rSize = rnd(7);
      const rRot = rnd(8);
      const rOp = rnd(9);
      const rLife = rnd(10);
      const rColor = rnd(11);
      const rRotSpeed = rnd(12);
      const shE = shapeEmitNodes(
        {
          kind: uShape,
          radius: uRadius,
          thickness: uRadiusThickness,
          arcDeg: uArcDeg,
          coneAngleDeg: uConeAngleDeg,
          rectRX: uRectRX,
          rectRY: uRectRY,
          rectSX: uRectSX,
          rectSY: uRectSY,
          boxSX: uBoxSX,
          boxSY: uBoxSY,
          boxSZ: uBoxSZ,
          boxFrom: uBoxEmitFrom,
          speedMin: uSpeedMin,
          speedMax: uSpeedMax
        },
        rA,
        rB,
        rC,
        rSpeed
      );
      const pxL = shE.px;
      const pyL = shE.py;
      const pzL = shE.pz;
      const vxL = shE.vx;
      const vyL = shE.vy;
      const vzL = shE.vz;
      const [rotPX, rotPY, rotPZ] = quatRotateNodes(pxL, pyL, pzL, uWrapperQuat);
      const [rotVX, rotVY, rotVZ] = quatRotateNodes(vxL, vyL, vzL, uWrapperQuat);
      const isWorld = uEmitterPos.w.greaterThan(0.5);
      const sxf = isWorld.select(uWorldScale.x, float(1));
      const syf = isWorld.select(uWorldScale.y, float(1));
      const szf = isWorld.select(uWorldScale.z, float(1));
      const ox = rotPX.mul(sxf).add(uEmitterPos.x);
      const oy = rotPY.mul(syf).add(uEmitterPos.y);
      const oz = rotPZ.mul(szf).add(uEmitterPos.z);
      const opac = mix(uOpMin, uOpMax, rOp);
      const clR = mix(uCRR, uCRX, rColor);
      const clG = mix(uCGR, uCGX, rColor);
      const clB = mix(uCBR, uCBX, rColor);
      const slife = mix(uLifeMin, uLifeMax, rLife).mul(float(1e3));
      const ssize = mix(uSizeMin, uSizeMax, rSize);
      const srot = mix(uRotMin, uRotMax, rRot);
      const startFrame = floor(mix(uFrMin, uFrMax, rSheet)).toVar();
      const rotSpeed = mix(uRotOLMin, uRotOLMax, rRotSpeed);
      const particleSeed = rand(
        uSeed.add(
          float(i).mul(float(16)).add(float(15.73))
        )
      );
      sPos.element(slotIdx).assign(vec4(ox, oy, oz, float(0)));
      sVel.element(slotIdx).assign(vec4(rotVX, rotVY, rotVZ, float(0)));
      sCol.element(slotIdx).assign(vec4(clR, clG, clB, opac));
      sPS.element(slotIdx).assign(vec4(float(0), ssize, srot, startFrame));
      sSV.element(slotIdx).assign(vec4(slife, ssize, opac, clR));
      sEx.element(slotIdx).assign(vec4(clG, clB, rotSpeed, particleSeed));
      sOIA.element(slotIdx).assign(vec4(rotPX, rotPY, rotPZ, float(1)));
    });
  });
  const emitNode = compute(emitKernel(), maxParticles);
  const noiseOctavesCount = Math.max(1, Math.round(shapeParams.noiseOctaves || 1));
  const noiseFbmMax = 2 - Math.pow(2, -noiseOctavesCount);
  if (!Number.isFinite(noiseFbmMax) || noiseFbmMax <= 0) {
    throw new Error(
      `three-particles: invalid FBM normalization ${noiseFbmMax}`
    );
  }
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
          const lvx = simAxis(linAxes[0], lifePct, ex.w, 11.17);
          const lvy = simAxis(linAxes[1], lifePct, ex.w, 23.41);
          const lvz = simAxis(linAxes[2], lifePct, ex.w, 37.73);
          pos.assign(pos.add(vec3(lvx, lvy, lvz).mul(uDelta)));
        }
        if (flags.orbitalVelocity) {
          const offset = vec3(oiaVec.x, oiaVec.y, oiaVec.z).toVar();
          pos.assign(pos.sub(offset));
          const oX = simAxis(orbAxes[0], lifePct, ex.w, 51.19);
          const oY = simAxis(orbAxes[1], lifePct, ex.w, 67.31);
          const oZ = simAxis(orbAxes[2], lifePct, ex.w, 83.47);
          const angX = oX.mul(uDelta);
          const angY = oZ.mul(uDelta);
          const angZ = oY.mul(uDelta);
          const c3 = cos(angZ), s3 = sin(angZ);
          const zx = offset.x.mul(c3).sub(offset.y.mul(s3));
          const zy = offset.x.mul(s3).add(offset.y.mul(c3));
          const zz = offset.z;
          const c2 = cos(angY), s2 = sin(angY);
          const yx = zx.mul(c2).add(zz.mul(s2));
          const yz = zx.mul(s2).negate().add(zz.mul(c2));
          const yy = zy;
          const c1 = cos(angX), s1 = sin(angX);
          const fx = yx;
          const fy = yy.mul(c1).sub(yz.mul(s1));
          const fz = yy.mul(s1).add(yz.mul(c1));
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
          const sce = sEx.element(i);
          if (curveMap.colorR >= 0) {
            col.x.assign(sv.w.mul(lookupCurve({ curveIndex: float(curveMap.colorR), t: lifePct })));
          }
          if (curveMap.colorG >= 0) {
            col.y.assign(sce.x.mul(lookupCurve({ curveIndex: float(curveMap.colorG), t: lifePct })));
          }
          if (curveMap.colorB >= 0) {
            col.z.assign(sce.y.mul(lookupCurve({ curveIndex: float(curveMap.colorB), t: lifePct })));
          }
          sCol.element(i).assign(col);
        }
        if (flags.rotationOverLifetime) {
          ps.z.assign(ps.z.add(ex.z.mul(uDelta).mul(float(0.02))));
        }
        if (flags.noise) {
          const noiseOffset = shapeParams.noiseUseRandomOffset ? rand(ex.w.add(float(97.13))).mul(float(100)) : float(0);
          const np = lifePct.add(noiseOffset).mul(float(10)).mul(uNoiseStrength).mul(uNoiseFrequency);
          let noiseX = float(0).toVar();
          let noiseY = float(0).toVar();
          let noiseZ = float(0).toVar();
          let amp = 1;
          let lac = 1;
          for (let o = 0; o < noiseOctavesCount; o++) {
            const t = np.mul(float(lac));
            const sc = float(amp / noiseFbmMax);
            noiseX.assign(noiseX.add(snoise3D({ v: vec3(t, float(0), float(0)) }).mul(sc)));
            noiseY.assign(noiseY.add(snoise3D({ v: vec3(t, t, float(0)) }).mul(sc)));
            noiseZ.assign(noiseZ.add(snoise3D({ v: vec3(t, t, t) }).mul(sc)));
            amp *= 0.5;
            lac *= 2;
          }
          If(uNoisePosAmount.greaterThan(float(1e-3)), () => {
            pos.assign(
              pos.add(vec3(noiseX, noiseY, noiseZ).mul(uNoisePower).mul(uNoisePosAmount))
            );
          });
          If(uNoiseRotAmount.greaterThan(float(1e-3)), () => {
            ps.z.assign(ps.z.add(noiseX.mul(uNoisePower).mul(uNoiseRotAmount)));
          });
          If(uNoiseSizeAmount.greaterThan(float(1e-3)), () => {
            ps.y.assign(ps.y.add(noiseX.mul(uNoisePower).mul(uNoiseSizeAmount)));
          });
        }
        ps.x.assign(ps.x.add(uDeltaMs));
        sPos.element(i).assign(vec4(pos, float(0)));
        sVel.element(i).assign(vec4(vel, float(0)));
        sPS.element(i).assign(ps);
        sOIA.element(i).assign(oiaVec);
        If(ps.x.greaterThan(startLife), () => {
          const inactive = sOIA.element(i).toVar();
          sOIA.element(i).assign(
            vec4(
              inactive.x,
              inactive.y,
              inactive.z,
              hasDeathFifo ? float(-1) : float(0)
            )
          );
          sCol.element(i).assign(vec4(float(0), float(0), float(0), float(0)));
        });
      });
    });
  });
  const simNode = compute(simKernel(), maxParticles);
  let trailHistoryNode = null;
  if (sTrail && sTrailMeta && trailDesc) {
    const trailHistoryKernel = Fn(() => {
      const i = instanceIndex;
      If(float(i).lessThan(float(maxParticles)), () => {
        const oiaVec = sOIA.element(i).toVar();
        const activeNow = oiaVec.w.greaterThanEqual(float(0.5));
        const pendingDeath = oiaVec.w.lessThan(float(-0.5));
        If(activeNow.or(pendingDeath), () => {
          const pos = sPos.element(i).toVar();
          const L = float(trailDesc.length);
          float(trailRows);
          const curIdx = i.mul(uint(2));
          const cursor = float(atomicLoad(sTrailMeta.element(curIdx))).toVar();
          const count = float(
            atomicLoad(sTrailMeta.element(curIdx.add(uint(1))))
          ).toVar();
          const baseI = i.mul(float(trailRows));
          const prev = sTrail.element(baseI.add(cursor)).toVar();
          const ddx = pos.x.sub(prev.x);
          const ddy = pos.y.sub(prev.y);
          const ddz = pos.z.sub(prev.z);
          const dist = sqrt(
            ddx.mul(ddx).add(ddy.mul(ddy)).add(ddz.mul(ddz))
          );
          const firstSample = count.lessThan(float(0.5));
          const farEnough = dist.greaterThanEqual(
            float(Math.max(1e-6, trailDesc.minVertexDistance))
          );
          If(firstSample.or(farEnough), () => {
            const newCursor = cursor.greaterThanEqual(L.sub(float(1))).select(float(0), cursor.add(float(1)));
            sTrail.element(baseI.add(newCursor)).assign(
              vec4(pos.x, pos.y, pos.z, uNowMs)
            );
            atomicStore(
              sTrailMeta.element(curIdx),
              newCursor.toUint()
            );
            atomicStore(
              sTrailMeta.element(curIdx.add(uint(1))),
              min(count.add(float(1)), float(trailDesc.length)).toUint()
            );
          });
        });
      });
    });
    trailHistoryNode = compute(trailHistoryKernel(), maxParticles);
  }
  let subBirthEventsNode = null;
  if (birthFifos.length > 0) {
    const subBirthKernel = Fn(() => {
      const i = instanceIndex;
      If(i.lessThan(uEmitCount), () => {
        const counterAfter = float(atomicLoad(sAllocator.element(0))).toVar();
        const birthNo = counterAfter.sub(float(uEmitCount)).add(float(i)).toVar();
        const slot = birthNo.sub(floor(birthNo.div(ringMod)).mul(ringMod)).toVar();
        const p = sPos.element(slot).toVar();
        const v = sVel.element(slot).toVar();
        for (const f of birthFifos) {
          writeFifoEvent(f, p.x, p.y, p.z, v.x, v.y, v.z);
        }
      });
    });
    subBirthEventsNode = compute(subBirthKernel(), maxParticles);
  }
  let subDeathEventsNode = null;
  if (deathFifos.length > 0) {
    const subDeathKernel = Fn(() => {
      const i = instanceIndex;
      If(float(i).lessThan(float(maxParticles)), () => {
        const oiaVec = sOIA.element(i).toVar();
        If(oiaVec.w.equal(float(-1)), () => {
          const p = sPos.element(i).toVar();
          const v = sVel.element(i).toVar();
          for (const f of deathFifos) {
            writeFifoEvent(f, p.x, p.y, p.z, v.x, v.y, v.z);
          }
          sOIA.element(i).assign(
            vec4(oiaVec.x, oiaVec.y, oiaVec.z, float(0))
          );
        });
      });
    });
    subDeathEventsNode = compute(subDeathKernel(), maxParticles);
  }
  const layout = (name, storageNodes, uniformNodes) => ({
    name,
    storageBindings: new Set(storageNodes.filter((n) => n != null)).size,
    uniformBindings: new Set(uniformNodes.filter((n) => n != null)).size
  });
  const basePool = [sPos, sVel, sCol, sPS, sSV, sEx, sOIA, sAllocator];
  const emitUniforms = [
    uEmitCount,
    uSeed,
    uShape,
    uRadius,
    uRadiusThickness,
    uArcDeg,
    uConeAngleDeg,
    uRectRX,
    uRectRY,
    uRectSX,
    uRectSY,
    uBoxSX,
    uBoxSY,
    uBoxSZ,
    uBoxEmitFrom,
    uSpeedMin,
    uSpeedMax,
    uSizeMin,
    uSizeMax,
    uRotMin,
    uRotMax,
    uOpMin,
    uOpMax,
    uLifeMin,
    uLifeMax,
    uCRR,
    uCRX,
    uCGR,
    uCGX,
    uCBR,
    uCBX,
    uFrMin,
    uFrMax,
    uRotOLMin,
    uRotOLMax,
    uWrapperQuat,
    uEmitterPos,
    uWorldScale
  ];
  const simUniforms = [
    uDelta,
    uDeltaMs,
    uGravityVelocity,
    uNoiseStrength,
    uNoisePower,
    uNoiseFrequency,
    uNoisePosAmount,
    uNoiseRotAmount,
    uNoiseSizeAmount,
    sCD,
    ...Array.from(axisUniforms.values()).flat()
  ];
  const passLayouts = [
    layout("emit", basePool, emitUniforms),
    layout("simulate", basePool, simUniforms)
  ];
  if (trailHistoryNode) {
    passLayouts.push(
      layout("trail-history", [sPos, sOIA, sTrail, sTrailMeta], [uNowMs])
    );
  }
  if (subBirthEventsNode) {
    passLayouts.push(
      layout(
        "sub-birth-events",
        [
          sAllocator,
          sPos,
          sVel,
          ...birthFifos.flatMap((f) => [f.count, f.payload])
        ],
        [uEmitCount, uFifoBase]
      )
    );
  }
  if (subDeathEventsNode) {
    passLayouts.push(
      layout(
        "sub-death-events",
        [
          sPos,
          sVel,
          sOIA,
          ...deathFifos.flatMap((f) => [f.count, f.payload])
        ],
        [uFifoBase]
      )
    );
  }
  return {
    emitNode,
    simNode,
    trailHistoryNode,
    subBirthEventsNode,
    subDeathEventsNode,
    computeNodes: [
      emitNode,
      ...subBirthEventsNode ? [subBirthEventsNode] : [],
      simNode,
      ...subDeathEventsNode ? [subDeathEventsNode] : [],
      ...trailHistoryNode ? [trailHistoryNode] : []
    ],
    passLayouts,
    uniforms: {
      delta: uDelta,
      deltaMs: uDeltaMs,
      nowMs: uNowMs,
      gravityVelocity: uGravityVelocity,
      noiseStrength: uNoiseStrength,
      noisePower: uNoisePower,
      noiseFrequency: uNoiseFrequency,
      noisePositionAmount: uNoisePosAmount,
      noiseRotationAmount: uNoiseRotAmount,
      noiseSizeAmount: uNoiseSizeAmount,
      emitCount: uEmitCount,
      seed: uSeed,
      /** Ping-pong FIFO window index for this frame (0 or 1). */
      fifoBase: uFifoBase
    },
    shapeUniforms,
    buffers,
    allocatorCount,
    packedDataNode: sCD,
    passNames: [
      "emit",
      ...subBirthEventsNode ? ["sub-birth-events"] : [],
      "simulate",
      ...subDeathEventsNode ? ["sub-death-events"] : [],
      ...trailHistoryNode ? ["trail-history"] : []
    ],
    trailMeta: buffers.trailMeta,
    // Emitter-pose uniforms, refreshed once per frame by the CPU (scalar only).
    emitterPose: {
      positionW: uEmitterPos,
      wrapperQuat: uWrapperQuat,
      worldScale: uWorldScale
    },
    forceFieldInfo: ffNodes ? { offset: forceFieldOffset, countUniform: ffNodes.countUniform } : null,
    collisionPlaneInfo: cpNodes ? { offset: collisionOffset, countUniform: cpNodes.countUniform } : null
  };
}
function createSubEmitterInitUpdate(child, childMax, childParams, parent, parentMax, fifo, inheritVelocity, particlesPerEvent, childVelValues) {
  const capacity = Math.max(1, fifo.capacity);
  const perEvent = Math.max(1, particlesPerEvent);
  const windowSize = subEmitterWindowSize(capacity);
  const uSeed = uniform(float(0));
  const uInherit = uniform(float(Math.max(0, inheritVelocity)));
  const uFifoBase = uniform(float(0));
  const uWrapperQuat = uniform(new Vector4(0, 0, 0, 1));
  const uEmitterPos = uniform(new Vector4(0, 0, 0, 0));
  const uWorldScale = uniform(new Vector3(1, 1, 1));
  const cRadius = uniform(float(childParams.radius));
  const cThickness = uniform(float(childParams.radiusThickness));
  const cArc = uniform(float(childParams.arcDeg));
  const cAngle = uniform(float(childParams.coneAngleDeg));
  const cRRX = uniform(float(childParams.rectangleRotXDeg));
  const cRRY = uniform(float(childParams.rectangleRotYDeg));
  const cRSX = uniform(float(childParams.rectangleScaleX));
  const cRSY = uniform(float(childParams.rectangleScaleY));
  const cBSX = uniform(float(childParams.boxScaleX));
  const cBSY = uniform(float(childParams.boxScaleY));
  const cBSZ = uniform(float(childParams.boxScaleZ));
  const cBF = uniform(float(childParams.boxEmitFrom));
  const cKind = uniform(float(childParams.shapeKind));
  const cSpeedMin = uniform(float(childParams.speedMin));
  const cSpeedMax = uniform(float(childParams.speedMax));
  const cSizeMin = uniform(float(childParams.sizeMin));
  const cSizeMax = uniform(float(childParams.sizeMax));
  const cRotMin = uniform(float(childParams.rotMin));
  const cRotMax = uniform(float(childParams.rotMax));
  const cOpMin = uniform(float(childParams.opacityMin));
  const cOpMax = uniform(float(childParams.opacityMax));
  const cLifeMin = uniform(float(childParams.lifeMin));
  const cLifeMax = uniform(float(childParams.lifeMax));
  const cCRR = uniform(float(sRGBToLinear(childParams.colorRMin)));
  const cCRX = uniform(float(sRGBToLinear(childParams.colorRMax)));
  const cCGR = uniform(float(sRGBToLinear(childParams.colorGMin)));
  const cCGX = uniform(float(sRGBToLinear(childParams.colorGMax)));
  const cCBR = uniform(float(sRGBToLinear(childParams.colorBMin)));
  const cCBX = uniform(float(sRGBToLinear(childParams.colorBMax)));
  const cFrMin = uniform(float(childParams.startFrameMin));
  const cFrMax = uniform(float(childParams.startFrameMax));
  const cPos = storage(child.position, "vec4", childMax);
  const cVel = storage(child.velocity, "vec4", childMax);
  const cCol = storage(child.color, "vec4", childMax);
  const cPS = storage(child.particleState, "vec4", childMax);
  const cSV = storage(child.startValues, "vec4", childMax);
  const cEx = storage(child.startColorsExt, "vec4", childMax);
  const cOIA = storage(child.orbitalIsActive, "vec4", childMax);
  const cAlloc = storage(
    child.allocator,
    "uint",
    Math.max(1, childMax + 1)
  ).toAtomic();
  const cRingMod = float(childMax);
  const commandBuffer = new StorageBufferAttribute(
    new Float32Array(4 * (1 + capacity * perEvent)),
    4
  );
  const fifoCounter = storage(
    fifo.counter,
    "uint",
    Math.max(1, fifo.counter.array.length)
  ).toAtomic();
  const fifoPayload = storage(
    fifo.payload,
    "float",
    Math.max(1, fifo.payload.array.length)
  );
  const sCmd = storage(commandBuffer, "vec4", 1 + capacity * perEvent);
  const cParseAxis = (rawAxis, ci) => {
    if (rawAxis && typeof rawAxis === "object" && "min" in rawAxis) {
      const mn = Number(rawAxis.min) || 0;
      const mx = Number(rawAxis.max) || 0;
      return { min: mn, max: mx, isRange: mn !== mx };
    }
    const c = typeof rawAxis === "number" ? rawAxis : 0;
    return { min: c, max: c, isRange: false };
  };
  const cVv = childVelValues ?? {
    linear: [void 0, void 0, void 0],
    orbital: [void 0, void 0, void 0]
  };
  [0, 1, 2].map((k) => cParseAxis(cVv.linear[k]));
  [0, 1, 2].map((k) => cParseAxis(cVv.orbital[k]));
  const otherIdx = uFifoBase.equal(float(0)).select(uint(1), uint(0));
  const counterClearKernel = Fn(() => {
    atomicStore(fifoCounter.element(otherIdx), uint(0));
  });
  const counterClearNode = compute(counterClearKernel(), 1);
  const commandBuildKernel = Fn(() => {
    const i = instanceIndex;
    const winBase = uFifoBase.mul(float(windowSize)).toVar();
    const count = float(atomicLoad(fifoCounter.element(uFifoBase))).toVar();
    If(float(i).equal(float(0)), () => {
      sCmd.element(float(0)).assign(vec4(count, float(0), float(0), float(0)));
    });
    If(float(i).lessThan(count), () => {
      const eb = winBase.add(float(i).mul(float(SUB_EMITTER_EVENT_STRIDE)));
      const eX = fifoPayload.element(eb).toVar();
      const eY = fifoPayload.element(eb.add(float(1))).toVar();
      const eZ = fifoPayload.element(eb.add(float(2))).toVar();
      const vX = fifoPayload.element(eb.add(float(3))).toVar();
      const vY = fifoPayload.element(eb.add(float(4))).toVar();
      const vZ = fifoPayload.element(eb.add(float(5))).toVar();
      for (let jj = 0; jj < perEvent; jj++) {
        const birthNo = float(atomicAdd(cAlloc.element(0), uint(1))).toVar();
        const slot = birthNo.sub(floor(birthNo.div(cRingMod)).mul(cRingMod)).toVar();
        const m = float(i.mul(float(perEvent)).add(float(jj)));
        sCmd.element(float(1).add(m.mul(float(2)))).assign(vec4(slot, eX, eY, eZ));
        sCmd.element(float(2).add(m.mul(float(2)))).assign(vec4(vX, vY, vZ, float(0)));
      }
    });
  });
  const commandBuildNode = compute(commandBuildKernel(), capacity);
  const childInitKernel = Fn(() => {
    const i = instanceIndex;
    const header = sCmd.element(float(0)).toVar();
    If(float(i).lessThan(header.x.mul(float(perEvent))), () => {
      const m = float(i);
      const c0 = sCmd.element(float(1).add(m.mul(float(2)))).toVar();
      const c1 = sCmd.element(float(2).add(m.mul(float(2)))).toVar();
      const slot = c0.x;
      const eX = c0.y;
      const eY = c0.z;
      const eZ = c0.w;
      const vX = c1.x;
      const vY = c1.y;
      const vZ = c1.z;
      const parentSpeed = sqrt(
        vX.mul(vX).add(vY.mul(vY)).add(vZ.mul(vZ))
      ).toVar();
      const spAdd = parentSpeed.mul(uInherit);
      {
        const rBase = m.mul(float(16));
        const rnd = (k) => rand(uSeed.add(rBase.add(float(k + 0.13))));
        const rA = rnd(1);
        const rB = rnd(2);
        const rC = rnd(3);
        const rSheet = rnd(5);
        const rSpeed = rnd(6);
        const rSize = rnd(7);
        const rRot = rnd(8);
        const rOp = rnd(9);
        const rLife = rnd(10);
        const rColor = rnd(11);
        const rRotSpeed = rnd(12);
        const shE = shapeEmitNodes(
          {
            kind: cKind,
            radius: cRadius,
            thickness: cThickness,
            arcDeg: cArc,
            coneAngleDeg: cAngle,
            rectRX: cRRX,
            rectRY: cRRY,
            rectSX: cRSX,
            rectSY: cRSY,
            boxSX: cBSX,
            boxSY: cBSY,
            boxSZ: cBSZ,
            boxFrom: cBF,
            speedMin: cSpeedMin.add(spAdd),
            speedMax: cSpeedMax.add(spAdd)
          },
          rA,
          rB,
          rC,
          rSpeed
        );
        const [rx, ry, rz] = quatRotateNodes(
          shE.px,
          shE.py,
          shE.pz,
          uWrapperQuat
        );
        const [rvx, rvy, rvz] = quatRotateNodes(
          shE.vx,
          shE.vy,
          shE.vz,
          uWrapperQuat
        );
        const isWorld = uEmitterPos.w.greaterThan(0.5);
        const sxf = isWorld.select(uWorldScale.x, float(1));
        const syf = isWorld.select(uWorldScale.y, float(1));
        const szf = isWorld.select(uWorldScale.z, float(1));
        const px = rx.mul(sxf).add(eX);
        const py = ry.mul(syf).add(eY);
        const pz = rz.mul(szf).add(eZ);
        const opac = mix(cOpMin, cOpMax, rOp);
        const clR = mix(cCRR, cCRX, rColor);
        const clG = mix(cCGR, cCGX, rColor);
        const clB = mix(cCBR, cCBX, rColor);
        const slife = mix(cLifeMin, cLifeMax, rLife).mul(float(1e3));
        const ssize = mix(cSizeMin, cSizeMax, rSize);
        const srot = mix(cRotMin, cRotMax, rRot);
        const startFrame = floor(mix(cFrMin, cFrMax, rSheet)).toVar();
        const rotSpeed = mix(
          float(childParams.rotOverLifeMin),
          float(childParams.rotOverLifeMax),
          rRotSpeed
        );
        const particleSeed = rand(
          uSeed.add(rBase.add(float(15.73)))
        );
        cPos.element(slot).assign(vec4(px, py, pz, float(0)));
        cVel.element(slot).assign(vec4(rvx, rvy, rvz, float(0)));
        cCol.element(slot).assign(vec4(clR, clG, clB, opac));
        cPS.element(slot).assign(
          vec4(float(0), ssize, srot, startFrame)
        );
        cSV.element(slot).assign(vec4(slife, ssize, opac, clR));
        cEx.element(slot).assign(
          vec4(clG, clB, rotSpeed, particleSeed)
        );
        cOIA.element(slot).assign(vec4(rx, ry, rz, float(1)));
      }
    });
  });
  const childInitNode = compute(
    childInitKernel(),
    Math.max(1, capacity * perEvent)
  );
  const initPassLayouts = [
    {
      name: "sub-command-build",
      storageBindings: 4,
      // fifoCounter, fifoPayload, allocator, commands
      uniformBindings: 1
      // uFifoBase
    },
    {
      // command buffer + the 7 child pools; NO allocator here.
      name: "sub-child-init",
      storageBindings: 8,
      uniformBindings: 35
      // seed/inherit/pose + 30 child shape scalars
    },
    {
      name: "sub-counter-clear",
      storageBindings: 1,
      uniformBindings: 1
    }
  ];
  return {
    commandBuildNode,
    childInitNode,
    counterClearNode,
    commandBuffer,
    passLayouts: initPassLayouts,
    passName: fifo.trigger === 0 ? "sub-birth" : "sub-death",
    counterClearPassName: "fifo-counter-clear",
    uniforms: {
      seed: uSeed,
      fifoBase: uFifoBase,
      inherit: uInherit,
      positionW: uEmitterPos,
      wrapperQuat: uWrapperQuat
    },
    buffers: child
  };
}
function createTrailRibbonUpdate(desc) {
  const L = desc.length;
  const rows = L + 1;
  const vertexCount = Math.max(1, desc.maxParticles) * Math.max(1, L);
  const uNowMs = uniform(float(0));
  const activeFns = [
    desc.curveFns.width ?? ((t) => t),
    desc.curveFns.opacity ?? ((t) => t),
    desc.curveFns.colorR ?? ((t) => t),
    desc.curveFns.colorG ?? ((t) => t),
    desc.curveFns.colorB ?? ((t) => t)
  ];
  const curveData = new Float32Array(activeFns.length * CURVE_RESOLUTION);
  activeFns.forEach((fn, k) => {
    curveData.set(bakeCurve(fn, CURVE_RESOLUTION), k * CURVE_RESOLUTION);
  });
  const IDX_WIDTH = 0;
  const IDX_OPACITY = 1;
  const IDX_CR = 2;
  const IDX_CG = 3;
  const IDX_CB = 4;
  const aPos = storage(desc.position, "vec4", vertexCount * 2);
  const aNext = storage(desc.next, "vec4", vertexCount * 2);
  const aUVA = storage(desc.uvColorA, "vec4", vertexCount * 2);
  const aColB = storage(desc.colorB, "vec4", vertexCount * 2);
  const hist = storage(desc.history, "vec4", rows * desc.maxParticles);
  const sMeta = storage(
    desc.meta,
    "uint",
    Math.max(1, desc.meta.array.length)
  ).toAtomic();
  const pColor = storage(desc.particleColor, "vec4", desc.maxParticles);
  const sCD = buffer(curveData, "float", curveData.length);
  const lookupCurve = createCurveLookup(sCD);
  const halfWidthBase = float(desc.width * 0.5);
  const kernel = Fn(() => {
    const idx = instanceIndex;
    const lf = float(L);
    const rowF = float(rows);
    const i = floor(float(idx).div(lf));
    const s = float(idx).sub(i.mul(lf));
    If(i.lessThan(float(desc.maxParticles)), () => {
      const base = i.mul(rowF);
      const cursor = float(
        atomicLoad(sMeta.element(i.mul(float(2))))
      ).toVar();
      const count = float(
        atomicLoad(sMeta.element(i.mul(float(2)).add(float(1))))
      ).toVar();
      If(count.greaterThan(float(0.5)), () => {
        const raw = cursor.sub(s).add(lf);
        const si = raw.sub(floor(raw.div(lf)).mul(lf));
        const sample = hist.element(base.add(si)).toVar();
        const nextRaw = si.add(float(1));
        const ni = nextRaw.sub(floor(nextRaw.div(lf)).mul(lf));
        const nextSample = hist.element(base.add(ni)).toVar();
        const t = count.greaterThan(float(1.5)).select(s.div(max(count.sub(float(1)), float(1))), float(0));
        const wScale = lookupCurve({
          curveIndex: float(IDX_WIDTH),
          t
        });
        const oScale = lookupCurve({
          curveIndex: float(IDX_OPACITY),
          t
        });
        const cr = lookupCurve({ curveIndex: float(IDX_CR), t });
        const cg = lookupCurve({ curveIndex: float(IDX_CG), t });
        const cb = lookupCurve({ curveIndex: float(IDX_CB), t });
        const pcol = pColor.element(i).toVar();
        const inRange = s.lessThan(count);
        const ageOk = desc.maxTime > 0 ? uNowMs.sub(sample.w).lessThanEqual(float(desc.maxTime)) : inRange;
        const alive = inRange.and(ageOk);
        const hw = alive.select(halfWidthBase.mul(wScale), float(0));
        const alpha = alive.select(oScale.mul(pcol.w), float(0));
        const nPos = count.greaterThan(float(1.5)).select(nextSample.xyz, sample.xyz);
        for (let side = 0; side < 2; side++) {
          const vi = float(idx).mul(float(2)).add(float(side));
          aPos.element(vi).assign(
            vec4(sample.x, sample.y, sample.z, hw)
          );
          aNext.element(vi).assign(
            vec4(nPos.x, nPos.y, nPos.z, alpha)
          );
          aUVA.element(vi).assign(
            vec4(float(side), t, cr.mul(pcol.x), cg.mul(pcol.y))
          );
          aColB.element(vi).assign(
            vec4(cb.mul(pcol.z), alpha, float(0), float(0))
          );
        }
      });
    });
  });
  const ribbonNode = compute(kernel(), vertexCount);
  return {
    ribbonNode,
    // 4 ribbon streams + history + meta + particle color = 7 storage bindings.
    passLayouts: [
      { name: "trail-ribbon", storageBindings: 7, uniformBindings: 2 }
    ],
    uniforms: { nowMs: uNowMs },
    buffers: {
      position: desc.position,
      next: desc.next,
      uvColorA: desc.uvColorA,
      colorB: desc.colorB,
      history: desc.history
    }
  };
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
      min(floor(lifePercent.mul(totalFrames)), totalFrames.sub(1)),
      float(0)
    );
    const fpsResult = uFps.equal(0).select(float(0), fpsBased);
    const frameOffset = uUseFPSForFrameIndex.greaterThan(0.5).select(fpsResult, lifetimeBased);
    return round(vStartFrame).add(frameOffset);
  }
);
var computeSpriteSheetUV = Fn(
  ({ baseUV, frameIndex, uTiles }) => {
    const spriteX = floor(mod(frameIndex, uTiles.x));
    const spriteY = floor(mod(frameIndex.div(uTiles.x), uTiles.y));
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
  const aPosPacked = attribute("position", "vec4");
  const aNextPacked = attribute("trailNext", "vec4");
  const aUvColorA = attribute("trailUVColor", "vec4");
  const aColorBA = attribute("trailColorBA", "vec4");
  const aTrailAlpha = aNextPacked.w;
  const aTrailColor = vec4(aUvColorA.z, aUvColorA.w, aColorBA.x, aColorBA.y);
  const aTrailOffset = aUvColorA.x.sub(float(0.5));
  const aTrailHalfWidth = aPosPacked.w;
  const aTrailNext = vec3(aNextPacked.x, aNextPacked.y, aNextPacked.z);
  const aTrailUV = vec2(aUvColorA.x, aUvColorA.y);
  const vAlpha = varyingProperty("float", "vAlpha");
  const vColor = varyingProperty("vec4", "vColor");
  const vUv = varyingProperty("vec2", "vUv");
  const vViewZ = varyingProperty("float", "vViewZ");
  const positionNode = Fn(() => {
    vAlpha.assign(aTrailAlpha);
    vColor.assign(aTrailColor);
    vUv.assign(aTrailUV);
    const current = vec3(aPosPacked.x, aPosPacked.y, aPosPacked.z);
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
var shapeKindOf = (t) => {
  switch (t) {
    case "SPHERE":
      return 0;
    case "CONE":
      return 1;
    case "CIRCLE":
      return 2;
    case "RECTANGLE":
      return 3;
    case "BOX":
      return 4;
    default:
      return 0;
  }
};
var boxEmitFromOf = (e) => e === "SHELL" ? 1 : e === "EDGE" ? 2 : 0;
function encodeShapeEmitParams(normalizedConfig, particleSystemId) {
  const bakedCurves = bakeParticleSystemCurves(normalizedConfig, particleSystemId);
  const pairLocal = pair;
  const [lifeMin, lifeMax] = pairLocal(normalizedConfig.startLifetime);
  const [spdMin, spdMax] = pairLocal(normalizedConfig.startSpeed);
  const [szMin, szMax] = pairLocal(normalizedConfig.startSize);
  const [rotMin, rotMax] = pairLocal(normalizedConfig.startRotation);
  const [opMin, opMax] = pairLocal(normalizedConfig.startOpacity);
  const cMin = normalizedConfig.startColor.min || { r: 1, g: 1, b: 1 };
  const cMax = normalizedConfig.startColor.max || { r: 1, g: 1, b: 1 };
  const sf = normalizedConfig.textureSheetAnimation && normalizedConfig.textureSheetAnimation.startFrame || 0;
  const sfPair = pairLocal(sf);
  const shp = normalizedConfig.shape;
  const sph = shp.sphere;
  const cone = shp.cone;
  const circ = shp.circle;
  const rect = shp.rectangle;
  const bx = shp.box;
  const num = (v, fallback) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
  const kind = shapeKindOf(shp.shape);
  return {
    shapeKind: kind,
    radius: shp.shape === "CONE" ? num(cone?.radius, 1) : shp.shape === "CIRCLE" ? num(circ?.radius, 1) : num(sph?.radius, 1),
    radiusThickness: shp.shape === "CONE" ? num(cone?.radiusThickness, 1) : shp.shape === "CIRCLE" ? num(circ?.radiusThickness, 1) : num(sph?.radiusThickness, 1),
    arcDeg: shp.shape === "CONE" ? num(cone?.arc, 360) : shp.shape === "CIRCLE" ? num(circ?.arc, 360) : num(sph?.arc, 360),
    coneAngleDeg: num(cone?.angle, 90),
    rectangleRotXDeg: num(rect?.rotation?.x, 0),
    rectangleRotYDeg: num(rect?.rotation?.y, 0),
    rectangleScaleX: num(rect?.scale?.x, 1),
    rectangleScaleY: num(rect?.scale?.y, 1),
    boxScaleX: num(bx?.scale?.x, 1),
    boxScaleY: num(bx?.scale?.y, 1),
    boxScaleZ: num(bx?.scale?.z, 1),
    boxEmitFrom: boxEmitFromOf(bx?.emitFrom),
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
    // Separate rotationOverLifetime range (never the startRotation pair).
    rotOverLifeMin: (() => {
      const rol = normalizedConfig.rotationOverLifetime;
      return typeof rol?.min === "number" && Number.isFinite(rol.min) ? rol.min : 0;
    })(),
    rotOverLifeMax: (() => {
      const rol = normalizedConfig.rotationOverLifetime;
      return typeof rol?.max === "number" && Number.isFinite(rol.max) ? rol.max : 0;
    })(),
    noiseOctaves: num(normalizedConfig.noise?.octaves, 1),
    noiseUseRandomOffset: !!normalizedConfig.noise?.useRandomOffset,
    rotationCurveActive: normalizedConfig.rotationOverLifetime.isActive,
    rotationalXCurve: bakedCurves.orbitalVelX ?? -1,
    rotationalYCurve: bakedCurves.orbitalVelY ?? -1,
    rotationalZCurve: bakedCurves.orbitalVelZ ?? -1,
    linearXCurve: bakedCurves.linearVelX ?? -1,
    linearYCurve: bakedCurves.linearVelY ?? -1,
    linearZCurve: bakedCurves.linearVelZ ?? -1
  };
}
function createComputePipeline(maxParticles, instanced, normalizedConfig, particleSystemId, forceFieldCount, collisionPlaneCount = 0, subFifos, trailDesc) {
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
  const shapeParams = encodeShapeEmitParams(
    normalizedConfig,
    particleSystemId
  );
  const velocityValues = {
    linear: [v.linear.x, v.linear.y, v.linear.z],
    orbital: [
      v.orbital.x,
      v.orbital.y,
      v.orbital.z
    ]
  };
  if (trailDesc && !trailDesc.meta) {
    trailDesc.meta = new StorageBufferAttribute(
      new Uint32Array(Math.max(1, maxParticles) * 2),
      1
    );
  }
  const built = createModifierStorageBuffers(
    maxParticles,
    instanced,
    bakedCurves.data,
    flags.forceFields,
    flags.collisionPlanes,
    trailDesc ? trailDesc.length : 0
  );
  if (trailDesc && built.buffers.trailMeta) {
    trailDesc.meta = built.buffers.trailMeta;
  }
  return createModifierComputeUpdate(
    built.buffers,
    maxParticles,
    bakedCurves,
    flags,
    shapeParams,
    forceFieldCount,
    collisionPlaneCount,
    subFifos ?? [],
    trailDesc,
    velocityValues
  );
}

// src/webgpu.ts
function enableWebGPU(renderer) {
  const factory = {
    createTSLParticleMaterial,
    createTSLTrailMaterial,
    createComputePipeline,
    encodeForceFieldsForGPU,
    encodeCollisionPlanesForGPU,
    createSubEmitterFifoAttribute,
    createSubEmitterInitUpdate,
    createTrailRibbonUpdate,
    encodeShapeEmitParams
  };
  return registerTSLMaterialFactory(
    factory,
    renderer !== void 0 ? { renderer } : void 0
  );
}

export { createComputePipeline, createModifierStorageBuffers, createSubEmitterFifoAttribute, createSubEmitterInitUpdate, createTSLParticleMaterial, createTSLTrailMaterial, createTrailRibbonUpdate, enableWebGPU, encodeCollisionPlanesForGPU, encodeForceFieldsForGPU, encodeShapeEmitParams, subEmitterWindowSize };
//# sourceMappingURL=webgpu.js.map
//# sourceMappingURL=webgpu.js.map