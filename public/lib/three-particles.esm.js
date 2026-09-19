import Easing from './easing-functions.js?v=11';
import * as THREE3 from './three.module.js?v=11';
import { ObjectUtils } from './three-utils/index.js?v=11';
import { StorageBufferAttribute } from './three.webgpu.js?v=11';

// src/js/effects/three-particles/version.ts
var REVISION = '4.0.0';
if (typeof globalThis !== 'undefined') {
  const g = globalThis;
  if (g.__THREE_PARTICLES__ && g.__THREE_PARTICLES__ !== REVISION) {
    console.warn('WARNING: Multiple instances of @cyberluke/three-particles being imported.');
  } else {
    g.__THREE_PARTICLES__ = REVISION;
  }
}

// src/js/effects/three-particles/color-utils.ts
var sRGBToLinear = (c) => (c < 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
var linearToSRGB = (c) => (c < 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
var rgbSRGBToLinear = (c) => ({
  r: sRGBToLinear(c.r ?? 0),
  g: sRGBToLinear(c.g ?? 0),
  b: sRGBToLinear(c.b ?? 0),
});

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
      const calculatedPercentage =
        (percentage - (bezierPoints[start].percentage ?? 0)) /
        ((bezierPoints[stop].percentage ?? 1) - (bezierPoints[start].percentage ?? 0));
      let value = 0;
      for (let i = 0; i <= n; i++) {
        const p = bezierPoints[start + i];
        const c =
          nCr(n, i) * Math.pow(1 - calculatedPercentage, n - i) * Math.pow(calculatedPercentage, i);
        value += c * p.y;
      }
      return value;
    },
  };
  cache.push(entry);
  return entry.curveFunction;
};
var removeBezierCurveFunction = (particleSystemId) => {
  while (true) {
    const index = cache.findIndex((item) => item.referencedBy.includes(particleSystemId));
    if (index === -1) break;
    const entry = cache[index];
    entry.referencedBy = entry.referencedBy.filter((id) => id !== particleSystemId);
    if (entry.referencedBy.length === 0) cache.splice(index, 1);
  }
};
var getBezierCacheSize = () => cache.length;
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

// src/js/effects/three-particles/three-particles-enums.ts
var SimulationSpace = /* @__PURE__ */ ((SimulationSpace2) => {
  SimulationSpace2['LOCAL'] = 'LOCAL';
  SimulationSpace2['WORLD'] = 'WORLD';
  return SimulationSpace2;
})(SimulationSpace || {});
var Shape = /* @__PURE__ */ ((Shape2) => {
  Shape2['SPHERE'] = 'SPHERE';
  Shape2['CONE'] = 'CONE';
  Shape2['BOX'] = 'BOX';
  Shape2['CIRCLE'] = 'CIRCLE';
  Shape2['RECTANGLE'] = 'RECTANGLE';
  return Shape2;
})(Shape || {});
var EmitFrom = /* @__PURE__ */ ((EmitFrom2) => {
  EmitFrom2['VOLUME'] = 'VOLUME';
  EmitFrom2['SHELL'] = 'SHELL';
  EmitFrom2['EDGE'] = 'EDGE';
  return EmitFrom2;
})(EmitFrom || {});
var TimeMode = /* @__PURE__ */ ((TimeMode2) => {
  TimeMode2['LIFETIME'] = 'LIFETIME';
  TimeMode2['FPS'] = 'FPS';
  return TimeMode2;
})(TimeMode || {});
var LifeTimeCurve = /* @__PURE__ */ ((LifeTimeCurve2) => {
  LifeTimeCurve2['BEZIER'] = 'BEZIER';
  LifeTimeCurve2['EASING'] = 'EASING';
  return LifeTimeCurve2;
})(LifeTimeCurve || {});
var SubEmitterTrigger = /* @__PURE__ */ ((SubEmitterTrigger3) => {
  SubEmitterTrigger3['BIRTH'] = 'BIRTH';
  SubEmitterTrigger3['DEATH'] = 'DEATH';
  return SubEmitterTrigger3;
})(SubEmitterTrigger || {});
var ForceFieldType = /* @__PURE__ */ ((ForceFieldType3) => {
  ForceFieldType3['POINT'] = 'POINT';
  ForceFieldType3['DIRECTIONAL'] = 'DIRECTIONAL';
  return ForceFieldType3;
})(ForceFieldType || {});
var RendererType = /* @__PURE__ */ ((RendererType2) => {
  RendererType2['POINTS'] = 'POINTS';
  RendererType2['INSTANCED'] = 'INSTANCED';
  RendererType2['TRAIL'] = 'TRAIL';
  RendererType2['MESH'] = 'MESH';
  return RendererType2;
})(RendererType || {});
var ForceFieldFalloff = /* @__PURE__ */ ((ForceFieldFalloff3) => {
  ForceFieldFalloff3['NONE'] = 'NONE';
  ForceFieldFalloff3['LINEAR'] = 'LINEAR';
  ForceFieldFalloff3['QUADRATIC'] = 'QUADRATIC';
  return ForceFieldFalloff3;
})(ForceFieldFalloff || {});
var CollisionPlaneMode = /* @__PURE__ */ ((CollisionPlaneMode3) => {
  CollisionPlaneMode3['KILL'] = 'KILL';
  CollisionPlaneMode3['CLAMP'] = 'CLAMP';
  CollisionPlaneMode3['BOUNCE'] = 'BOUNCE';
  return CollisionPlaneMode3;
})(CollisionPlaneMode || {});
var SimulationBackend = /* @__PURE__ */ ((SimulationBackend2) => {
  SimulationBackend2['AUTO'] = 'AUTO';
  SimulationBackend2['CPU'] = 'CPU';
  SimulationBackend2['GPU'] = 'GPU';
  return SimulationBackend2;
})(SimulationBackend || {});

// src/js/effects/three-particles/three-particles-constants.ts
var SCALAR_STRIDE = 10;
var S_IS_ACTIVE = 0;
var S_LIFETIME = 1;
var S_START_LIFETIME = 2;
var S_START_FRAME = 3;
var S_SIZE = 4;
var S_ROTATION = 5;
var S_COLOR_R = 6;
var S_COLOR_G = 7;
var S_COLOR_B = 8;
var S_COLOR_A = 9;
var calculateRandomPositionAndVelocityOnSphere = (
  position,
  quaternion,
  velocity,
  speed,
  { radius, radiusThickness, arc }
) => {
  const u = Math.random() * (arc / 360);
  const v = Math.random();
  const randomizedDistanceRatio = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const sinPhi = Math.sin(phi);
  const xDirection = sinPhi * Math.cos(theta);
  const yDirection = sinPhi * Math.sin(theta);
  const zDirection = Math.cos(phi);
  const normalizedThickness = 1 - radiusThickness;
  position.x =
    radius * normalizedThickness * xDirection +
    radius * radiusThickness * randomizedDistanceRatio * xDirection;
  position.y =
    radius * normalizedThickness * yDirection +
    radius * radiusThickness * randomizedDistanceRatio * yDirection;
  position.z =
    radius * normalizedThickness * zDirection +
    radius * radiusThickness * randomizedDistanceRatio * zDirection;
  position.applyQuaternion(quaternion);
  const speedMultiplierByPosition = 1 / position.length();
  velocity.set(
    position.x * speedMultiplierByPosition * speed,
    position.y * speedMultiplierByPosition * speed,
    position.z * speedMultiplierByPosition * speed
  );
  velocity.applyQuaternion(quaternion);
};
var calculateRandomPositionAndVelocityOnCone = (
  position,
  quaternion,
  velocity,
  speed,
  { radius, radiusThickness, arc, angle = 90 }
) => {
  const theta = 2 * Math.PI * Math.random() * (arc / 360);
  const randomizedDistanceRatio = Math.random();
  const xDirection = Math.cos(theta);
  const yDirection = Math.sin(theta);
  const normalizedThickness = 1 - radiusThickness;
  position.x =
    radius * normalizedThickness * xDirection +
    radius * radiusThickness * randomizedDistanceRatio * xDirection;
  position.y =
    radius * normalizedThickness * yDirection +
    radius * radiusThickness * randomizedDistanceRatio * yDirection;
  position.z = 0;
  position.applyQuaternion(quaternion);
  const positionLength = position.length();
  const normalizedAngle = Math.abs((positionLength / radius) * THREE3.MathUtils.degToRad(angle));
  const sinNormalizedAngle = Math.sin(normalizedAngle);
  const speedMultiplierByPosition = 1 / positionLength;
  velocity.set(
    position.x * sinNormalizedAngle * speedMultiplierByPosition * speed,
    position.y * sinNormalizedAngle * speedMultiplierByPosition * speed,
    Math.cos(normalizedAngle) * speed
  );
  velocity.applyQuaternion(quaternion);
};
var calculateRandomPositionAndVelocityOnBox = (
  position,
  quaternion,
  velocity,
  speed,
  { scale, emitFrom }
) => {
  const _scale = scale;
  switch (emitFrom) {
    case 'VOLUME' /* VOLUME */:
      position.x = Math.random() * _scale.x - _scale.x / 2;
      position.y = Math.random() * _scale.y - _scale.y / 2;
      position.z = Math.random() * _scale.z - _scale.z / 2;
      break;
    case 'SHELL' /* SHELL */:
      const side = Math.floor(Math.random() * 6);
      const perpendicularAxis = side % 3;
      const shellResult = [];
      shellResult[perpendicularAxis] = side > 2 ? 1 : 0;
      shellResult[(perpendicularAxis + 1) % 3] = Math.random();
      shellResult[(perpendicularAxis + 2) % 3] = Math.random();
      position.x = shellResult[0] * _scale.x - _scale.x / 2;
      position.y = shellResult[1] * _scale.y - _scale.y / 2;
      position.z = shellResult[2] * _scale.z - _scale.z / 2;
      break;
    case 'EDGE' /* EDGE */:
      const side2 = Math.floor(Math.random() * 6);
      const perpendicularAxis2 = side2 % 3;
      const edge = Math.floor(Math.random() * 4);
      const edgeResult = [];
      edgeResult[perpendicularAxis2] = side2 > 2 ? 1 : 0;
      edgeResult[(perpendicularAxis2 + 1) % 3] = edge < 2 ? Math.random() : edge - 2;
      edgeResult[(perpendicularAxis2 + 2) % 3] = edge < 2 ? edge : Math.random();
      position.x = edgeResult[0] * _scale.x - _scale.x / 2;
      position.y = edgeResult[1] * _scale.y - _scale.y / 2;
      position.z = edgeResult[2] * _scale.z - _scale.z / 2;
      break;
  }
  position.applyQuaternion(quaternion);
  velocity.set(0, 0, speed);
  velocity.applyQuaternion(quaternion);
};
var calculateRandomPositionAndVelocityOnCircle = (
  position,
  quaternion,
  velocity,
  speed,
  { radius, radiusThickness, arc }
) => {
  const theta = 2 * Math.PI * Math.random() * (arc / 360);
  const randomizedDistanceRatio = Math.random();
  const xDirection = Math.cos(theta);
  const yDirection = Math.sin(theta);
  const normalizedThickness = 1 - radiusThickness;
  position.x =
    radius * normalizedThickness * xDirection +
    radius * radiusThickness * randomizedDistanceRatio * xDirection;
  position.y =
    radius * normalizedThickness * yDirection +
    radius * radiusThickness * randomizedDistanceRatio * yDirection;
  position.z = 0;
  position.applyQuaternion(quaternion);
  const positionLength = position.length();
  const speedMultiplierByPosition = 1 / positionLength;
  velocity.set(
    position.x * speedMultiplierByPosition * speed,
    position.y * speedMultiplierByPosition * speed,
    0
  );
  velocity.applyQuaternion(quaternion);
};
var calculateRandomPositionAndVelocityOnRectangle = (
  position,
  quaternion,
  velocity,
  speed,
  { rotation, scale }
) => {
  const _scale = scale;
  const _rotation = rotation;
  const xOffset = Math.random() * _scale.x - _scale.x / 2;
  const yOffset = Math.random() * _scale.y - _scale.y / 2;
  const rotationX = THREE3.MathUtils.degToRad(_rotation.x);
  const rotationY = THREE3.MathUtils.degToRad(_rotation.y);
  position.x = xOffset * Math.cos(rotationY);
  position.y = yOffset * Math.cos(rotationX);
  position.z = xOffset * Math.sin(rotationY) - yOffset * Math.sin(rotationX);
  position.applyQuaternion(quaternion);
  velocity.set(0, 0, speed);
  velocity.applyQuaternion(quaternion);
};
var createDefaultMeshTexture = () => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'white';
      context.fillRect(0, 0, 1, 1);
      const texture = new THREE3.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }
    return null;
  } catch {
    return null;
  }
};
var createDefaultParticleTexture = () => {
  try {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (context) {
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 2;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
      context.fillStyle = 'white';
      context.fill();
      const texture = new THREE3.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    } else {
      console.warn('Could not get 2D context to generate default particle texture.');
      return null;
    }
  } catch (error) {
    console.warn('Error creating default particle texture:', error);
    return null;
  }
};
var isLifeTimeCurve = (value) => {
  return typeof value !== 'number' && 'type' in value;
};
var getCurveFunctionFromConfig = (particleSystemId, lifetimeCurve) => {
  if (lifetimeCurve.type === 'BEZIER' /* BEZIER */) {
    return createBezierCurveFunction(particleSystemId, lifetimeCurve.bezierPoints);
  }
  if (lifetimeCurve.type === 'EASING' /* EASING */) {
    return lifetimeCurve.curveFunction;
  }
  const raw = lifetimeCurve;
  if (Array.isArray(raw.bezierPoints)) {
    return createBezierCurveFunction(particleSystemId, raw.bezierPoints);
  }
  if (typeof raw.curveFunction === 'function') {
    return raw.curveFunction;
  }
  throw new Error(`Unsupported value type: ${lifetimeCurve}`);
};
var calculateValue = (particleSystemId, value, time = 0) => {
  if (typeof value === 'number') {
    return value;
  }
  if ('min' in value && 'max' in value) {
    if (value.min === value.max) {
      return value.min ?? 0;
    }
    return THREE3.MathUtils.randFloat(value.min ?? 0, value.max ?? 1);
  }
  const lifetimeCurve = value;
  return (
    getCurveFunctionFromConfig(particleSystemId, lifetimeCurve)(time) * (lifetimeCurve.scale ?? 1)
  );
};

