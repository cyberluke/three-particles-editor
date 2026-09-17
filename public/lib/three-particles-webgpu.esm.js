import { registerTSLMaterialFactory } from '@cyberluke/three-particles';
import { Fn, mod, float, floor, dot, vec3, step, min, max, vec4, vec2, abs, round, If, texture, screenUV, smoothstep, cross, attribute, modelViewMatrix, positionLocal, length, varyingProperty, pointUV, cos, sin, Discard, normalLocal, cameraProjectionMatrix, uv, uniform, normalize, cameraPosition, cameraViewMatrix, mix, storage, instanceIndex, compute, fract, Loop, Continue } from 'three/tsl';
import * as THREE from 'three';
import { DoubleSide, Vector3, DataTexture } from 'three';
import { PointsNodeMaterial, MeshBasicNodeMaterial, StorageBufferAttribute, StorageInstancedBufferAttribute } from 'three/webgpu';

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
      bezierPoints.find((point, index) => {
        const result = percentage < (point.percentage ?? 0);
        if (result) stop = index;
        else if (point.percentage !== void 0) start = index;
        return result;
      });
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

// src/js/effects/three-particles/webgpu/compute-modifiers.ts
var INIT_STRIDE = 28;
function createModifierStorageBuffers(maxParticles, instanced, curveData, hasForceFields = false, hasCollisionPlanes = false) {
  const Cls = instanced ? StorageInstancedBufferAttribute : StorageBufferAttribute;
  const curveLen = Math.max(curveData.length, 1);
  const ffSize = hasForceFields ? FORCE_FIELD_DATA_SIZE : 0;
  const cpSize = hasCollisionPlanes ? COLLISION_PLANE_DATA_SIZE : 0;
  const totalLen = curveLen + maxParticles * INIT_STRIDE + ffSize + cpSize;
  const combined = new Float32Array(totalLen);
  combined.set(curveData.length > 0 ? curveData : new Float32Array([0]));
  return {
    // Position and velocity use vec4 (w=padding) to avoid WebGPU vec3???vec4
    // storage buffer alignment conversion that breaks itemSize-based type resolution.
    position: new Cls(new Float32Array(maxParticles * 4), 4),
    velocity: new StorageBufferAttribute(new Float32Array(maxParticles * 4), 4),
    color: new Cls(new Float32Array(maxParticles * 4), 4),
    // (lifetime, size, rotation, startFrame)
    particleState: new Cls(new Float32Array(maxParticles * 4), 4),
    // (startLifetime, startSize, startOpacity, startColorR)
    startValues: new Cls(new Float32Array(maxParticles * 4), 4),
    // (startColorG, startColorB, rotationSpeed, noiseOffset)
    startColorsExt: new StorageBufferAttribute(
      new Float32Array(maxParticles * 4),
      4
    ),
    // (orbitalOffset.x, .y, .z, isActive)
    orbitalIsActive: new StorageBufferAttribute(
      new Float32Array(maxParticles * 4),
      4
    ),
    // Curve data + emit queue tail (single buffer, 8th binding)
    curveData: new StorageBufferAttribute(combined, 1)
  };
}
var _emitCounts = /* @__PURE__ */ new WeakMap();
var _curveDataLengths = /* @__PURE__ */ new WeakMap();
var _currentEmitIndices = /* @__PURE__ */ new WeakMap();
var _previousEmitIndices = /* @__PURE__ */ new WeakMap();
function writeParticleToModifierBuffers(buffers, index, data) {
  const curveLen = _curveDataLengths.get(buffers.curveData) ?? 0;
  const arr = buffers.curveData.array;
  const base = curveLen + index * INIT_STRIDE;
  arr[base] = data.position.x;
  arr[base + 1] = data.position.y;
  arr[base + 2] = data.position.z;
  arr[base + 3] = 1;
  arr[base + 4] = data.velocity.x;
  arr[base + 5] = data.velocity.y;
  arr[base + 6] = data.velocity.z;
  arr[base + 7] = 0;
  arr[base + 8] = data.colorR;
  arr[base + 9] = data.colorG;
  arr[base + 10] = data.colorB;
  arr[base + 11] = data.colorA;
  arr[base + 12] = 0;
  arr[base + 13] = data.size;
  arr[base + 14] = data.rotation;
  arr[base + 15] = data.startFrame;
  arr[base + 16] = data.orbitalOffset.x;
  arr[base + 17] = data.orbitalOffset.y;
  arr[base + 18] = data.orbitalOffset.z;
  arr[base + 19] = 1;
  arr[base + 20] = data.startLifetime;
  arr[base + 21] = data.startSize;
  arr[base + 22] = data.startOpacity;
  arr[base + 23] = data.startColorR;
  arr[base + 24] = data.startColorG;
  arr[base + 25] = data.startColorB;
  arr[base + 26] = data.rotationSpeed;
  arr[base + 27] = data.noiseOffset;
  _emitCounts.set(
    buffers.curveData,
    (_emitCounts.get(buffers.curveData) ?? 0) + 1
  );
  let indices = _currentEmitIndices.get(buffers.curveData);
  if (!indices) {
    indices = [];
    _currentEmitIndices.set(buffers.curveData, indices);
  }
  indices.push(index);
  const i4 = index * 4;
  const svArr = buffers.startValues.array;
  svArr[i4] = data.startLifetime;
  svArr[i4 + 1] = data.startSize;
  svArr[i4 + 2] = data.startOpacity;
  svArr[i4 + 3] = data.startColorR;
  const sceArr = buffers.startColorsExt.array;
  sceArr[i4] = data.startColorG;
  sceArr[i4 + 1] = data.startColorB;
  sceArr[i4 + 2] = data.rotationSpeed;
  sceArr[i4 + 3] = data.noiseOffset;
}
function registerCurveDataLength(buffers, curveDataLength) {
  _curveDataLengths.set(buffers.curveData, curveDataLength);
}
function flushEmitQueue(buffers) {
  const count = _emitCounts.get(buffers.curveData) ?? 0;
  const curveLen = _curveDataLengths.get(buffers.curveData) ?? 0;
  const arr = buffers.curveData.array;
  const current = _currentEmitIndices.get(buffers.curveData);
  const previous = _previousEmitIndices.get(buffers.curveData);
  let clearedAny = false;
  if (previous && previous.length > 0) {
    const currentSet = current && current.length > 0 ? new Set(current) : null;
    for (let i = 0; i < previous.length; i++) {
      const p = previous[i];
      if (!currentSet || !currentSet.has(p)) {
        const flagOffset = curveLen + p * INIT_STRIDE + 3;
        if (arr[flagOffset] > 0.5) {
          arr[flagOffset] = 0;
          buffers.curveData.addUpdateRange(flagOffset, 1);
          clearedAny = true;
        }
      }
    }
  }
  if (current && current.length > 0) {
    for (let i = 0; i < current.length; i++) {
      const p = current[i];
      const slotStart = curveLen + p * INIT_STRIDE;
      buffers.curveData.addUpdateRange(slotStart, INIT_STRIDE);
    }
  }
  if (count > 0 || clearedAny) {
    buffers.curveData.needsUpdate = true;
  }
  if (current && current.length > 0) {
    let prevArr = _previousEmitIndices.get(buffers.curveData);
    if (!prevArr) {
      prevArr = [];
      _previousEmitIndices.set(buffers.curveData, prevArr);
    }
    prevArr.length = current.length;
    for (let i = 0; i < current.length; i++) {
      prevArr[i] = current[i];
    }
    current.length = 0;
  } else {
    const prevArr = _previousEmitIndices.get(buffers.curveData);
    if (prevArr) prevArr.length = 0;
    if (current) current.length = 0;
  }
  _emitCounts.set(buffers.curveData, 0);
  return count;
}
function deactivateParticleInModifierBuffers(buffers, index) {
  const oiaArr = buffers.orbitalIsActive.array;
  const oiaWOffset = index * 4 + 3;
  if (oiaArr[oiaWOffset] !== 0) {
    oiaArr[oiaWOffset] = 0;
    buffers.orbitalIsActive.addUpdateRange(oiaWOffset, 1);
    buffers.orbitalIsActive.needsUpdate = true;
  }
  const colorArr = buffers.color.array;
  const colorAOffset = index * 4 + 3;
  if (colorArr[colorAOffset] !== 0) {
    colorArr[colorAOffset] = 0;
    buffers.color.addUpdateRange(colorAOffset, 1);
    buffers.color.needsUpdate = true;
  }
}
function createCurveLookup(sCurveData) {
  return Fn(
    ({
      curveIndex,
      t
    }) => {
      const clamped = min(t, float(1));
      const pos = clamped.mul(CURVE_RESOLUTION - 1);
      const idx0 = floor(pos);
      const f = fract(pos);
      const base = curveIndex.mul(CURVE_RESOLUTION);
      const v0 = sCurveData.element(base.add(idx0));
      const v1 = sCurveData.element(
        base.add(min(idx0.add(1), float(CURVE_RESOLUTION - 1)))
      );
      return mix(v0, v1, f);
    }
  );
}
function createModifierComputeUpdate(buffers, maxParticles, curveMap, flags, forceFieldCount = 0, collisionPlaneCount = 0) {
  const uDelta = uniform(float(0));
  const uDeltaMs = uniform(float(0));
  const uGravityVelocity = uniform(new Vector3(0, 0, 0));
  const uNoiseStrength = uniform(float(0));
  const uNoisePower = uniform(float(0));
  const uNoiseFrequency = uniform(float(1));
  const uNoisePosAmount = uniform(float(0));
  const uNoiseRotAmount = uniform(float(0));
  const uNoiseSizeAmount = uniform(float(0));
  const sPosition = storage(buffers.position, "vec4", maxParticles);
  const sVelocity = storage(buffers.velocity, "vec4", maxParticles);
  const sColor = storage(buffers.color, "vec4", maxParticles);
  const sParticleState = storage(buffers.particleState, "vec4", maxParticles);
  const sStartValues = storage(buffers.startValues, "vec4", maxParticles);
  const sStartColorsExt = storage(buffers.startColorsExt, "vec4", maxParticles);
  const sOrbitalIsActive = storage(
    buffers.orbitalIsActive,
    "vec4",
    maxParticles
  );
  const sCurveData = storage(
    buffers.curveData,
    "float",
    buffers.curveData.array.length
  );
  const curveLen = Math.max(curveMap.data.length, 1);
  const lookupCurve = createCurveLookup(sCurveData);
  const forceFieldOffset = curveLen + maxParticles * INIT_STRIDE;
  const forceFieldNodes = flags.forceFields ? createForceFieldTSL(sCurveData, forceFieldOffset, forceFieldCount) : null;
  const ffSize = flags.forceFields ? FORCE_FIELD_DATA_SIZE : 0;
  const collisionPlaneOffset = forceFieldOffset + ffSize;
  const collisionPlaneNodes = flags.collisionPlanes ? createCollisionPlaneTSL(
    sCurveData,
    collisionPlaneOffset,
    collisionPlaneCount
  ) : null;
  const computeKernel = Fn(() => {
    const i = instanceIndex;
    If(i.lessThan(float(maxParticles)), () => {
      const initBase = i.mul(INIT_STRIDE).add(curveLen);
      const initFlag = sCurveData.element(initBase.add(3));
      If(initFlag.greaterThan(0.5), () => {
        sPosition.element(i).assign(
          vec4(
            sCurveData.element(initBase),
            sCurveData.element(initBase.add(1)),
            sCurveData.element(initBase.add(2)),
            0
          )
        );
        sVelocity.element(i).assign(
          vec4(
            sCurveData.element(initBase.add(4)),
            sCurveData.element(initBase.add(5)),
            sCurveData.element(initBase.add(6)),
            0
          )
        );
        sColor.element(i).assign(
          vec4(
            sCurveData.element(initBase.add(8)),
            sCurveData.element(initBase.add(9)),
            sCurveData.element(initBase.add(10)),
            sCurveData.element(initBase.add(11))
          )
        );
        sParticleState.element(i).assign(
          vec4(
            sCurveData.element(initBase.add(12)),
            sCurveData.element(initBase.add(13)),
            sCurveData.element(initBase.add(14)),
            sCurveData.element(initBase.add(15))
          )
        );
        sOrbitalIsActive.element(i).assign(
          vec4(
            sCurveData.element(initBase.add(16)),
            sCurveData.element(initBase.add(17)),
            sCurveData.element(initBase.add(18)),
            sCurveData.element(initBase.add(19))
          )
        );
        sStartValues.element(i).assign(
          vec4(
            sCurveData.element(initBase.add(20)),
            sCurveData.element(initBase.add(21)),
            sCurveData.element(initBase.add(22)),
            sCurveData.element(initBase.add(23))
          )
        );
        sStartColorsExt.element(i).assign(
          vec4(
            sCurveData.element(initBase.add(24)),
            sCurveData.element(initBase.add(25)),
            sCurveData.element(initBase.add(26)),
            sCurveData.element(initBase.add(27))
          )
        );
        sCurveData.element(initBase.add(3)).assign(float(0));
      });
      const oiaVec = sOrbitalIsActive.element(i).toVar();
      If(oiaVec.w.greaterThanEqual(float(0.5)), () => {
        const pos = sPosition.element(i).xyz.toVar();
        const vel = sVelocity.element(i).xyz.toVar();
        const ps = sParticleState.element(i).toVar();
        const sv = sStartValues.element(i);
        ps.x;
        const startLife = sv.x;
        vel.assign(vel.sub(vec3(uGravityVelocity).mul(uDelta)));
        if (forceFieldNodes) {
          forceFieldNodes.apply({ pos, vel, delta: uDelta });
        }
        pos.assign(pos.add(vel.mul(uDelta)));
        if (collisionPlaneNodes) {
          collisionPlaneNodes.apply({
            pos,
            vel,
            oiaVec,
            sColorNode: sColor,
            ps,
            startLife,
            particleIdx: i,
            sOrbitalIsActiveNode: sOrbitalIsActive
          });
        }
        const lifePct = min(ps.x.div(startLife), float(1));
        ps.x.assign(ps.x.add(uDeltaMs));
        if (flags.linearVelocity) {
          const lvx = curveMap.linearVelX >= 0 ? lookupCurve({
            curveIndex: float(curveMap.linearVelX),
            t: lifePct
          }) : float(0);
          const lvy = curveMap.linearVelY >= 0 ? lookupCurve({
            curveIndex: float(curveMap.linearVelY),
            t: lifePct
          }) : float(0);
          const lvz = curveMap.linearVelZ >= 0 ? lookupCurve({
            curveIndex: float(curveMap.linearVelZ),
            t: lifePct
          }) : float(0);
          pos.assign(pos.add(vec3(lvx, lvy, lvz).mul(uDelta)));
        }
        if (flags.orbitalVelocity) {
          const offset = vec3(oiaVec.x, oiaVec.y, oiaVec.z).toVar();
          pos.assign(pos.sub(offset));
          const ovx = curveMap.orbitalVelX >= 0 ? lookupCurve({
            curveIndex: float(curveMap.orbitalVelX),
            t: lifePct
          }) : float(0);
          const ovy = curveMap.orbitalVelY >= 0 ? lookupCurve({
            curveIndex: float(curveMap.orbitalVelY),
            t: lifePct
          }) : float(0);
          const ovz = curveMap.orbitalVelZ >= 0 ? lookupCurve({
            curveIndex: float(curveMap.orbitalVelZ),
            t: lifePct
          }) : float(0);
          const ax = ovx.mul(uDelta);
          const ay = ovz.mul(uDelta);
          const az = ovy.mul(uDelta);
          const cosAz = cos(az);
          const sinAz = sin(az);
          const zx = offset.x.mul(cosAz).sub(offset.y.mul(sinAz));
          const zy = offset.x.mul(sinAz).add(offset.y.mul(cosAz));
          const zz = offset.z;
          const cosAy = cos(ay);
          const sinAy = sin(ay);
          const yx = zx.mul(cosAy).add(zz.mul(sinAy));
          const yy = zy;
          const yz = zx.negate().mul(sinAy).add(zz.mul(cosAy));
          const cosAx = cos(ax);
          const sinAx = sin(ax);
          const fx = yx;
          const fy = yy.mul(cosAx).sub(yz.mul(sinAx));
          const fz = yy.mul(sinAx).add(yz.mul(cosAx));
          offset.assign(vec3(fx, fy, fz));
          oiaVec.x.assign(offset.x);
          oiaVec.y.assign(offset.y);
          oiaVec.z.assign(offset.z);
          pos.assign(pos.add(offset));
        }
        if (flags.sizeOverLifetime && curveMap.sizeOverLifetime >= 0) {
          const multiplier = lookupCurve({
            curveIndex: float(curveMap.sizeOverLifetime),
            t: lifePct
          });
          ps.y.assign(sv.y.mul(multiplier));
        }
        if (flags.opacityOverLifetime && curveMap.opacityOverLifetime >= 0) {
          const multiplier = lookupCurve({
            curveIndex: float(curveMap.opacityOverLifetime),
            t: lifePct
          });
          const col = sColor.element(i).toVar();
          col.w.assign(sv.z.mul(multiplier));
          sColor.element(i).assign(col);
        }
        if (flags.colorOverLifetime) {
          const col = sColor.element(i).toVar();
          const sce = sStartColorsExt.element(i);
          if (curveMap.colorR >= 0) {
            const rMul = lookupCurve({
              curveIndex: float(curveMap.colorR),
              t: lifePct
            });
            col.x.assign(sv.w.mul(rMul));
          }
          if (curveMap.colorG >= 0) {
            const gMul = lookupCurve({
              curveIndex: float(curveMap.colorG),
              t: lifePct
            });
            col.y.assign(sce.x.mul(gMul));
          }
          if (curveMap.colorB >= 0) {
            const bMul = lookupCurve({
              curveIndex: float(curveMap.colorB),
              t: lifePct
            });
            col.z.assign(sce.y.mul(bMul));
          }
          sColor.element(i).assign(col);
        }
        if (flags.rotationOverLifetime) {
          const sce = sStartColorsExt.element(i);
          ps.z.assign(ps.z.add(sce.z.mul(uDelta).mul(float(0.02))));
        }
        if (flags.noise) {
          const sce = sStartColorsExt.element(i);
          const noisePos = lifePct.add(sce.w).mul(10).mul(uNoiseStrength).mul(uNoiseFrequency);
          const noiseX = snoise3D({ v: vec3(noisePos, float(0), float(0)) });
          const noiseY = snoise3D({
            v: vec3(noisePos, noisePos, float(0))
          });
          const noiseZ = snoise3D({
            v: vec3(noisePos, noisePos, noisePos)
          });
          pos.assign(
            pos.add(
              vec3(noiseX, noiseY, noiseZ).mul(uNoisePower).mul(uNoisePosAmount)
            )
          );
          If(uNoiseRotAmount.greaterThan(1e-3), () => {
            ps.z.assign(ps.z.add(noiseX.mul(uNoisePower).mul(uNoiseRotAmount)));
          });
          If(uNoiseSizeAmount.greaterThan(1e-3), () => {
            ps.y.assign(
              ps.y.add(noiseX.mul(uNoisePower).mul(uNoiseSizeAmount))
            );
          });
        }
        sPosition.element(i).assign(vec4(pos, 0));
        sVelocity.element(i).assign(vec4(vel, 0));
        sParticleState.element(i).assign(ps);
        sOrbitalIsActive.element(i).assign(oiaVec);
        If(ps.x.greaterThan(startLife), () => {
          const deadOia = sOrbitalIsActive.element(i).toVar();
          deadOia.w.assign(float(0));
          sOrbitalIsActive.element(i).assign(deadOia);
          sColor.element(i).assign(vec4(0));
        });
      });
    });
  });
  const computeNode = compute(computeKernel(), maxParticles);
  return {
    computeNode,
    uniforms: {
      delta: uDelta,
      deltaMs: uDeltaMs,
      gravityVelocity: uGravityVelocity,
      noiseStrength: uNoiseStrength,
      noisePower: uNoisePower,
      noiseFrequency: uNoiseFrequency,
      noisePositionAmount: uNoisePosAmount,
      noiseRotationAmount: uNoiseRotAmount,
      noiseSizeAmount: uNoiseSizeAmount
    },
    buffers,
    curveDataLength: curveLen,
    /** Force field offset and count uniform (null if no force fields). */
    forceFieldInfo: forceFieldNodes ? {
      offset: forceFieldOffset,
      countUniform: forceFieldNodes.countUniform
    } : null,
    /** Collision plane offset and count uniform (null if no collision planes). */
    collisionPlaneInfo: collisionPlaneNodes ? {
      offset: collisionPlaneOffset,
      countUniform: collisionPlaneNodes.countUniform
    } : null
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
      return createInstancedBillboardTSLMaterial(
        sharedUniforms,
        rendererConfig,
        gpuCompute
      );
    case "MESH" /* MESH */:
      return createMeshParticleTSLMaterial(
        sharedUniforms,
        rendererConfig,
        gpuCompute
      );
    case "POINTS" /* POINTS */:
    default:
      return createPointSpriteTSLMaterial(
        sharedUniforms,
        rendererConfig,
        gpuCompute
      );
  }
}
function createTSLTrailMaterial(trailUniforms, rendererConfig) {
  return createTrailRibbonTSLMaterial(trailUniforms, rendererConfig);
}
function createComputePipeline(maxParticles, instanced, normalizedConfig, particleSystemId, forceFieldCount, collisionPlaneCount = 0) {
  const bakedCurves = bakeParticleSystemCurves(
    normalizedConfig,
    particleSystemId
  );
  const { velocityOverLifetime } = normalizedConfig;
  const flags = {
    sizeOverLifetime: normalizedConfig.sizeOverLifetime.isActive,
    opacityOverLifetime: normalizedConfig.opacityOverLifetime.isActive,
    colorOverLifetime: normalizedConfig.colorOverLifetime.isActive,
    rotationOverLifetime: normalizedConfig.rotationOverLifetime.isActive,
    linearVelocity: velocityOverLifetime.isActive && (isLifeTimeCurve(velocityOverLifetime.linear.x ?? 0) || isLifeTimeCurve(velocityOverLifetime.linear.y ?? 0) || isLifeTimeCurve(velocityOverLifetime.linear.z ?? 0) || velocityOverLifetime.linear.x !== 0 || velocityOverLifetime.linear.y !== 0 || velocityOverLifetime.linear.z !== 0),
    orbitalVelocity: velocityOverLifetime.isActive && (isLifeTimeCurve(velocityOverLifetime.orbital.x ?? 0) || isLifeTimeCurve(velocityOverLifetime.orbital.y ?? 0) || isLifeTimeCurve(velocityOverLifetime.orbital.z ?? 0) || velocityOverLifetime.orbital.x !== 0 || velocityOverLifetime.orbital.y !== 0 || velocityOverLifetime.orbital.z !== 0),
    noise: normalizedConfig.noise.isActive,
    forceFields: forceFieldCount > 0,
    collisionPlanes: collisionPlaneCount > 0
  };
  const buffers = createModifierStorageBuffers(
    maxParticles,
    instanced,
    bakedCurves.data,
    flags.forceFields,
    flags.collisionPlanes
  );
  return createModifierComputeUpdate(
    buffers,
    maxParticles,
    bakedCurves,
    flags,
    forceFieldCount,
    collisionPlaneCount
  );
}

// src/webgpu.ts
function enableWebGPU() {
  const factory = {
    createTSLParticleMaterial,
    createTSLTrailMaterial,
    createComputePipeline,
    writeParticleToModifierBuffers,
    deactivateParticleInModifierBuffers,
    flushEmitQueue,
    registerCurveDataLength,
    encodeForceFieldsForGPU,
    encodeCollisionPlanesForGPU
  };
  registerTSLMaterialFactory(factory);
}

export { createComputePipeline, createTSLParticleMaterial, createTSLTrailMaterial, deactivateParticleInModifierBuffers, enableWebGPU, encodeCollisionPlanesForGPU, encodeForceFieldsForGPU, flushEmitQueue, registerCurveDataLength, writeParticleToModifierBuffers };
//# sourceMappingURL=webgpu.js.map
//# sourceMappingURL=webgpu.js.map