// src/js/effects/three-particles/three-particles-modifiers.ts
var noiseInput = new THREE3.Vector3(0, 0, 0);
var orbitalEuler = new THREE3.Euler();
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

// src/js/effects/three-particles/three-particles-renderer-detect.ts
function isComputeCapableRenderer(renderer) {
  return (
    renderer !== null &&
    renderer !== void 0 &&
    typeof renderer === 'object' &&
    'compute' in renderer &&
    typeof renderer.compute === 'function' &&
    'hasFeature' in renderer &&
    typeof renderer.hasFeature === 'function'
  );
}
function resolveSimulationBackend(renderer, preference = 'AUTO' /* AUTO */) {
  const gpuCapable = isComputeCapableRenderer(renderer);
  if (preference === 'CPU' /* CPU */) {
    return 'CPU'; /* CPU */
  }
  if (preference === 'GPU' /* GPU */) {
    return gpuCapable ? 'GPU' /* GPU */ : 'CPU'; /* CPU */
  }
  return gpuCapable ? 'GPU' /* GPU */ : 'CPU'; /* CPU */
}
function resolveWebGPUEffectiveRendererType(requested) {
  switch (requested) {
    case 'INSTANCED' /* INSTANCED */:
      return 'INSTANCED'; /* INSTANCED */
    case 'TRAIL' /* TRAIL */:
      return 'TRAIL'; /* TRAIL */
    case 'MESH' /* MESH */:
      return 'MESH'; /* MESH */
    case 'POINTS' /* POINTS */:
    default:
      return 'POINTS'; /* POINTS */
  }
}
var _particleSystemId = 0;
var createdParticleSystems = [];
var _tslMaterialFactory = null;
var _rendererBackendIsGPU = true;
var _cpuPreferenceWarned = false;
var _cpuPreferencePreferenceWarn = () => {
  _cpuPreferenceWarned = true;
  console.warn(
    "three-particles: simulationBackend 'CPU' maps to the GPU kernel in 4.0.0 (GPU-only build)."
  );
};
var registerTSLMaterialFactory = (factory, options) => {
  if (options && 'renderer' in options && !isComputeCapableRenderer(options.renderer)) {
    console.warn(
      'three-particles: registerTSLMaterialFactory skipped ??? the provided renderer does not support compute dispatches (expected THREE.WebGPURenderer). Particle systems will use the CPU/GLSL path.'
    );
    return false;
  }
  _tslMaterialFactory = factory;
  if (options && 'renderer' in options) {
    _rendererBackendIsGPU = !!options.renderer?.backend?.isWebGPUBackend;
  } else {
    _rendererBackendIsGPU = true;
  }
  return true;
};
new THREE3.Vector3();
new THREE3.Vector3();
new THREE3.Euler(0, 0, 0, 'XYZ');
var _lastWorldPositionSnapshot = new THREE3.Vector3();
new THREE3.Vector3();
new THREE3.Vector3();
new THREE3.Quaternion();
var assertNamed = (cond, message) => {
  if (!cond) {
    throw new Error(`three-particles: ${message}`);
  }
};
var normalizeVector2Value = (raw, fallback, label) => {
  if (raw === void 0 || raw === null) {
    return new THREE3.Vector2(fallback[0], fallback[1]);
  }
  if (raw instanceof THREE3.Vector2) return raw;
  let n1;
  let n2;
  if (Array.isArray(raw)) {
    n1 = Number(raw[0]);
    n2 = Number(raw[1]);
  } else if (typeof raw === 'object') {
    const o = raw;
    n1 = o.x !== void 0 ? Number(o.x) : o.u !== void 0 ? Number(o.u) : void 0;
    n2 = o.y !== void 0 ? Number(o.y) : o.v !== void 0 ? Number(o.v) : void 0;
  }
  assertNamed(
    n1 !== void 0 && n2 !== void 0 && Number.isFinite(n1) && Number.isFinite(n2),
    `${label} must be one of: Vector2, [x,y], [u,v], {x,y} or {u,v}`
  );
  return new THREE3.Vector2(n1, n2);
};
var normalizeTextureValue = (raw, label) => {
  if (raw === void 0 || raw === null) return null;
  assertNamed(
    typeof raw === 'object' && 'image' in raw,
    `${label} must be null or a texture object with .image (got ${String(raw)})`
  );
  return raw;
};
var normalizeDepthTextureValue = (raw, label) => {
  if (raw === void 0 || raw === null) return null;
  assertNamed(
    typeof raw === 'object' && 'image' in raw,
    `${label} must be a texture object with .image when set (got ${String(raw)})`
  );
  return raw;
};
var normalizeBackgroundToVector3 = (raw, label) => {
  if (raw === void 0 || raw === null) return new THREE3.Vector3(1, 1, 1);
  if (typeof raw === 'number') {
    const c = new THREE3.Color(raw);
    return new THREE3.Vector3(c.r, c.g, c.b);
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    const c = new THREE3.Color(s.startsWith('#') ? s : `#${s}`);
    assertNamed(
      Number.isFinite(c.r) && Number.isFinite(c.g) && Number.isFinite(c.b),
      `${label} is not a valid hex color string`
    );
    return new THREE3.Vector3(c.r, c.g, c.b);
  }
  if (Array.isArray(raw)) {
    const [r, g, b] = raw;
    assertNamed(
      Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b),
      `${label} array must contain three finite numbers`
    );
    return new THREE3.Vector3(r, g, b);
  }
  const o = raw;
  assertNamed(
    Number.isFinite(Number(o.r)) && Number.isFinite(Number(o.g)) && Number.isFinite(Number(o.b)),
    `${label} object must provide finite r/g/b`
  );
  return new THREE3.Vector3(Number(o.r), Number(o.g), Number(o.b));
};
new THREE3.Vector3();
new THREE3.Vector3();
new THREE3.Vector3();
new THREE3.Vector3();
new THREE3.Vector3();
new THREE3.Vector2();
var toVector3 = (v, fallback) =>
  v ? new THREE3.Vector3(v.x ?? 0, v.y ?? 0, v.z ?? 0) : fallback.clone();
var normalizeForceFields = (rawForceFields) =>
  (rawForceFields ?? []).map((ff) => ({
    isActive: ff.isActive ?? true,
    type: ff.type ?? 'POINT' /* POINT */,
    position: toVector3(ff.position, new THREE3.Vector3(0, 0, 0)),
    direction: toVector3(ff.direction, new THREE3.Vector3(0, 1, 0)).normalize(),
    strength: ff.strength ?? 1,
    range: Math.max(0, ff.range ?? Infinity),
    falloff: ff.falloff ?? 'LINEAR' /* LINEAR */,
  }));
var normalizeCollisionPlanes = (rawPlanes) =>
  (rawPlanes ?? []).map((cp) => ({
    isActive: cp.isActive ?? true,
    position: toVector3(cp.position, new THREE3.Vector3(0, 0, 0)),
    normal: toVector3(cp.normal, new THREE3.Vector3(0, 1, 0)).normalize(),
    mode: cp.mode ?? 'KILL' /* KILL */,
    dampen: Math.max(0, Math.min(1, cp.dampen ?? 0.5)),
    lifetimeLoss: Math.max(0, Math.min(1, cp.lifetimeLoss ?? 0)),
  }));
var blendingMap = {
  'THREE.NoBlending': THREE3.NoBlending,
  'THREE.NormalBlending': THREE3.NormalBlending,
  'THREE.AdditiveBlending': THREE3.AdditiveBlending,
  'THREE.SubtractiveBlending': THREE3.SubtractiveBlending,
  'THREE.MultiplyBlending': THREE3.MultiplyBlending,
};
var toBlendingConstant = (v) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const key = v.startsWith('THREE.') ? v : `THREE.${v}`;
    const mapped = blendingMap[key];
    if (mapped !== void 0) return mapped;
  }
  return THREE3.NormalBlending;
};
var getDefaultParticleSystemConfig = () =>
  JSON.parse(JSON.stringify(DEFAULT_PARTICLE_SYSTEM_CONFIG));
var DEFAULT_PARTICLE_SYSTEM_CONFIG = {
  transform: {
    position: new THREE3.Vector3(),
    rotation: new THREE3.Vector3(),
    scale: new THREE3.Vector3(1, 1, 1),
  },
  duration: 5,
  looping: true,
  startDelay: 0,
  startLifetime: 5,
  startSpeed: 1,
  startSize: 1,
  startOpacity: 1,
  startRotation: 0,
  startColor: {
    min: { r: 1, g: 1, b: 1 },
    max: { r: 1, g: 1, b: 1 },
  },
  gravity: 0,
  simulationSpace: 'LOCAL' /* LOCAL */,
  simulationBackend: 'AUTO' /* AUTO */,
  maxParticles: 100,
  emission: {
    rateOverTime: 10,
    rateOverDistance: 0,
    bursts: [],
  },
  shape: {
    shape: 'SPHERE' /* SPHERE */,
    sphere: {
      radius: 1,
      radiusThickness: 1,
      arc: 360,
    },
    cone: {
      angle: 25,
      radius: 1,
      radiusThickness: 1,
      arc: 360,
    },
    circle: {
      radius: 1,
      radiusThickness: 1,
      arc: 360,
    },
    rectangle: {
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1 },
    },
    box: {
      scale: { x: 1, y: 1, z: 1 },
      emitFrom: 'VOLUME' /* VOLUME */,
    },
  },
  map: void 0,
  renderer: {
    blending: THREE3.NormalBlending,
    discardBackgroundColor: false,
    backgroundColorTolerance: 1,
    backgroundColor: { r: 1, g: 1, b: 1 },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    softParticles: {
      enabled: false,
      intensity: 1,
    },
  },
  velocityOverLifetime: {
    isActive: false,
    linear: {
      x: 0,
      y: 0,
      z: 0,
    },
    orbital: {
      x: 0,
      y: 0,
      z: 0,
    },
  },
  sizeOverLifetime: {
    isActive: false,
    lifetimeCurve: {
      type: 'BEZIER' /* BEZIER */,
      scale: 1,
      bezierPoints: [
        { x: 0, y: 0, percentage: 0 },
        { x: 1, y: 1, percentage: 1 },
      ],
    },
  },
  colorOverLifetime: {
    isActive: false,
    r: {
      type: 'BEZIER' /* BEZIER */,
      scale: 1,
      bezierPoints: [
        { x: 0, y: 1, percentage: 0 },
        { x: 1, y: 1, percentage: 1 },
      ],
    },
    g: {
      type: 'BEZIER' /* BEZIER */,
      scale: 1,
      bezierPoints: [
        { x: 0, y: 1, percentage: 0 },
        { x: 1, y: 1, percentage: 1 },
      ],
    },
    b: {
      type: 'BEZIER' /* BEZIER */,
      scale: 1,
      bezierPoints: [
        { x: 0, y: 1, percentage: 0 },
        { x: 1, y: 1, percentage: 1 },
      ],
    },
  },
  opacityOverLifetime: {
    isActive: false,
    lifetimeCurve: {
      type: 'BEZIER' /* BEZIER */,
      scale: 1,
      bezierPoints: [
        { x: 0, y: 0, percentage: 0 },
        { x: 1, y: 1, percentage: 1 },
      ],
    },
  },
  rotationOverLifetime: {
    isActive: false,
    min: 0,
    max: 0,
  },
  noise: {
    isActive: false,
    useRandomOffset: false,
    strength: 1,
    frequency: 0.5,
    octaves: 1,
    positionAmount: 1,
    rotationAmount: 0,
    sizeAmount: 0,
  },
  textureSheetAnimation: {
    tiles: new THREE3.Vector2(1, 1),
    timeMode: 'LIFETIME' /* LIFETIME */,
    fps: 30,
    startFrame: 0,
  },
  forceFields: [],
  collisionPlanes: [],
};
var destroyParticleSystem = (particleSystem) => {
  createdParticleSystems = createdParticleSystems.filter(
    ({ particleSystem: savedParticleSystem, trailMesh, generalData: { particleSystemId } }) => {
      if (savedParticleSystem !== particleSystem) {
        return true;
      }
      removeBezierCurveFunction(particleSystemId);
      if (trailMesh) {
        trailMesh.geometry.dispose();
        if (Array.isArray(trailMesh.material)) trailMesh.material.forEach((m) => m.dispose());
        else trailMesh.material.dispose();
        if (trailMesh.parent) trailMesh.parent.remove(trailMesh);
      }
      savedParticleSystem.geometry.dispose();
      if (Array.isArray(savedParticleSystem.material))
        savedParticleSystem.material.forEach((material) => material.dispose());
      else savedParticleSystem.material.dispose();
      if (savedParticleSystem.parent) savedParticleSystem.parent.remove(savedParticleSystem);
      return false;
    }
  );
};
var _defaultTexture = null;
var getDefaultTexture = () => {
  if (_defaultTexture) return _defaultTexture;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
  }
  _defaultTexture = new THREE3.Texture(canvas);
  _defaultTexture.needsUpdate = true;
  return _defaultTexture;
};
var createParticleSystem = (config = DEFAULT_PARTICLE_SYSTEM_CONFIG, externalNow) => {
  const now = externalNow || Date.now();
  const useTSL = _tslMaterialFactory !== null;
  if (!useTSL) {
    throw new Error(
      'three-particles: WebGPU TSL material factory not registered. Call enableWebGPU(renderer) immediately after creating a WebGPURenderer. @cyberluke/three-particles 4.0.0 is GPU-only - no CPU fallback path exists.'
    );
  }
  if (!_rendererBackendIsGPU) {
    throw new Error(
      'three-particles: renderer is not a native WebGPU backend. This build has no WebGL2 fallback. Use a new THREE.WebGPURenderer().'
    );
  }
  const factory = _tslMaterialFactory;
  if (!factory.createComputePipeline) {
    throw new Error(
      'three-particles: active WebGPU renderer does not provide a complete TSL compute pipeline (createComputePipeline missing). No CPU fallback exists; install a WebGPU-capable backend.'
    );
  }
  const maxParticles = config.maxParticles || DEFAULT_PARTICLE_SYSTEM_CONFIG.maxParticles;
  const normalizedConfig = ObjectUtils.deepMerge(DEFAULT_PARTICLE_SYSTEM_CONFIG, config, {
    applyToFirstObject: false,
    skippedProperties: [],
  });
  if (normalizedConfig.simulationBackend === 'CPU') {
    if (!_cpuPreferenceWarned) {
      _cpuPreferencePreferenceWarn();
    }
    normalizedConfig.simulationBackend = 'GPU'; /* GPU */
  }
  const requestedRendererType = normalizedConfig.renderer.rendererType || 'POINTS'; /* POINTS */
  const effectiveRendererType = resolveWebGPUEffectiveRendererType(requestedRendererType);
  const rrType = effectiveRendererType;
  const useInstancing =
    effectiveRendererType === 'INSTANCED' /* INSTANCED */ ||
    effectiveRendererType === 'MESH'; /* MESH */
  const trailConfig = normalizedConfig.renderer.trail;
  const trailLength = Math.max(2, Math.round(trailConfig?.length ?? 20));
  const trailHistoryAttribute =
    rrType === 'TRAIL' /* TRAIL */
      ? new StorageBufferAttribute(new Float32Array(maxParticles * (trailLength + 1) * 4), 4)
      : null;
  const trailDesc = trailHistoryAttribute
    ? {
        attribute: trailHistoryAttribute,
        meta: null,
        length: trailLength,
        minVertexDistance: trailConfig?.minVertexDistance ?? 0,
        maxTime: (trailConfig?.maxTime ?? 0) * 1e3,
      }
    : null;
  const subEmitterConfigs = normalizedConfig.subEmitters ?? [];
  const fifos = subEmitterConfigs.map((se) => {
    const capacity = Math.max(1, Math.round(se.maxInstances ?? 32));
    const f = factory.createSubEmitterFifoAttribute(capacity);
    f.trigger = se.trigger === 'BIRTH' ? 0 : 1;
    return f;
  });
  const fifoBaseStride = fifos.reduce((m, f) => Math.max(m, f.windowSize), 0);
  const forceFields = normalizeForceFields(normalizedConfig.forceFields);
  const collisionPlanes = normalizeCollisionPlanes(normalizedConfig.collisionPlanes);
  const pipeline = factory.createComputePipeline(
    maxParticles,
    useInstancing,
    normalizedConfig,
    _particleSystemId,
    // pre-increment inside generalData below would be off by 1; use the raw next id
    forceFields.length,
    collisionPlanes.length,
    fifos,
    trailDesc ?? void 0
  );
  const ribbonPipeline = trailDesc
    ? factory.createTrailRibbonUpdate({
        position: new StorageBufferAttribute(
          new Float32Array(maxParticles * trailLength * 2 * 4),
          4
        ),
        next: new StorageBufferAttribute(new Float32Array(maxParticles * trailLength * 2 * 4), 4),
        uvColorA: new StorageBufferAttribute(
          new Float32Array(maxParticles * trailLength * 2 * 4),
          4
        ),
        colorB: new StorageBufferAttribute(new Float32Array(maxParticles * trailLength * 2 * 4), 4),
        history: trailDesc.attribute,
        meta: trailDesc.meta,
        particleColor: pipeline.buffers.color,
        curveFns: {
          width: trailConfig?.widthOverTrail
            ? getCurveFunctionFromConfig(_particleSystemId, trailConfig.widthOverTrail)
            : void 0,
          opacity: trailConfig?.opacityOverTrail
            ? getCurveFunctionFromConfig(_particleSystemId, trailConfig.opacityOverTrail)
            : void 0,
          colorR: trailConfig?.colorOverTrail?.isActive
            ? getCurveFunctionFromConfig(_particleSystemId, trailConfig.colorOverTrail.r)
            : void 0,
          colorG: trailConfig?.colorOverTrail?.isActive
            ? getCurveFunctionFromConfig(_particleSystemId, trailConfig.colorOverTrail.g)
            : void 0,
          colorB: trailConfig?.colorOverTrail?.isActive
            ? getCurveFunctionFromConfig(_particleSystemId, trailConfig.colorOverTrail.b)
            : void 0,
        },
        width: trailConfig?.width ?? 1,
        length: trailLength,
        maxTime: trailDesc.maxTime,
        maxParticles,
      })
    : null;
  const subEntries = [];
  for (let fi = 0; fi < subEmitterConfigs.length; fi++) {
    const se = subEmitterConfigs[fi];
    const fifo = fifos[fi];
    const childCfg = ObjectUtils.deepMerge(getDefaultParticleSystemConfig(), se.config ?? {}, {
      applyToFirstObject: false,
      skippedProperties: [],
    });
    const firstBurst = childCfg.emission?.bursts?.[0];
    const burstCount = firstBurst
      ? Math.max(
          1,
          Math.ceil(
            calculateValue(_particleSystemId + 1 + fi, firstBurst.count, 0) *
              (firstBurst.cycles ?? 1)
          )
        )
      : 1;
    const perEvent = Math.min(burstCount, fifo.capacity);
    const childMax = Math.max(2, Math.min(perEvent * fifo.capacity, 65536));
    const childRequestedRendererType = childCfg.renderer?.rendererType;
    const childEffectiveRendererType = resolveWebGPUEffectiveRendererType(
      childRequestedRendererType
    );
    const childInstanced =
      childEffectiveRendererType === 'INSTANCED' /* INSTANCED */ ||
      childEffectiveRendererType === 'MESH'; /* MESH */
    const childPipeline = factory.createComputePipeline(
      childMax,
      childInstanced,
      childCfg,
      _particleSystemId + 1 + fi,
      0,
      0,
      [],
      void 0
    );
    const childShapeParams = factory.encodeShapeEmitParams(childCfg, _particleSystemId + 1 + fi);
    const childVel = childCfg.velocityOverLifetime;
    const init = factory.createSubEmitterInitUpdate(
      childPipeline.buffers,
      childMax,
      childShapeParams,
      pipeline.buffers,
      maxParticles,
      fifo,
      se.inheritVelocity ?? 0,
      perEvent,
      {
        linear: [childVel?.linear?.x, childVel?.linear?.y, childVel?.linear?.z],
        orbital: [childVel?.orbital?.x, childVel?.orbital?.y, childVel?.orbital?.z],
      }
    );
    subEntries.push({
      fifo,
      pipeline: childPipeline,
      init,
      instanced: childInstanced,
      requestedRendererType: childRequestedRendererType,
      effectiveRendererType: childEffectiveRendererType,
      cfg: childCfg,
      object: null,
      perEvent,
      gravity: childCfg.gravity,
      noise: childCfg.noise?.isActive
        ? {
            isActive: true,
            strength: childCfg.noise.strength,
            noisePower: 0.15 * childCfg.noise.strength,
            frequency: childCfg.noise.frequency,
            positionAmount: childCfg.noise.positionAmount,
            rotationAmount: childCfg.noise.rotationAmount,
            sizeAmount: childCfg.noise.sizeAmount,
            fbmMax: 2 - Math.pow(2, -childCfg.noise.octaves),
          }
        : null,
      rate: childCfg.emission?.rateOverTime
        ? calculateValue(_particleSystemId + 1 + fi, childCfg.emission.rateOverTime, 0)
        : 0,
      acc: 0,
      lastEmit: 0,
      poseFrom: 'self',
      selfPose: {
        x: 0,
        y: 0,
        z: 0,
        qx: 0,
        qy: 0,
        qz: 0,
        qw: 1,
        sx: 1,
        sy: 1,
        sz: 1,
        isWorld: childCfg.simulationSpace === 'WORLD' /* WORLD */ ? 1 : 0,
      },
    });
  }
  const cameraNearFarSource = normalizedConfig.renderer.cameraNearFar;
  const tilesSource = normalizedConfig.textureSheetAnimation?.tiles;
  const elapsedUniform = { value: 0 };
  const sharedUniforms = {
    elapsed: elapsedUniform,
    viewportHeight: { value: 720 },
    cameraNearFar: {
      value: normalizeVector2Value(cameraNearFarSource, [0.1, 1e3], 'renderer.cameraNearFar'),
    },
    useInstancing: { value: useInstancing },
    softParticlesEnabled: { value: !!normalizedConfig.renderer.softParticles?.enabled },
    softParticlesIntensity: {
      value: Math.max(normalizedConfig.renderer.softParticles?.intensity ?? 1, 1e-3),
    },
    sceneDepthTexture: {
      value: normalizeDepthTextureValue(
        normalizedConfig.renderer.softParticles?.depthTexture,
        'renderer.softParticles.depthTexture'
      ),
    },
    discardBackgroundColor: { value: !!normalizedConfig.renderer.discardBackgroundColor },
    backgroundColor: { value: new THREE3.Color(16777215) },
    backgroundColorTolerance: { value: normalizedConfig.renderer.backgroundColorTolerance ?? 0 },
    map: {
      value: normalizeTextureValue(normalizedConfig.map ?? getDefaultTexture(), 'map'),
    },
    startLifetime: { value: 0 },
    startSize: { value: 1 },
    startRotation: { value: 0 },
    startOpacity: { value: 1 },
    startColor: { value: new THREE3.Color(1, 1, 1) },
    lifetime: { value: 0 },
    color: { value: new THREE3.Color(1, 1, 1) },
    // Sprite-sheet animation fields consumed by tsl-shared.createParticleUniforms.
    fps: { value: normalizedConfig.textureSheetAnimation?.fps || 30 },
    useFPSForFrameIndex: {
      value: normalizedConfig.textureSheetAnimation?.timeMode === 'FPS' /* FPS */,
    },
    tiles: {
      // The ONLY normalizer: `tiles` reaches the TSL factory as a Vector2
      // (also {u,v} pairs are accepted per §10). The engine's own default is
      // already (1,1) via the merged default config.
      value: normalizeVector2Value(tilesSource, [1, 1], 'textureSheetAnimation.tiles'),
    },
  };
  const bgVec = normalizeBackgroundToVector3(
    normalizedConfig.renderer.backgroundColor,
    'renderer.backgroundColor'
  );
  sharedUniforms.backgroundColor.value.setRGB(bgVec.x, bgVec.y, bgVec.z);
  const rendererConfig = {
    transparent: !!normalizedConfig.renderer.transparent,
    blending: toBlendingConstant(normalizedConfig.renderer.blending),
    depthTest: normalizedConfig.renderer.depthTest !== false,
    depthWrite: normalizedConfig.renderer.depthWrite !== false,
  };
  const material = factory.createTSLParticleMaterial(rrType, sharedUniforms, rendererConfig, true);
  const buffers = pipeline.buffers;
  let geometry;
  if (useInstancing) {
    const g = new THREE3.InstancedBufferGeometry();
    const meshGeometry = normalizedConfig.renderer.mesh?.geometry;
    const baseGeometry =
      rrType === 'MESH' /* MESH */ && meshGeometry ? meshGeometry : new THREE3.BufferGeometry();
    if (rrType !== 'MESH' /* MESH */ || !meshGeometry) {
      const quad = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
      const quadUV = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
      const quadNormal = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
      const idx = new Uint16Array([0, 1, 2, 0, 2, 3]);
      baseGeometry.setAttribute('position', new THREE3.BufferAttribute(quad, 3));
      baseGeometry.setAttribute('uv', new THREE3.BufferAttribute(quadUV, 2));
      baseGeometry.setAttribute('normal', new THREE3.BufferAttribute(quadNormal, 3));
      baseGeometry.setIndex(new THREE3.BufferAttribute(idx, 1));
    }
    g.setAttribute('position', baseGeometry.getAttribute('position'));
    if (baseGeometry.index !== null) g.setIndex(baseGeometry.index);
    g.instanceCount = maxParticles;
    g.setAttribute('instanceOffset', buffers.position);
    g.setAttribute('instanceColor', buffers.color);
    g.setAttribute('instanceParticleState', buffers.particleState);
    g.setAttribute('instanceStartValues', buffers.startValues);
    geometry = g;
  } else {
    const g = new THREE3.BufferGeometry();
    g.setAttribute('position', buffers.position);
    g.setAttribute('color', buffers.color);
    g.setAttribute('particleState', buffers.particleState);
    g.setAttribute('startValues', buffers.startValues);
    g.setDrawRange(0, maxParticles);
    geometry = g;
    g.instanceCount = maxParticles;
  }
  let trailGeometry = null;
  if (ribbonPipeline && trailDesc) {
    const rb = ribbonPipeline.buffers;
    const g = new THREE3.BufferGeometry();
    g.setAttribute('position', rb.position);
    g.setAttribute('trailNext', rb.next);
    g.setAttribute('trailUVColor', rb.uvColorA);
    g.setAttribute('trailColorBA', rb.colorB);
    const idx = new Uint32Array(maxParticles * (trailLength - 1) * 6);
    let o = 0;
    for (let pIdx = 0; pIdx < maxParticles; pIdx++) {
      for (let s = 0; s < trailLength - 1; s++) {
        const b = pIdx * trailLength * 2 + s * 2;
        idx[o++] = b;
        idx[o++] = b + 1;
        idx[o++] = b + 2;
        idx[o++] = b + 1;
        idx[o++] = b + 3;
        idx[o++] = b + 2;
      }
    }
    g.setIndex(new THREE3.BufferAttribute(idx, 1));
    g.setDrawRange(0, maxParticles * trailLength * 2);
    trailGeometry = g;
  }
  const trailMaterial = trailGeometry
    ? factory.createTSLTrailMaterial(
        {
          map: { value: normalizedConfig.map ?? getDefaultTexture() },
          useMap: { value: !!normalizedConfig.map },
          discardBackgroundColor: { value: !!normalizedConfig.renderer.discardBackgroundColor },
          backgroundColor: {
            value: normalizedConfig.renderer.backgroundColor ?? { r: 1, g: 1, b: 1 },
          },
          backgroundColorTolerance: {
            value: normalizedConfig.renderer.backgroundColorTolerance ?? 0,
          },
          softParticlesEnabled: { value: !!normalizedConfig.renderer.softParticles?.enabled },
          softParticlesIntensity: {
            value: Math.max(normalizedConfig.renderer.softParticles?.intensity ?? 1, 1e-3),
          },
          sceneDepthTexture: {
            value: normalizedConfig.renderer.softParticles?.depthTexture ?? null,
          },
          cameraNearFar: { value: new THREE3.Vector2(0.1, 1e3) },
        },
        {
          transparent: !!normalizedConfig.renderer.transparent,
          blending: toBlendingConstant(normalizedConfig.renderer.blending),
          depthTest: normalizedConfig.renderer.depthTest !== false,
          depthWrite: normalizedConfig.renderer.depthWrite !== false,
        }
      )
    : null;
  const particleSystem = trailGeometry
    ? new THREE3.Mesh(trailGeometry, trailMaterial)
    : useInstancing
      ? new THREE3.Mesh(geometry, material)
      : new THREE3.Points(geometry, material);
  particleSystem.frustumCulled = false;
  for (const e of subEntries) {
    const cb = e.pipeline.buffers;
    const childMax = e.pipeline.allocatorCount - 1;
    const childGeometry = e.instanced
      ? (() => {
          const g = new THREE3.InstancedBufferGeometry();
          const quad = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
          const idx = new Uint16Array([0, 1, 2, 0, 2, 3]);
          g.setAttribute('position', new THREE3.BufferAttribute(quad, 3));
          g.setIndex(new THREE3.BufferAttribute(idx, 1));
          g.instanceCount = childMax;
          g.setAttribute('instanceOffset', cb.position);
          g.setAttribute('instanceColor', cb.color);
          g.setAttribute('instanceParticleState', cb.particleState);
          g.setAttribute('instanceStartValues', cb.startValues);
          return g;
        })()
      : (() => {
          const g = new THREE3.BufferGeometry();
          g.setAttribute('position', cb.position);
          g.setAttribute('color', cb.color);
          g.setAttribute('particleState', cb.particleState);
          g.setAttribute('startValues', cb.startValues);
          g.setDrawRange(0, childMax);
          return g;
        })();
    const childUniforms = {
      ...sharedUniforms,
      useInstancing: { value: e.instanced },
    };
    const childMaterial = factory.createTSLParticleMaterial(
      e.effectiveRendererType,
      childUniforms,
      rendererConfig,
      true
    );
    const childObject = e.instanced
      ? new THREE3.Mesh(childGeometry, childMaterial)
      : new THREE3.Points(childGeometry, childMaterial);
    childObject.frustumCulled = false;
    particleSystem.add(childObject);
    e.object = childObject;
  }
  if (import.meta.env?.DEV !== false) {
    const required = useInstancing
      ? [
          'position',
          // quad / mesh vertex positions
          'instanceOffset',
          // GPU particle position
          'instanceColor',
          // GPU particle RGBA
          'instanceParticleState',
          // GPU packed state vec4
          'instanceStartValues',
          // GPU packed initial-state vec4
        ]
      : ['position', 'color', 'particleState', 'startValues'];
    for (const name of required) {
      if (!geometry.getAttribute(name)) {
        throw new Error(
          'three-particles: ' +
            (useInstancing ? 'instanced' : 'POINTS') +
            ' geometry ' +
            name +
            ' is missing its required contract attribute.'
        );
      }
    }
    const contractIdentity = useInstancing
      ? [
          ['instanceOffset', buffers.position],
          ['instanceColor', buffers.color],
          ['instanceParticleState', buffers.particleState],
          ['instanceStartValues', buffers.startValues],
        ]
      : [
          ['position', buffers.position],
          ['color', buffers.color],
          ['particleState', buffers.particleState],
          ['startValues', buffers.startValues],
        ];
    for (const [name, buf] of contractIdentity) {
      if (geometry.getAttribute(name) !== buf) {
        throw new Error(
          `three-particles: attribute "${name}" is not the compute-owned storage buffer.`
        );
      }
    }
    const kind = pipeline.shapeUniforms.shapeKind.value;
    if (!(kind >= 0 && kind <= 4)) {
      throw new Error(`three-particles: gpuShapeKind ${kind} outside 0..4 (SPHERE..BOX).`);
    }
    if (!(maxParticles > 0)) {
      throw new Error('three-particles: maxParticles must be > 0.');
    }
    if (pipeline.allocatorCount !== maxParticles + 1) {
      throw new Error('three-particles: allocator capacity must equal maxParticles + 1.');
    }
    const passLayouts = [
      ...(pipeline.passLayouts ?? []),
      ...(ribbonPipeline?.passLayouts ?? []),
      ...subEntries.flatMap((e) => [
        ...(e.init.passLayouts ?? []),
        ...(e.pipeline.passLayouts ?? []).map((p) => ({ ...p, name: `child:${p.name}` })),
      ]),
    ];
    for (const pass of passLayouts) {
      if (pass.storageBindings > 8) {
        throw new Error(
          `${pass.name}: ${pass.storageBindings} storage buffers > guaranteed limit 8`
        );
      }
    }
    if (trailDesc && trailDesc.meta !== pipeline.trailMeta) {
      throw new Error('three-particles: trail ring meta buffer mismatch.');
    }
    for (const f of fifos) {
      const n = f.counter.array.length;
      if (n !== 2) {
        throw new Error(
          'three-particles: sub-emitter FIFO must expose exactly 2 ping-pong counter slots.'
        );
      }
      const p = f.payload.array.length;
      if (p !== 2 * 6 * f.capacity) {
        throw new Error(
          'three-particles: sub-emitter FIFO payload length must be 2 * 6 * capacity.'
        );
      }
    }
  }
  const _numOr = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const xform = normalizedConfig.transform;
  if (xform?.position) {
    particleSystem.position.set(
      _numOr(xform.position.x, 0),
      _numOr(xform.position.y, 0),
      _numOr(xform.position.z, 0)
    );
  }
  if (xform?.rotation) {
    particleSystem.rotation.set(
      THREE3.MathUtils.degToRad(_numOr(xform.rotation.x, 0)),
      THREE3.MathUtils.degToRad(_numOr(xform.rotation.y, 0)),
      THREE3.MathUtils.degToRad(_numOr(xform.rotation.z, 0))
    );
  }
  if (xform?.scale) {
    particleSystem.scale.set(
      _numOr(xform.scale.x, 1),
      _numOr(xform.scale.y, 1),
      _numOr(xform.scale.z, 1)
    );
  }
  particleSystem.updateMatrix();
  particleSystem.updateMatrixWorld(true);
  if (normalizedConfig.simulationSpace === 'WORLD' /* WORLD */) {
    particleSystem.matrixWorldAutoUpdate = false;
    particleSystem.matrixWorld.identity();
  }
  const generalData = {
    particleSystemId: _particleSystemId++,
    normalizedLifetimePercentage: 0,
    distanceFromLastEmitByDistance: 0,
    lastWorldPosition: new THREE3.Vector3(-99999),
    currentWorldPosition: new THREE3.Vector3(-99999),
    worldPositionChange: new THREE3.Vector3(),
    sourceWorldMatrix: new THREE3.Matrix4(),
    worldQuaternion: new THREE3.Quaternion(),
    wrapperQuaternion: new THREE3.Quaternion(),
    worldScale: new THREE3.Vector3(1, 1, 1),
    worldEuler: new THREE3.Euler(),
    gravityVelocity: new THREE3.Vector3(0, 0, 0),
    startValues: {},
    linearVelocityData: void 0,
    orbitalVelocityData: void 0,
    lifetimeValues: {},
    creationTimes: new Float32Array(0),
    cpuDirtyParticleWatermark: -1,
    highWaterIndex: 0,
    noise: {
      isActive: normalizedConfig.noise.isActive,
      strength: normalizedConfig.noise.strength,
      // Oracle `0.15 * strength`; the single fbmMax division lives inside the
      // FBM sum (CPU: FBM.get3; GPU: the octave loop amp / fbmMax).
      noisePower: 0.15 * normalizedConfig.noise.strength,
      frequency: normalizedConfig.noise.frequency,
      positionAmount: normalizedConfig.noise.positionAmount,
      rotationAmount: normalizedConfig.noise.rotationAmount,
      sizeAmount: normalizedConfig.noise.sizeAmount,
      fbmMax: 2 - Math.pow(2, -normalizedConfig.noise.octaves),
    },
    isEnabled: true,
    burstStates: normalizedConfig.emission.bursts?.length
      ? normalizedConfig.emission.bursts.map(() => ({
          cyclesExecuted: 0,
          lastCycleTime: 0,
          probabilityPassed: false,
        }))
      : void 0,
  };
  const props = {
    particleSystem,
    mappedAttributes: {
      position: buffers.position,
      isActive: buffers.orbitalIsActive,
      lifetime: buffers.particleState,
      startLifetime: buffers.startValues,
      startFrame: buffers.particleState,
      size: buffers.particleState,
      rotation: buffers.particleState,
      color: buffers.color,
    },
    // ?? Deprecated zero-size sentinels (GPU-only v4) ????
    // These legacy CPU particle-state fields are not authoritative anymore: the
    // compute kernels own the state in GPU storage. Only the TRAIL path (which
    // throws in v4) consumed them, so they are 0-length placeholders.
    scalarArray: new Float32Array(0),
    scalarInterleavedBuffer: new THREE3.InterleavedBuffer(new Float32Array(0), SCALAR_STRIDE),
    elapsedUniform,
    generalData,
    onUpdate: () => {},
    onComplete: () => {},
    creationTime: now + (normalizedConfig.startDelay || 0),
    lastEmissionTime: now,
    emissionAccumulator: 0,
    duration: normalizedConfig.duration,
    looping: normalizedConfig.looping,
    simulationSpace: normalizedConfig.simulationSpace,
    gravity: normalizedConfig.gravity,
    normalizedForceFields: forceFields,
    normalizedCollisionPlanes: collisionPlanes,
    emission: normalizedConfig.emission,
    normalizedConfig,
    iterationCount: 0,
    velocities: [],
    freeList: [],
    deactivateParticle: () => {},
    killParticle: () => {},
    activateParticle: () => {},
    computePipeline: pipeline,
    useGPUCompute: true,
    computeDispatchReady: false,
    maxParticles,
    material,
    geometry,
    rrType,
    requestedRendererType,
    effectiveRendererType: rrType,
    sharedUniforms,
    allComputeNodes: [
      ...(pipeline.computeNodes ?? []),
      ...(ribbonPipeline ? [ribbonPipeline.ribbonNode] : []),
      ...subEntries.flatMap((e) => [
        e.init.commandBuildNode,
        e.init.childInitNode,
        ...(e.init.counterClearNode != null ? [e.init.counterClearNode] : []),
        ...(e.pipeline.computeNodes ?? []),
      ]),
    ],
    passNames: [
      ...(pipeline.passNames ?? ['emit', 'simulate']),
      ...(ribbonPipeline ? ['trail-ribbon'] : []),
      ...subEntries.flatMap((e, ei) => [
        `sub${ei}:command-build`,
        `sub${ei}:child-init`,
        `sub${ei}:counter-clear`,
        `sub${ei}:child-emit`,
        `sub${ei}:child-sim`,
      ]),
    ],
    fifoBaseStride,
    ribbonUniforms: ribbonPipeline ? ribbonPipeline.uniforms : void 0,
    ribbonBuffers: ribbonPipeline ? ribbonPipeline.buffers : void 0,
    frameParity: 0,
    subEntries: subEntries.map((e) => ({
      fifo: { capacity: e.fifo.capacity, windowSize: e.fifo.windowSize },
      requestedRendererType: e.requestedRendererType,
      effectiveRendererType: e.effectiveRendererType,
      pipeline: e.pipeline,
      init: e.init,
      gravity: e.gravity,
      noise: e.noise,
      rate: e.rate,
      acc: 0,
      isWorld: e.selfPose.isWorld,
      quat: [e.selfPose.qx, e.selfPose.qy, e.selfPose.qz, e.selfPose.qw],
      scale: [e.selfPose.sx, e.selfPose.sy, e.selfPose.sz],
      position: [
        _numOr(e.cfg.transform?.position?.x, 0),
        _numOr(e.cfg.transform?.position?.y, 0),
        _numOr(e.cfg.transform?.position?.z, 0),
      ],
    })),
  };
  for (const e of subEntries) {
    if (!e.object) continue;
    const tf = e.cfg.transform;
    if (tf?.position) {
      e.object.position.set(
        _numOr(tf.position.x, 0),
        _numOr(tf.position.y, 0),
        _numOr(tf.position.z, 0)
      );
    }
    if (tf?.rotation) {
      e.object.rotation.set(
        THREE3.MathUtils.degToRad(_numOr(tf.rotation.x, 0)),
        THREE3.MathUtils.degToRad(_numOr(tf.rotation.y, 0)),
        THREE3.MathUtils.degToRad(_numOr(tf.rotation.z, 0))
      );
    }
    if (tf?.scale) {
      e.object.scale.set(_numOr(tf.scale.x, 1), _numOr(tf.scale.y, 1), _numOr(tf.scale.z, 1));
    }
    e.object.updateMatrix();
    const q = new THREE3.Quaternion().setFromEuler(
      new THREE3.Euler(
        THREE3.MathUtils.degToRad(_numOr(tf?.rotation?.x, 0)),
        THREE3.MathUtils.degToRad(_numOr(tf?.rotation?.y, 0)),
        THREE3.MathUtils.degToRad(_numOr(tf?.rotation?.z, 0)),
        'XYZ'
      )
    );
    const entry = props.subEntries?.[subEntries.indexOf(e)];
    if (entry) {
      entry.quat = [q.x, q.y, q.z, q.w];
      entry.scale = [_numOr(tf?.scale?.x, 1), _numOr(tf?.scale?.y, 1), _numOr(tf?.scale?.z, 1)];
    }
  }
  createdParticleSystems.push(props);
  const _dbgPassCounts = [
    ...(pipeline.passLayouts ?? []).map((p) => [p.name, p.storageBindings]),
    ...(ribbonPipeline?.passLayouts ?? []).map((p) => [p.name, p.storageBindings]),
    ...subEntries.flatMap((e, ei) => [
      ...(e.init.passLayouts ?? []).map((p) => [`sub${ei}:${p.name}`, p.storageBindings]),
      ...(e.pipeline.passLayouts ?? []).map((p) => [`sub${ei}:${p.name}`, p.storageBindings]),
    ]),
  ];
  const _dbgMaxPass = _dbgPassCounts.reduce((m, p) => Math.max(m, p[1]), 0);
  if (typeof console !== 'undefined' && console.log) {
    const logCfg = normalizedConfig;
    const shpU = pipeline.shapeUniforms;
    const sv = logCfg.startValues;
    const u = pipeline.uniforms;
    console.log(`[PS:create] system #${generalData.particleSystemId}`, {
      rendererType: rrType,
      requestedRendererType,
      effectiveRendererType: rrType,
      simulationSpace: normalizedConfig.simulationSpace,
      maxParticles,
      useInstancing,
    });
    console.log(`[PS:config] system #${generalData.particleSystemId}`, {
      shape: {
        publicKind: logCfg.shape?.shape ?? null,
        gpuShapeKind: shpU.shapeKind?.value ?? 0,
        radius: shpU.radius?.value ?? logCfg.shape?.radius ?? null,
        radiusThickness: shpU.radiusThickness?.value ?? null,
        arcDeg: shpU.arcDeg?.value ?? null,
        coneAngleDeg: shpU.coneAngleDeg?.value ?? null,
        rectScale: [shpU.rectScaleX?.value, shpU.rectScaleY?.value],
        rectRotationDeg: [shpU.rectRotXDeg?.value, shpU.rectRotYDeg?.value],
        boxScale: [shpU.boxSX?.value, shpU.boxSY?.value, shpU.boxSZ?.value],
        boxEmitFrom: shpU.boxEmitFrom?.value ?? null,
      },
      transform: {
        position: xform?.position ?? null,
        rotation: xform?.rotation ?? null,
        scale: xform?.scale ?? null,
      },
      emission: {
        rateOverTime: logCfg.emission?.rateOverTime ?? 0,
        rateOverDistance: logCfg.emission?.rateOverDistance ?? 0,
        bursts: logCfg.emission?.bursts?.length ?? 0,
      },
      startValues: {
        lifetime: sv?.startLifetime ?? null,
        speed: sv?.startSpeed ?? null,
        size: sv?.startSize ?? null,
        rotation: sv?.startRotation ?? null,
        color: sv?.startColor ?? null,
        opacity: sv?.startOpacity ?? null,
      },
      textureId: config.textureId ?? config._editorData?.textureId ?? null,
      textureResolved: !!normalizedConfig.map,
      forceFieldCount: forceFields.length,
      collisionPlaneCount: collisionPlanes.length,
      subEmitterCount: (normalizedConfig.subEmitters ?? []).length,
      trailEnabled: !!trailDesc,
      modifiers: {
        linearVelocity:
          !!logCfg.velocityOverLifetime?.isActive &&
          (u.linearVelX !== void 0 ||
            u.axisLinXMin !== void 0 ||
            !!(
              logCfg.velocityOverLifetime?.linear &&
              Object.values(logCfg.velocityOverLifetime.linear).some(
                (value) => value !== void 0 && value !== 0
              )
            )),
        orbitalVelocity:
          !!logCfg.velocityOverLifetime?.isActive &&
          !!(
            logCfg.velocityOverLifetime?.orbital &&
            Object.values(logCfg.velocityOverLifetime.orbital).some(
              (value) => value !== void 0 && value !== 0
            )
          ),
        sizeOverLifetime: !!normalizedConfig.sizeOverLifetime?.isActive,
        opacityOverLifetime: !!normalizedConfig.opacityOverLifetime?.isActive,
        colorOverLifetime: !!normalizedConfig.colorOverLifetime?.isActive,
        rotationOverLifetime: !!normalizedConfig.rotationOverLifetime?.isActive,
        noise: !!normalizedConfig.noise?.isActive,
      },
    });
    console.log(
      `[PS:pipeline] system #${generalData.particleSystemId}: ${(props.passNames ?? []).join(' -> ') || 'emit -> simulate'} | storageBindings=${_dbgPassCounts.map((p) => `${p[0]}=${p[1]}\u22648`).join(' ')} | packedFloats=${pipeline.buffers.packedData?.length ?? 0}`
    );
  }
  const update = (cycleData) => {
    updateParticleSystemInstance(props, cycleData);
  };
  const resumeEmitter = () => {
    generalData.isEnabled = true;
  };
  const pauseEmitter = () => {
    generalData.isEnabled = false;
  };
  const dispose = () => {
    destroyParticleSystem(particleSystem);
  };
  const updateConfig = (partial) => {
    ObjectUtils.deepMerge(normalizedConfig, partial, {
      applyToFirstObject: true,
      skippedProperties: [],
    });
  };
  return {
    instance: particleSystem,
    resumeEmitter,
    pauseEmitter,
    dispose,
    update,
    updateConfig,
    /**
     * ?? Deprecated synchronous active count ????
     * Returns -1 (= unsupported) in the GPU-only engine: the authoritative count
     * is `maxParticles - allocator[0]` which lives in GPU storage and is only
     * available through an explicit (throttled) `getArrayBufferAsync` read-back.
     */
    getActiveParticleCount: () => -1,
    computeNode:
      props.allComputeNodes && props.allComputeNodes.length > 0
        ? props.allComputeNodes
        : (pipeline.computeNodes ?? pipeline.computeNode),
    /**
         * ?? Temporary one-shot GPU debug handle (deprecated, no per-frame cost) ????
         * getActiveParticleCount() stays -1; this object is the raw material for an
         * explicit 
    enderer.getArrayBufferAsync(...) read-back (bytes, multiples of 4).
         * lastEmitCount() mirrors uEmitCount, the u32 count written per frame.
         */
    gpuDebug: {
      maxParticles,
      allocatorCount: pipeline.allocatorCount,
      /** Canonical requested vs effective GPU renderer classes (§2). */
      requestedRendererType,
      effectiveRendererType: rrType,
      /** u32 birth system seed for this pipeline (written ONCE at create). */
      systemSeed: pipeline.uniforms.seed.value,
      buffers: pipeline.buffers,
      emitNode: pipeline.emitNode,
      simNode: pipeline.simNode,
      passNames: pipeline.passNames ?? ['emit', 'simulate'],
      allPassNames: props.passNames ?? [],
      storageBindingCount: _dbgMaxPass,
      passBindingCounts: _dbgPassCounts,
      lastEmitCount: () => pipeline.uniforms.emitCount.value,
      /**
       * Per-sub-emitter-child canonical pairs (§2/§21): each child pool's own
       * requested vs effective renderer class + its events-per-frame.
       */
      subEmitters: (subEntries ?? []).map((e) => ({
        requestedRendererType: e.requestedRendererType ?? null,
        effectiveRendererType: e.effectiveRendererType,
        perEvent: e.perEvent,
      })),
      /** Decode summary for the `[PS:config]` / `[PS:pipeline]` logs. */
      snapshot: () => {
        const shp = normalizedConfig.shape;
        const branch =
          shp.shape === 'CONE' ? shp.cone : shp.shape === 'CIRCLE' ? shp.circle : shp.sphere;
        const tex = normalizedConfig.map;
        return {
          systemId: generalData.particleSystemId,
          // Canonical effective + original requested renderer classes (§2).
          effectiveRendererType: rrType,
          requestedRendererType,
          rendererType: rrType,
          simulationSpace: normalizedConfig.simulationSpace,
          maxParticles,
          shape: {
            publicShape: shp.shape,
            gpuShapeKind: pipeline.shapeUniforms?.shapeKind?.value ?? 0,
            radius: branch?.radius ?? null,
            radiusThickness: branch?.radiusThickness ?? null,
            arcDeg: branch?.arc ?? null,
            coneAngleDeg: shp.shape === 'CONE' ? (shp.cone?.angle ?? null) : null,
            rectScale: shp.rectangle?.scale ?? null,
            rectRotation: shp.rectangle?.rotation ?? null,
            boxScale: shp.box?.scale ?? null,
            boxEmitFrom: shp.box?.emitFrom ?? null,
          },
          textureId: config.textureId ?? config._editorData?.textureId ?? null,
          textureResolved: !!normalizedConfig.map,
          textureDimensions: tex?.image ? [tex.image.width ?? 0, tex.image.height ?? 0] : null,
          forceFieldCount: (normalizedConfig.forceFields ?? []).length,
          collisionPlaneCount: (normalizedConfig.collisionPlanes ?? []).length,
          subEmitterCount: (normalizedConfig.subEmitters ?? []).length,
          trailEnabled: !!normalizedConfig.renderer.trail,
        };
      },
    },
  };
};
var _lastUploadStampMap = /* @__PURE__ */ new WeakMap();
var _cmdUploadSeen = /* @__PURE__ */ new WeakSet();
var updateParticleSystemInstance = (props, { now, delta, elapsed }) => {
  const {
    generalData,
    normalizedConfig,
    particleSystem,
    elapsedUniform,
    creationTime,
    normalizedForceFields,
    normalizedCollisionPlanes,
    emission,
    computePipeline: pipeline,
    maxParticles = 0,
    allComputeNodes,
    subEntries,
    fifoBaseStride = 0,
    ribbonUniforms,
  } = props;
  if (!pipeline) return;
  const u = pipeline.uniforms;
  const dur = normalizedConfig.duration;
  const lifetime = now - creationTime;
  const loop = normalizedConfig.looping;
  const iterationTimeMs = loop ? lifetime % (dur * 1e3) : lifetime;
  generalData.normalizedLifetimePercentage = Math.max(Math.min(iterationTimeMs / 1e3 / dur, 1), 0);
  elapsedUniform.value = elapsed;
  const gv = generalData.gravityVelocity;
  gv.set(0, normalizedConfig.gravity, 0);
  if (normalizedConfig.simulationSpace === 'WORLD' /* WORLD */) {
    particleSystem.updateMatrix();
    _tmpM1.copy(particleSystem.matrix);
    if (particleSystem.parent) {
      particleSystem.parent.updateMatrixWorld();
      _tmpM1.premultiply(particleSystem.parent.matrixWorld);
    }
    _tmpM1.decompose(
      generalData.currentWorldPosition,
      generalData.worldQuaternion,
      generalData.worldScale
    );
  } else {
    particleSystem.updateMatrixWorld();
    particleSystem.getWorldPosition(generalData.currentWorldPosition);
    particleSystem.getWorldQuaternion(generalData.worldQuaternion);
    particleSystem.getWorldScale(generalData.worldScale);
    _tmpQ1.copy(generalData.worldQuaternion).invert();
    gv.applyQuaternion(_tmpQ1);
    gv.x /= generalData.worldScale.x || 1;
    gv.y /= generalData.worldScale.y || 1;
    gv.z /= generalData.worldScale.z || 1;
  }
  if (generalData.lastWorldPosition.x !== -99999) {
    _lastWorldPositionSnapshot.copy(generalData.lastWorldPosition);
    generalData.distanceFromLastEmitByDistance += _lastWorldPositionSnapshot.distanceTo(
      generalData.currentWorldPosition
    );
  }
  generalData.lastWorldPosition.copy(generalData.currentWorldPosition);
  let emitCount = 0;
  if (generalData.isEnabled && (loop || iterationTimeMs < dur * 1e3)) {
    const lastEmit = props.lastEmissionTime;
    const emissionDelta = now - lastEmit;
    if (emissionDelta > 0) {
      props.lastEmissionTime = now;
      if (emission.rateOverTime) {
        props.emissionAccumulator +=
          calculateValue(
            generalData.particleSystemId,
            emission.rateOverTime,
            generalData.normalizedLifetimePercentage
          ) *
          (emissionDelta / 1e3);
      }
    }
    emitCount += Math.floor(props.emissionAccumulator);
    if (emitCount > 0) props.emissionAccumulator -= emitCount;
    if (emission.rateOverDistance && generalData.distanceFromLastEmitByDistance > 0) {
      const r = calculateValue(
        generalData.particleSystemId,
        emission.rateOverDistance,
        generalData.normalizedLifetimePercentage
      );
      if (r > 0) {
        const n2 = Math.floor(generalData.distanceFromLastEmitByDistance * r);
        emitCount += n2;
        generalData.distanceFromLastEmitByDistance = Math.max(
          generalData.distanceFromLastEmitByDistance - n2 / r,
          0
        );
      }
    }
    if (emission.bursts && generalData.burstStates) {
      const bursts = emission.bursts;
      const states = generalData.burstStates;
      const tSec = iterationTimeMs / 1e3;
      for (let i = 0; i < bursts.length; i++) {
        const b = bursts[i];
        const s = states[i];
        const cyc = b.cycles ?? 1;
        const iv = b.interval ?? 0;
        const prob = b.probability ?? 1;
        if (loop && tSec < (b.time ?? 0) && s.cyclesExecuted > 0) {
          s.cyclesExecuted = 0;
          s.lastCycleTime = 0;
          s.probabilityPassed = false;
        }
        if (s.cyclesExecuted >= cyc) continue;
        const next = (b.time ?? 0) + s.cyclesExecuted * iv;
        if (tSec >= next) {
          if (s.cyclesExecuted === 0) s.probabilityPassed = Math.random() < prob;
          if (s.probabilityPassed) {
            emitCount += Math.floor(
              calculateValue(
                generalData.particleSystemId,
                b.count,
                generalData.normalizedLifetimePercentage
              )
            );
          }
          s.cyclesExecuted++;
          s.lastCycleTime = tSec;
        }
      }
    }
    if (emitCount > maxParticles) emitCount = maxParticles;
  }
  u.delta.value = delta;
  u.deltaMs.value = delta * 1e3;
  u.gravityVelocity.value.copy(gv);
  u.emitCount.value = emitCount;
  pipeline.emitNode.count = Math.max(1, emitCount);
  if (pipeline.subBirthEventsNode) {
    pipeline.subBirthEventsNode.count = Math.max(1, emitCount);
  }
  const n = generalData.noise;
  if (u.noiseStrength) u.noiseStrength.value = n.strength;
  if (u.noisePower) u.noisePower.value = n.noisePower;
  if (u.noiseFrequency) u.noiseFrequency.value = n.frequency;
  if (u.noisePositionAmount) u.noisePositionAmount.value = n.positionAmount;
  if (u.noiseRotationAmount) u.noiseRotationAmount.value = n.rotationAmount;
  if (u.noiseSizeAmount) u.noiseSizeAmount.value = n.sizeAmount;
  const pose = pipeline.emitterPose;
  if (pose) {
    if (normalizedConfig.simulationSpace === 'WORLD' /* WORLD */) {
      particleSystem.updateMatrix();
      _tmpM1.copy(particleSystem.matrix);
      if (particleSystem.parent) {
        particleSystem.parent.updateMatrixWorld();
        _tmpM1.premultiply(particleSystem.parent.matrixWorld);
      }
      _tmpM1.decompose(_tmpV1, _tmpQ1, _tmpV2);
      pose.positionW.value.set(_tmpV1.x, _tmpV1.y, _tmpV1.z, 1);
      pose.wrapperQuat.value.set(_tmpQ1.x, _tmpQ1.y, _tmpQ1.z, _tmpQ1.w);
      pose.worldScale.value.set(_tmpV2.x || 1, _tmpV2.y || 1, _tmpV2.z || 1);
    } else {
      pose.positionW.value.set(0, 0, 0, 0);
      pose.wrapperQuat.value.set(0, 0, 0, 1);
      pose.worldScale.value.set(1, 1, 1);
    }
  }
  const parity = (props.frameParity ?? 0) % 2;
  const fifoBase = parity;
  if (u.fifoBase) u.fifoBase.value = fifoBase;
  if (u.nowMs) u.nowMs.value = now;
  if (ribbonUniforms?.nowMs) ribbonUniforms.nowMs.value = now;
  for (const e of subEntries ?? []) {
    const cp = e.pipeline;
    if (!cp) continue;
    const cu = cp.uniforms;
    if (cu.delta) cu.delta.value = delta;
    if (cu.deltaMs) cu.deltaMs.value = delta * 1e3;
    if (cu.nowMs) cu.nowMs.value = now;
    if (cu.gravityVelocity) {
      cu.gravityVelocity.value.set(0, e.gravity, 0);
    }
    if (e.noise) {
      if (cu.noiseStrength) cu.noiseStrength.value = e.noise.strength;
      if (cu.noisePower) cu.noisePower.value = e.noise.noisePower;
      if (cu.noiseFrequency) cu.noiseFrequency.value = e.noise.frequency;
      if (cu.noisePositionAmount) cu.noisePositionAmount.value = e.noise.positionAmount;
      if (cu.noiseRotationAmount) cu.noiseRotationAmount.value = e.noise.rotationAmount;
      if (cu.noiseSizeAmount) cu.noiseSizeAmount.value = e.noise.sizeAmount;
    }
    if (cu.fifoBase) cu.fifoBase.value = fifoBase;
    if (e.init.uniforms.fifoBase) e.init.uniforms.fifoBase.value = fifoBase;
    let childEmit = 0;
    if (e.rate > 0) {
      e.acc += (e.rate * delta) / 1;
      childEmit = Math.floor(e.acc);
      if (childEmit > 0) e.acc -= childEmit;
    }
    const childCapacity = Math.max(2, (cp.allocatorCount ?? 2) - 1);
    if (childEmit > childCapacity) childEmit = childCapacity;
    if (cp.emitNode) cp.emitNode.count = Math.max(1, childEmit);
    if (cu.emitCount) cu.emitCount.value = childEmit;
    const cpose = cp.emitterPose;
    if (cpose) {
      if (e.isWorld === 1) {
        cpose.positionW.value.set(e.position[0], e.position[1], e.position[2], 1);
        cpose.wrapperQuat.value.set(e.quat[0], e.quat[1], e.quat[2], e.quat[3]);
        cpose.worldScale.value.set(e.scale[0], e.scale[1], e.scale[2]);
      } else {
        cpose.positionW.value.set(0, 0, 0, 0);
        cpose.wrapperQuat.value.set(0, 0, 0, 1);
        cpose.worldScale.value.set(1, 1, 1);
      }
    }
    const ip = e.init.uniforms;
    if (ip.positionW && ip.wrapperQuat) {
      if (e.isWorld === 1) {
        ip.positionW.value.set(e.position[0], e.position[1], e.position[2], 1);
        ip.wrapperQuat.value.set(e.quat[0], e.quat[1], e.quat[2], e.quat[3]);
      } else {
        ip.positionW.value.set(0, 0, 0, 0);
        ip.wrapperQuat.value.set(0, 0, 0, 1);
      }
    }
  }
  const ffInfo = pipeline.forceFieldInfo;
  const cInfo = pipeline.collisionPlaneInfo ?? null;
  if ((ffInfo || cInfo) && _tslMaterialFactory) {
    const cdArr = pipeline.buffers.packedData;
    const cdNode = pipeline.packedDataNode;
    if (ffInfo && normalizedForceFields.length > 0) {
      const encFF = _tslMaterialFactory.encodeForceFieldsForGPU(
        normalizedForceFields,
        generalData.particleSystemId,
        generalData.normalizedLifetimePercentage
      );
      let changedFF = false;
      for (let k = 0; k < encFF.length; k++)
        if (cdArr[ffInfo.offset + k] !== encFF[k]) {
          changedFF = true;
          break;
        }
      if (changedFF) {
        cdArr.set(encFF, ffInfo.offset);
        cdNode.addUpdateRange(ffInfo.offset, encFF.length);
        cdNode.needsUpdate = true;
      }
      ffInfo.countUniform.value = normalizedForceFields.length;
    }
    if (cInfo && normalizedCollisionPlanes.length > 0) {
      const encCP = _tslMaterialFactory.encodeCollisionPlanesForGPU(normalizedCollisionPlanes);
      let changedCP = false;
      for (let k = 0; k < encCP.length; k++)
        if (cdArr[cInfo.offset + k] !== encCP[k]) {
          changedCP = true;
          break;
        }
      if (changedCP) {
        cdArr.set(encCP, cInfo.offset);
        cdNode.addUpdateRange(cInfo.offset, encCP.length);
        cdNode.needsUpdate = true;
      }
      cInfo.countUniform.value = normalizedCollisionPlanes.length;
    }
  }
  const bufs = pipeline.buffers;
  let stamp = _lastUploadStampMap.get(bufs);
  if (stamp === void 0 || stamp === 0) {
    for (const key of Object.keys(bufs)) {
      const a = bufs[key];
      if (a && 'needsUpdate' in a) a.needsUpdate = true;
    }
    _lastUploadStampMap.set(bufs, 1);
  } else {
    _lastUploadStampMap.set(bufs, stamp + 1);
  }
  for (const e of subEntries ?? []) {
    const cb = e.pipeline?.buffers;
    if (cb && !_lastUploadStampMap.has(cb)) {
      for (const key of Object.keys(cb)) {
        const a = cb[key];
        if (a && 'needsUpdate' in a) a.needsUpdate = true;
      }
      _lastUploadStampMap.set(cb, 1);
    }
    const cmd = e.init.commandBuffer;
    if (cmd && 'needsUpdate' in cmd && !_cmdUploadSeen.has(cmd)) {
      cmd.needsUpdate = true;
      _cmdUploadSeen.add(cmd);
    }
  }
  const rb = props.ribbonBuffers;
  if (rb && !_lastUploadStampMap.has(rb)) {
    for (const key of Object.keys(rb)) {
      const a = rb[key];
      if (a && 'needsUpdate' in a) a.needsUpdate = true;
    }
    _lastUploadStampMap.set(rb, 1);
  }
  props.computeDispatchReady = true;
  props.iterationCount++;
  props.frameParity = (props.frameParity ?? 0) ^ 1;
  if (props.trailMesh) updateTrailGeometry(props, now);
};
var _tmpQ1 = new THREE3.Quaternion();
var _tmpV1 = new THREE3.Vector3();
var _tmpV2 = new THREE3.Vector3();
var _tmpM1 = new THREE3.Matrix4();
var catmullRom = (out, outIdx, p0x, p0y, p0z, p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z, t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  out[outIdx] =
    0.5 *
    (2 * p1x +
      (-p0x + p2x) * t +
      (2 * p0x - 5 * p1x + 4 * p2x - p3x) * t2 +
      (-p0x + 3 * p1x - 3 * p2x + p3x) * t3);
  out[outIdx + 1] =
    0.5 *
    (2 * p1y +
      (-p0y + p2y) * t +
      (2 * p0y - 5 * p1y + 4 * p2y - p3y) * t2 +
      (-p0y + 3 * p1y - 3 * p2y + p3y) * t3);
  out[outIdx + 2] =
    0.5 *
    (2 * p1z +
      (-p0z + p2z) * t +
      (2 * p0z - 5 * p1z + 4 * p2z - p3z) * t2 +
      (-p0z + 3 * p1z - 3 * p2z + p3z) * t3);
};
var clearTrailVertex = (
  vIdx,
  cIdx,
  aIdx,
  uvIdx,
  trailPosArr,
  trailNextArr,
  trailHalfWidthArr,
  trailUVArr,
  trailAlphaArr,
  trailColorArr,
  fallbackX,
  fallbackY,
  fallbackZ
) => {
  trailPosArr[vIdx] = fallbackX;
  trailPosArr[vIdx + 1] = fallbackY;
  trailPosArr[vIdx + 2] = fallbackZ;
  trailPosArr[vIdx + 3] = fallbackX;
  trailPosArr[vIdx + 4] = fallbackY;
  trailPosArr[vIdx + 5] = fallbackZ;
  trailNextArr[vIdx] = fallbackX;
  trailNextArr[vIdx + 1] = fallbackY;
  trailNextArr[vIdx + 2] = fallbackZ;
  trailNextArr[vIdx + 3] = fallbackX;
  trailNextArr[vIdx + 4] = fallbackY;
  trailNextArr[vIdx + 5] = fallbackZ;
  trailHalfWidthArr[aIdx] = 0;
  trailHalfWidthArr[aIdx + 1] = 0;
  trailUVArr[uvIdx] = 0;
  trailUVArr[uvIdx + 1] = 0;
  trailUVArr[uvIdx + 2] = 0;
  trailUVArr[uvIdx + 3] = 0;
  trailAlphaArr[aIdx] = 0;
  trailAlphaArr[aIdx + 1] = 0;
  trailColorArr[cIdx] = 0;
  trailColorArr[cIdx + 1] = 0;
  trailColorArr[cIdx + 2] = 0;
  trailColorArr[cIdx + 3] = 0;
  trailColorArr[cIdx + 4] = 0;
  trailColorArr[cIdx + 5] = 0;
  trailColorArr[cIdx + 6] = 0;
  trailColorArr[cIdx + 7] = 0;
};
var writeTrailVertex = (
  vIdx,
  cIdx,
  aIdx,
  uvIdx,
  hx,
  hy,
  hz,
  nx,
  ny,
  nz,
  halfWidth,
  t,
  alpha,
  fr,
  fg,
  fb,
  ca,
  trailPosArr,
  trailNextArr,
  trailHalfWidthArr,
  trailUVArr,
  trailAlphaArr,
  trailColorArr
) => {
  trailPosArr[vIdx] = hx;
  trailPosArr[vIdx + 1] = hy;
  trailPosArr[vIdx + 2] = hz;
  trailPosArr[vIdx + 3] = hx;
  trailPosArr[vIdx + 4] = hy;
  trailPosArr[vIdx + 5] = hz;
  trailNextArr[vIdx] = nx;
  trailNextArr[vIdx + 1] = ny;
  trailNextArr[vIdx + 2] = nz;
  trailNextArr[vIdx + 3] = nx;
  trailNextArr[vIdx + 4] = ny;
  trailNextArr[vIdx + 5] = nz;
  trailHalfWidthArr[aIdx] = halfWidth;
  trailHalfWidthArr[aIdx + 1] = halfWidth;
  trailUVArr[uvIdx] = 0;
  trailUVArr[uvIdx + 1] = t;
  trailUVArr[uvIdx + 2] = 1;
  trailUVArr[uvIdx + 3] = t;
  trailAlphaArr[aIdx] = alpha;
  trailAlphaArr[aIdx + 1] = alpha;
  trailColorArr[cIdx] = fr;
  trailColorArr[cIdx + 1] = fg;
  trailColorArr[cIdx + 2] = fb;
  trailColorArr[cIdx + 3] = ca;
  trailColorArr[cIdx + 4] = fr;
  trailColorArr[cIdx + 5] = fg;
  trailColorArr[cIdx + 6] = fb;
  trailColorArr[cIdx + 7] = ca;
};
var _rawPoints = null;
var _rawPointsSize = 0;
var _smoothedPoints = null;
var _smoothedPointsSize = 0;
var _ribbonIndices = null;
var _ribbonIndicesSize = 0;
var _ribbonCount = 0;
var updateTrailGeometry = (props, now) => {
  const {
    generalData,
    trailPositionAttr,
    trailAlphaAttr,
    trailColorAttr,
    trailNextAttr: trailNextAttrCached,
    trailHalfWidthAttr: trailHalfWidthAttrCached,
    trailUVAttr: trailUVAttrCached,
    trailWidthCurveFn,
    trailOpacityCurveFn,
    trailColorOverTrailFns,
    trailConfig,
    mappedAttributes: ma,
  } = props;
  if (
    !trailPositionAttr ||
    !trailAlphaAttr ||
    !trailColorAttr ||
    !trailNextAttrCached ||
    !trailHalfWidthAttrCached ||
    !trailUVAttrCached ||
    !trailWidthCurveFn ||
    !trailOpacityCurveFn ||
    !trailConfig ||
    !generalData.positionHistory ||
    !generalData.positionHistoryIndex ||
    !generalData.positionHistoryCount
  )
    return;
  const trailLength = trailConfig.length;
  const positionHistory = generalData.positionHistory;
  const historyIndex = generalData.positionHistoryIndex;
  const historyCount = generalData.positionHistoryCount;
  const sampleTimes = generalData.trailSampleTimes;
  const lastSampledPos = generalData.trailLastSampledPosition;
  const prevNormal = generalData.trailPrevNormal;
  const minVertexDist = trailConfig.minVertexDistance;
  const minVertexDistSq = minVertexDist * minVertexDist;
  const maxTime = trailConfig.maxTime;
  const maxTimeMs = maxTime * 1e3;
  const useSmoothing = trailConfig.smoothing;
  const subdivisions = trailConfig.smoothingSubdivisions;
  const useTwistPrevention = trailConfig.twistPrevention;
  const ribbonId = trailConfig.ribbonId;
  const trailScalarArr = props.scalarArray;
  const positionArr = ma.position.array;
  const prevFilled = generalData.trailPrevFilledCount;
  const trailPosArr = trailPositionAttr.array;
  const trailAlphaArr = trailAlphaAttr.array;
  const trailColorArr = trailColorAttr.array;
  const trailNextArr = trailNextAttrCached.array;
  const trailUVArr = trailUVAttrCached.array;
  const trailHalfWidthArr = trailHalfWidthAttrCached.array;
  const verticesPerParticle = trailLength * 2;
  const hwm = generalData.highWaterIndex;
  const creationTimesLength = hwm > 0 ? hwm : generalData.creationTimes.length;
  let hasUpdates = false;
  const useRibbon = ribbonId !== void 0;
  let ribbonLeader = -1;
  if (useRibbon) {
    if (!_ribbonIndices || _ribbonIndicesSize < creationTimesLength) {
      _ribbonIndices = new Uint32Array(creationTimesLength);
      _ribbonIndicesSize = creationTimesLength;
    }
    _ribbonCount = 0;
    for (let i = 0; i < creationTimesLength; i++) {
      if (trailScalarArr[i * SCALAR_STRIDE + S_IS_ACTIVE]) _ribbonIndices[_ribbonCount++] = i;
    }
    for (let i = 1; i < _ribbonCount; i++) {
      const key = _ribbonIndices[i];
      const keyTime = generalData.creationTimes[key];
      let j = i - 1;
      while (j >= 0 && generalData.creationTimes[_ribbonIndices[j]] > keyTime) {
        _ribbonIndices[j + 1] = _ribbonIndices[j];
        j--;
      }
      _ribbonIndices[j + 1] = key;
    }
    if (_ribbonCount > 0) ribbonLeader = _ribbonIndices[0];
  }
  for (let index = 0; index < creationTimesLength; index++) {
    const vertBase = index * verticesPerParticle;
    if (trailScalarArr[index * SCALAR_STRIDE + S_IS_ACTIVE]) {
      if (useRibbon && _ribbonCount >= 2 && index !== ribbonLeader) {
        const posIdx2 = index * 3;
        const px2 = positionArr[posIdx2];
        const py2 = positionArr[posIdx2 + 1];
        const pz2 = positionArr[posIdx2 + 2];
        const histBase = (index * trailLength + historyIndex[index]) * 3;
        positionHistory[histBase] = px2;
        positionHistory[histBase + 1] = py2;
        positionHistory[histBase + 2] = pz2;
        if (sampleTimes) {
          sampleTimes[index * trailLength + historyIndex[index]] = now;
        }
        historyIndex[index] = (historyIndex[index] + 1) % trailLength;
        if (historyCount[index] < trailLength) historyCount[index]++;
        continue;
      }
      hasUpdates = true;
      const posIdx = index * 3;
      const px = positionArr[posIdx];
      const py = positionArr[posIdx + 1];
      const pz = positionArr[posIdx + 2];
      let shouldSample = true;
      if (minVertexDist > 0 && lastSampledPos && historyCount[index] > 0) {
        const lsIdx = index * 3;
        const dx = px - lastSampledPos[lsIdx];
        const dy = py - lastSampledPos[lsIdx + 1];
        const dz = pz - lastSampledPos[lsIdx + 2];
        if (dx * dx + dy * dy + dz * dz < minVertexDistSq) {
          shouldSample = false;
        }
      }
      if (shouldSample) {
        const histBase = (index * trailLength + historyIndex[index]) * 3;
        positionHistory[histBase] = px;
        positionHistory[histBase + 1] = py;
        positionHistory[histBase + 2] = pz;
        if (sampleTimes) {
          sampleTimes[index * trailLength + historyIndex[index]] = now;
        }
        historyIndex[index] = (historyIndex[index] + 1) % trailLength;
        if (historyCount[index] < trailLength) historyCount[index]++;
        if (lastSampledPos) {
          const lsIdx = index * 3;
          lastSampledPos[lsIdx] = px;
          lastSampledPos[lsIdx + 1] = py;
          lastSampledPos[lsIdx + 2] = pz;
        }
      }
      let rawCount = historyCount[index];
      let effectiveCount = rawCount;
      if (maxTime > 0 && sampleTimes && rawCount > 0) {
        const sampleBase = index * trailLength;
        effectiveCount = 0;
        for (let s = 0; s < rawCount; s++) {
          const sampleSlot = (historyIndex[index] - 1 - s + trailLength * 2) % trailLength;
          const age = now - sampleTimes[sampleBase + sampleSlot];
          if (age <= maxTimeMs) {
            effectiveCount++;
          } else {
            break;
          }
        }
      }
      const count = effectiveCount;
      const ribbonWidth = trailConfig.width;
      const trailBase = index * SCALAR_STRIDE;
      const cr = trailScalarArr[trailBase + S_COLOR_R];
      const cg = trailScalarArr[trailBase + S_COLOR_G];
      const cb = trailScalarArr[trailBase + S_COLOR_B];
      const ca = trailScalarArr[trailBase + S_COLOR_A];
      const ringOff = index * trailLength * 3;
      const rawPtsSize = count * 3;
      if (!_rawPoints || _rawPointsSize < rawPtsSize) {
        _rawPoints = new Float32Array(rawPtsSize);
        _rawPointsSize = rawPtsSize;
      }
      const rawPts = _rawPoints;
      for (let s = 0; s < count; s++) {
        const histSlot =
          ((historyIndex[index] - 1 - s + trailLength * 2) % trailLength) * 3 + ringOff;
        rawPts[s * 3] = positionHistory[histSlot];
        rawPts[s * 3 + 1] = positionHistory[histSlot + 1];
        rawPts[s * 3 + 2] = positionHistory[histSlot + 2];
      }
      let finalPts;
      let finalCount;
      if (useSmoothing && count >= 3) {
        const segmentCount = count - 1;
        finalCount = segmentCount * subdivisions + 1;
        const neededSize = finalCount * 3;
        if (!_smoothedPoints || _smoothedPointsSize < neededSize) {
          _smoothedPoints = new Float32Array(neededSize);
          _smoothedPointsSize = neededSize;
        }
        finalPts = _smoothedPoints;
        for (let seg = 0; seg < segmentCount; seg++) {
          const i0 = Math.max(0, seg - 1);
          const i1 = seg;
          const i2 = Math.min(count - 1, seg + 1);
          const i3 = Math.min(count - 1, seg + 2);
          const p0x = rawPts[i0 * 3],
            p0y = rawPts[i0 * 3 + 1],
            p0z = rawPts[i0 * 3 + 2];
          const p1x = rawPts[i1 * 3],
            p1y = rawPts[i1 * 3 + 1],
            p1z = rawPts[i1 * 3 + 2];
          const p2x = rawPts[i2 * 3],
            p2y = rawPts[i2 * 3 + 1],
            p2z = rawPts[i2 * 3 + 2];
          const p3x = rawPts[i3 * 3],
            p3y = rawPts[i3 * 3 + 1],
            p3z = rawPts[i3 * 3 + 2];
          for (let sub = 0; sub < subdivisions; sub++) {
            const t = sub / subdivisions;
            const outIdx = (seg * subdivisions + sub) * 3;
            catmullRom(
              finalPts,
              outIdx,
              p0x,
              p0y,
              p0z,
              p1x,
              p1y,
              p1z,
              p2x,
              p2y,
              p2z,
              p3x,
              p3y,
              p3z,
              t
            );
          }
        }
        const lastOutIdx = (finalCount - 1) * 3;
        finalPts[lastOutIdx] = rawPts[(count - 1) * 3];
        finalPts[lastOutIdx + 1] = rawPts[(count - 1) * 3 + 1];
        finalPts[lastOutIdx + 2] = rawPts[(count - 1) * 3 + 2];
      } else {
        finalPts = rawPts;
        finalCount = count;
      }
      if (finalCount > trailLength) finalCount = trailLength;
      if (useSmoothing && finalCount >= 2) {
        const MIN_SEG_DIST_SQ = 1e-4 * 1e-4;
        for (let d = 1; d < finalCount; d++) {
          const pi = (d - 1) * 3;
          const ci = d * 3;
          const dx = finalPts[ci] - finalPts[pi];
          const dy = finalPts[ci + 1] - finalPts[pi + 1];
          const dz = finalPts[ci + 2] - finalPts[pi + 2];
          if (dx * dx + dy * dy + dz * dz < MIN_SEG_DIST_SQ) {
            finalPts[ci] = finalPts[pi];
            finalPts[ci + 1] = finalPts[pi + 1];
            finalPts[ci + 2] = finalPts[pi + 2];
          }
        }
      }
      const prevFilledSlots = prevFilled ? prevFilled[index] : trailLength;
      if (prevFilled) prevFilled[index] = finalCount;
      for (let s = 0; s < trailLength; s++) {
        const vIdx = (vertBase + s * 2) * 3;
        const cIdx = (vertBase + s * 2) * 4;
        const aIdx = vertBase + s * 2;
        const uvIdxBase = (vertBase + s * 2) * 2;
        if (s >= finalCount) {
          if (s >= prevFilledSlots) break;
          clearTrailVertex(
            vIdx,
            cIdx,
            aIdx,
            uvIdxBase,
            trailPosArr,
            trailNextArr,
            trailHalfWidthArr,
            trailUVArr,
            trailAlphaArr,
            trailColorArr,
            px,
            py,
            pz
          );
          continue;
        }
        const hx = finalPts[s * 3];
        const hy = finalPts[s * 3 + 1];
        const hz = finalPts[s * 3 + 2];
        let nx, ny, nz;
        if (s > 0 && s < finalCount - 1) {
          const px2 = finalPts[(s - 1) * 3];
          const py2 = finalPts[(s - 1) * 3 + 1];
          const pz2 = finalPts[(s - 1) * 3 + 2];
          const nx2 = finalPts[(s + 1) * 3];
          const ny2 = finalPts[(s + 1) * 3 + 1];
          const nz2 = finalPts[(s + 1) * 3 + 2];
          const atx = nx2 - px2;
          const aty = ny2 - py2;
          const atz = nz2 - pz2;
          const atLen = Math.sqrt(atx * atx + aty * aty + atz * atz);
          if (atLen > 1e-4) {
            nx = hx + atx / atLen;
            ny = hy + aty / atLen;
            nz = hz + atz / atLen;
          } else {
            nx = finalPts[(s + 1) * 3];
            ny = finalPts[(s + 1) * 3 + 1];
            nz = finalPts[(s + 1) * 3 + 2];
          }
        } else if (s < finalCount - 1) {
          nx = finalPts[(s + 1) * 3];
          ny = finalPts[(s + 1) * 3 + 1];
          nz = finalPts[(s + 1) * 3 + 2];
        } else if (finalCount >= 2) {
          const prevX = finalPts[(s - 1) * 3];
          const prevY = finalPts[(s - 1) * 3 + 1];
          const prevZ = finalPts[(s - 1) * 3 + 2];
          nx = hx + (hx - prevX);
          ny = hy + (hy - prevY);
          nz = hz + (hz - prevZ);
        } else {
          nx = hx;
          ny = hy + 1e-3;
          nz = hz;
        }
        const t = finalCount > 1 ? s / (finalCount - 1) : 0;
        let timeFade = 1;
        if (maxTime > 0 && sampleTimes && effectiveCount > 0) {
          const sampleBase = index * trailLength;
          if (useSmoothing && rawCount >= 2) {
            const rawF = (s / Math.max(finalCount - 1, 1)) * (rawCount - 1);
            const rawLo = Math.min(Math.floor(rawF), rawCount - 1);
            const rawHi = Math.min(rawLo + 1, rawCount - 1);
            const frac = rawF - rawLo;
            const slotLo = (historyIndex[index] - 1 - rawLo + trailLength * 2) % trailLength;
            const slotHi = (historyIndex[index] - 1 - rawHi + trailLength * 2) % trailLength;
            const ageLo = now - sampleTimes[sampleBase + slotLo];
            const ageHi = now - sampleTimes[sampleBase + slotHi];
            const age = ageLo + (ageHi - ageLo) * frac;
            timeFade = 1 - Math.min(age / maxTimeMs, 1);
          } else {
            const rawS = Math.min(s, rawCount - 1);
            const sampleSlot = (historyIndex[index] - 1 - rawS + trailLength * 2) % trailLength;
            const age = now - sampleTimes[sampleBase + sampleSlot];
            timeFade = 1 - Math.min(age / maxTimeMs, 1);
          }
        }
        const widthScale = trailWidthCurveFn(t);
        const opacityScale = trailOpacityCurveFn(t);
        const halfWidth = ribbonWidth * widthScale * 0.5;
        const alpha = ca * opacityScale * timeFade;
        const fr = trailColorOverTrailFns ? cr * trailColorOverTrailFns.r(t) : cr;
        const fg = trailColorOverTrailFns ? cg * trailColorOverTrailFns.g(t) : cg;
        const fb = trailColorOverTrailFns ? cb * trailColorOverTrailFns.b(t) : cb;
        writeTrailVertex(
          vIdx,
          cIdx,
          aIdx,
          uvIdxBase,
          hx,
          hy,
          hz,
          nx,
          ny,
          nz,
          halfWidth,
          t,
          alpha,
          fr,
          fg,
          fb,
          ca,
          trailPosArr,
          trailNextArr,
          trailHalfWidthArr,
          trailUVArr,
          trailAlphaArr,
          trailColorArr
        );
      }
      if (useTwistPrevention && prevNormal && finalCount >= 2) {
        const nIdx = index * 3;
        const tx = finalPts[3] - finalPts[0];
        const ty = finalPts[4] - finalPts[1];
        const tz = finalPts[5] - finalPts[2];
        const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
        if (tLen > 1e-4) {
          const ntx = tx / tLen;
          const nty = ty / tLen;
          const ntz = tz / tLen;
          let upx = 0,
            upy = 1,
            upz = 0;
          const dot = ntx * upx + nty * upy + ntz * upz;
          if (Math.abs(dot) > 0.999) {
            upx = 1;
            upy = 0;
            upz = 0;
          }
          let cnx = nty * upz - ntz * upy;
          let cny = ntz * upx - ntx * upz;
          let cnz = ntx * upy - nty * upx;
          const cnLen = Math.sqrt(cnx * cnx + cny * cny + cnz * cnz);
          if (cnLen > 1e-4) {
            cnx /= cnLen;
            cny /= cnLen;
            cnz /= cnLen;
          }
          const prevNx = prevNormal[nIdx];
          const prevNy = prevNormal[nIdx + 1];
          const prevNz = prevNormal[nIdx + 2];
          const hasPrev = prevNx !== 0 || prevNy !== 0 || prevNz !== 0;
          if (hasPrev) {
            const normalDot = cnx * prevNx + cny * prevNy + cnz * prevNz;
            if (normalDot < 0) {
              for (let s = 0; s < Math.min(finalCount, trailLength); s++) {
                const aIdx = vertBase + s * 2;
                const hw = trailHalfWidthArr[aIdx];
                trailHalfWidthArr[aIdx] = -hw;
                trailHalfWidthArr[aIdx + 1] = -hw;
              }
              cnx = -cnx;
              cny = -cny;
              cnz = -cnz;
            }
          }
          prevNormal[nIdx] = cnx;
          prevNormal[nIdx + 1] = cny;
          prevNormal[nIdx + 2] = cnz;
        }
      }
    } else if (historyCount[index] > 0 || (prevFilled && prevFilled[index] > 0)) {
      hasUpdates = true;
      historyCount[index] = 0;
      historyIndex[index] = 0;
      const clearSlots = prevFilled ? prevFilled[index] : trailLength;
      if (prevFilled) prevFilled[index] = 0;
      for (let s = 0; s < clearSlots; s++) {
        const vIdx = (vertBase + s * 2) * 3;
        const cIdx = (vertBase + s * 2) * 4;
        const aIdx = vertBase + s * 2;
        const uvIdxBase = (vertBase + s * 2) * 2;
        clearTrailVertex(
          vIdx,
          cIdx,
          aIdx,
          uvIdxBase,
          trailPosArr,
          trailNextArr,
          trailHalfWidthArr,
          trailUVArr,
          trailAlphaArr,
          trailColorArr,
          0,
          0,
          0
        );
      }
    }
  }
  if (useRibbon && _ribbonCount >= 2 && _ribbonIndices) {
    hasUpdates = true;
    const leader = _ribbonIndices[0];
    const leaderVertBase = leader * verticesPerParticle;
    const controlCount = _ribbonCount;
    const filledCount = Math.min(trailLength, Math.max(controlCount * 4, controlCount));
    const chainSize = filledCount * 3;
    if (!_rawPoints || _rawPointsSize < chainSize) {
      _rawPoints = new Float32Array(chainSize);
      _rawPointsSize = chainSize;
    }
    if (controlCount === 2) {
      const p0Idx = _ribbonIndices[0] * 3;
      const p1Idx = _ribbonIndices[1] * 3;
      for (let i = 0; i < filledCount; i++) {
        const t = i / (filledCount - 1);
        _rawPoints[i * 3] = positionArr[p0Idx] + t * (positionArr[p1Idx] - positionArr[p0Idx]);
        _rawPoints[i * 3 + 1] =
          positionArr[p0Idx + 1] + t * (positionArr[p1Idx + 1] - positionArr[p0Idx + 1]);
        _rawPoints[i * 3 + 2] =
          positionArr[p0Idx + 2] + t * (positionArr[p1Idx + 2] - positionArr[p0Idx + 2]);
      }
    } else {
      const segments = controlCount - 1;
      const ptsPerSeg = Math.max(1, Math.floor((filledCount - 1) / segments));
      let wi = 0;
      for (let seg = 0; seg < segments && wi < filledCount; seg++) {
        const i0 = Math.max(0, seg - 1);
        const i1 = seg;
        const i2 = Math.min(controlCount - 1, seg + 1);
        const i3 = Math.min(controlCount - 1, seg + 2);
        const p0i = _ribbonIndices[i0] * 3;
        const p1i = _ribbonIndices[i1] * 3;
        const p2i = _ribbonIndices[i2] * 3;
        const p3i = _ribbonIndices[i3] * 3;
        const subCount = seg === segments - 1 ? filledCount - wi : ptsPerSeg;
        for (let sub = 0; sub < subCount && wi < filledCount; sub++) {
          const t = sub / subCount;
          catmullRom(
            _rawPoints,
            wi * 3,
            positionArr[p0i],
            positionArr[p0i + 1],
            positionArr[p0i + 2],
            positionArr[p1i],
            positionArr[p1i + 1],
            positionArr[p1i + 2],
            positionArr[p2i],
            positionArr[p2i + 1],
            positionArr[p2i + 2],
            positionArr[p3i],
            positionArr[p3i + 1],
            positionArr[p3i + 2],
            t
          );
          wi++;
        }
      }
      if (wi > 0) {
        const lastPIdx = _ribbonIndices[controlCount - 1] * 3;
        _rawPoints[(wi - 1) * 3] = positionArr[lastPIdx];
        _rawPoints[(wi - 1) * 3 + 1] = positionArr[lastPIdx + 1];
        _rawPoints[(wi - 1) * 3 + 2] = positionArr[lastPIdx + 2];
      }
    }
    const leaderBase = leader * SCALAR_STRIDE;
    const leaderCr = trailScalarArr[leaderBase + S_COLOR_R];
    const leaderCg = trailScalarArr[leaderBase + S_COLOR_G];
    const leaderCb = trailScalarArr[leaderBase + S_COLOR_B];
    const leaderCa = trailScalarArr[leaderBase + S_COLOR_A];
    const leaderPrevFilled = prevFilled ? prevFilled[leader] : trailLength;
    if (prevFilled) prevFilled[leader] = filledCount;
    for (let s = 0; s < trailLength; s++) {
      const vIdx = (leaderVertBase + s * 2) * 3;
      const cIdx = (leaderVertBase + s * 2) * 4;
      const aIdx = leaderVertBase + s * 2;
      const uvIdxBase = (leaderVertBase + s * 2) * 2;
      if (s >= filledCount) {
        if (s >= leaderPrevFilled) break;
        clearTrailVertex(
          vIdx,
          cIdx,
          aIdx,
          uvIdxBase,
          trailPosArr,
          trailNextArr,
          trailHalfWidthArr,
          trailUVArr,
          trailAlphaArr,
          trailColorArr,
          0,
          0,
          0
        );
        continue;
      }
      const ptIdx = s * 3;
      const ptx = _rawPoints[ptIdx];
      const pty = _rawPoints[ptIdx + 1];
      const ptz = _rawPoints[ptIdx + 2];
      let nx, ny, nz;
      if (s > 0 && s < filledCount - 1) {
        const px2 = _rawPoints[(s - 1) * 3];
        const py2 = _rawPoints[(s - 1) * 3 + 1];
        const pz2 = _rawPoints[(s - 1) * 3 + 2];
        const nx2 = _rawPoints[(s + 1) * 3];
        const ny2 = _rawPoints[(s + 1) * 3 + 1];
        const nz2 = _rawPoints[(s + 1) * 3 + 2];
        const atx = nx2 - px2;
        const aty = ny2 - py2;
        const atz = nz2 - pz2;
        const atLen = Math.sqrt(atx * atx + aty * aty + atz * atz);
        if (atLen > 1e-4) {
          nx = ptx + atx / atLen;
          ny = pty + aty / atLen;
          nz = ptz + atz / atLen;
        } else {
          nx = _rawPoints[(s + 1) * 3];
          ny = _rawPoints[(s + 1) * 3 + 1];
          nz = _rawPoints[(s + 1) * 3 + 2];
        }
      } else if (s < filledCount - 1) {
        nx = _rawPoints[(s + 1) * 3];
        ny = _rawPoints[(s + 1) * 3 + 1];
        nz = _rawPoints[(s + 1) * 3 + 2];
      } else if (filledCount >= 2) {
        const prevX = _rawPoints[(s - 1) * 3];
        const prevY = _rawPoints[(s - 1) * 3 + 1];
        const prevZ = _rawPoints[(s - 1) * 3 + 2];
        nx = ptx + (ptx - prevX);
        ny = pty + (pty - prevY);
        nz = ptz + (ptz - prevZ);
      } else {
        nx = ptx;
        ny = pty + 1e-3;
        nz = ptz;
      }
      const t = filledCount > 1 ? s / (filledCount - 1) : 0;
      let ribbonTimeFade = 1;
      if (maxTime > 0 && controlCount >= 2) {
        const ctrlF = t * (controlCount - 1);
        const ctrlLo = Math.min(Math.floor(ctrlF), controlCount - 1);
        const ctrlHi = Math.min(ctrlLo + 1, controlCount - 1);
        const frac = ctrlF - ctrlLo;
        const ageLo = now - generalData.creationTimes[_ribbonIndices[ctrlLo]];
        const ageHi = now - generalData.creationTimes[_ribbonIndices[ctrlHi]];
        const age = ageLo + (ageHi - ageLo) * frac;
        ribbonTimeFade = 1 - Math.min(age / maxTimeMs, 1);
      }
      const widthScale = trailWidthCurveFn(t);
      const opacityScale = trailOpacityCurveFn(t);
      const halfWidth = trailConfig.width * widthScale * 0.5;
      const alpha = leaderCa * opacityScale * ribbonTimeFade;
      const fr = trailColorOverTrailFns ? leaderCr * trailColorOverTrailFns.r(t) : leaderCr;
      const fg = trailColorOverTrailFns ? leaderCg * trailColorOverTrailFns.g(t) : leaderCg;
      const fb = trailColorOverTrailFns ? leaderCb * trailColorOverTrailFns.b(t) : leaderCb;
      writeTrailVertex(
        vIdx,
        cIdx,
        aIdx,
        uvIdxBase,
        ptx,
        pty,
        ptz,
        nx,
        ny,
        nz,
        halfWidth,
        t,
        alpha,
        fr,
        fg,
        fb,
        leaderCa,
        trailPosArr,
        trailNextArr,
        trailHalfWidthArr,
        trailUVArr,
        trailAlphaArr,
        trailColorArr
      );
    }
    if (useTwistPrevention && prevNormal && filledCount >= 2) {
      const nIdx = leader * 3;
      const tx = _rawPoints[3] - _rawPoints[0];
      const ty = _rawPoints[4] - _rawPoints[1];
      const tz = _rawPoints[5] - _rawPoints[2];
      const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
      if (tLen > 1e-4) {
        const ntx = tx / tLen;
        const nty = ty / tLen;
        const ntz = tz / tLen;
        let upx = 0,
          upy = 1,
          upz = 0;
        const dot = ntx * upx + nty * upy + ntz * upz;
        if (Math.abs(dot) > 0.999) {
          upx = 1;
          upy = 0;
          upz = 0;
        }
        let cnx = nty * upz - ntz * upy;
        let cny = ntz * upx - ntx * upz;
        let cnz = ntx * upy - nty * upx;
        const cnLen = Math.sqrt(cnx * cnx + cny * cny + cnz * cnz);
        if (cnLen > 1e-4) {
          cnx /= cnLen;
          cny /= cnLen;
          cnz /= cnLen;
        }
        const prevNx = prevNormal[nIdx];
        const prevNy = prevNormal[nIdx + 1];
        const prevNz = prevNormal[nIdx + 2];
        const hasPrev = prevNx !== 0 || prevNy !== 0 || prevNz !== 0;
        if (hasPrev) {
          const normalDot = cnx * prevNx + cny * prevNy + cnz * prevNz;
          if (normalDot < 0) {
            for (let s = 0; s < Math.min(filledCount, trailLength); s++) {
              const aIdx = leaderVertBase + s * 2;
              const hw = trailHalfWidthArr[aIdx];
              trailHalfWidthArr[aIdx] = -hw;
              trailHalfWidthArr[aIdx + 1] = -hw;
            }
            cnx = -cnx;
            cny = -cny;
            cnz = -cnz;
          }
        }
        prevNormal[nIdx] = cnx;
        prevNormal[nIdx + 1] = cny;
        prevNormal[nIdx + 2] = cnz;
      }
    }
    for (let ri = 1; ri < _ribbonCount; ri++) {
      const pIdx = _ribbonIndices[ri];
      const pVertBase = pIdx * verticesPerParticle;
      const pClearSlots = prevFilled ? prevFilled[pIdx] : trailLength;
      if (prevFilled) prevFilled[pIdx] = 0;
      for (let s = 0; s < pClearSlots; s++) {
        const vIdx = (pVertBase + s * 2) * 3;
        const cIdx = (pVertBase + s * 2) * 4;
        const aIdx = pVertBase + s * 2;
        const uvIdxBase = (pVertBase + s * 2) * 2;
        clearTrailVertex(
          vIdx,
          cIdx,
          aIdx,
          uvIdxBase,
          trailPosArr,
          trailNextArr,
          trailHalfWidthArr,
          trailUVArr,
          trailAlphaArr,
          trailColorArr,
          0,
          0,
          0
        );
      }
    }
  }
  if (hasUpdates) {
    trailPositionAttr.needsUpdate = true;
    trailAlphaAttr.needsUpdate = true;
    trailColorAttr.needsUpdate = true;
    trailNextAttrCached.needsUpdate = true;
    trailHalfWidthAttrCached.needsUpdate = true;
    trailUVAttrCached.needsUpdate = true;
  }
};
var updateParticleSystems = (cycleData) => {
  createdParticleSystems.forEach((props) => updateParticleSystemInstance(props, cycleData));
};

// src/js/effects/three-particles/three-particles-serialization.ts
var SERIALIZATION_VERSION = 1;
var reverseBlendingMap = new Map(Object.entries(blendingMap).map(([k, v]) => [v, k]));
var reverseCurveFunctionMap = /* @__PURE__ */ new Map();
for (const [id, fn] of Object.entries(curveFunctionIdMap)) {
  if (fn) reverseCurveFunctionMap.set(fn, id);
}
function serializeAny(value, key) {
  if (value === null || value === void 0) return value;
  if (value instanceof THREE3.Vector3) return { x: value.x, y: value.y, z: value.z };
  if (value instanceof THREE3.Vector2) return { x: value.x, y: value.y };
  if (value instanceof THREE3.Texture) return void 0;
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
  return new THREE3.Vector3(x, y, z);
}
function deserializeVector2(raw) {
  if (!raw || typeof raw !== 'object') return void 0;
  const { x = 1, y = 1 } = raw;
  return new THREE3.Vector2(x, y);
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
        ? (blendingMap[r['blending']] ?? THREE3.NormalBlending)
        : (r['blending'] ?? THREE3.NormalBlending);
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
  CollisionPlaneMode,
  CurveFunctionId,
  EmitFrom,
  ForceFieldFalloff,
  ForceFieldType,
  LifeTimeCurve,
  REVISION,
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
  applyModifiers,
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
  curveFunctionIdMap,
  deserializeParticleSystem,
  getBezierCacheSize,
  getCurveFunction,
  getCurveFunctionFromConfig,
  getDefaultParticleSystemConfig,
  isComputeCapableRenderer,
  isLifeTimeCurve,
  linearToSRGB,
  normalizeBackgroundToVector3,
  normalizeDepthTextureValue,
  normalizeTextureValue,
  normalizeVector2Value,
  registerTSLMaterialFactory,
  removeBezierCurveFunction,
  resolveSimulationBackend,
  resolveWebGPUEffectiveRendererType,
  rgbSRGBToLinear,
  sRGBToLinear,
  serializeParticleSystem,
  updateParticleSystems,
};
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
