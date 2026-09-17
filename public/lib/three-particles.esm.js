import Easing from 'easing-functions';
import * as THREE5 from 'three';
import { ObjectUtils } from '@newkrok/three-utils';
import { FBM } from 'three-noise/build/three-noise.module.js';

// src/js/effects/three-particles/version.ts
var REVISION = "3.0.0" ;
if (typeof globalThis !== "undefined") {
  const g = globalThis;
  if (g.__THREE_PARTICLES__ && g.__THREE_PARTICLES__ !== REVISION) {
    console.warn(
      "WARNING: Multiple instances of @cyberluke/three-particles being imported."
    );
  } else {
    g.__THREE_PARTICLES__ = REVISION;
  }
}

// src/js/effects/three-particles/color-utils.ts
var sRGBToLinear = (c) => c < 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
var linearToSRGB = (c) => c < 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
var rgbSRGBToLinear = (c) => ({
  r: sRGBToLinear(c.r ?? 0),
  g: sRGBToLinear(c.g ?? 0),
  b: sRGBToLinear(c.b ?? 0)
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
var removeBezierCurveFunction = (particleSystemId) => {
  while (true) {
    const index = cache.findIndex(
      (item) => item.referencedBy.includes(particleSystemId)
    );
    if (index === -1) break;
    const entry = cache[index];
    entry.referencedBy = entry.referencedBy.filter(
      (id) => id !== particleSystemId
    );
    if (entry.referencedBy.length === 0) cache.splice(index, 1);
  }
};
var getBezierCacheSize = () => cache.length;
var CurveFunctionId = /* @__PURE__ */ ((CurveFunctionId3) => {
  CurveFunctionId3["BEZIER"] = "BEZIER";
  CurveFunctionId3["LINEAR"] = "LINEAR";
  CurveFunctionId3["QUADRATIC_IN"] = "QUADRATIC_IN";
  CurveFunctionId3["QUADRATIC_OUT"] = "QUADRATIC_OUT";
  CurveFunctionId3["QUADRATIC_IN_OUT"] = "QUADRATIC_IN_OUT";
  CurveFunctionId3["CUBIC_IN"] = "CUBIC_IN";
  CurveFunctionId3["CUBIC_OUT"] = "CUBIC_OUT";
  CurveFunctionId3["CUBIC_IN_OUT"] = "CUBIC_IN_OUT";
  CurveFunctionId3["QUARTIC_IN"] = "QUARTIC_IN";
  CurveFunctionId3["QUARTIC_OUT"] = "QUARTIC_OUT";
  CurveFunctionId3["QUARTIC_IN_OUT"] = "QUARTIC_IN_OUT";
  CurveFunctionId3["QUINTIC_IN"] = "QUINTIC_IN";
  CurveFunctionId3["QUINTIC_OUT"] = "QUINTIC_OUT";
  CurveFunctionId3["QUINTIC_IN_OUT"] = "QUINTIC_IN_OUT";
  CurveFunctionId3["SINUSOIDAL_IN"] = "SINUSOIDAL_IN";
  CurveFunctionId3["SINUSOIDAL_OUT"] = "SINUSOIDAL_OUT";
  CurveFunctionId3["SINUSOIDAL_IN_OUT"] = "SINUSOIDAL_IN_OUT";
  CurveFunctionId3["EXPONENTIAL_IN"] = "EXPONENTIAL_IN";
  CurveFunctionId3["EXPONENTIAL_OUT"] = "EXPONENTIAL_OUT";
  CurveFunctionId3["EXPONENTIAL_IN_OUT"] = "EXPONENTIAL_IN_OUT";
  CurveFunctionId3["CIRCULAR_IN"] = "CIRCULAR_IN";
  CurveFunctionId3["CIRCULAR_OUT"] = "CIRCULAR_OUT";
  CurveFunctionId3["CIRCULAR_IN_OUT"] = "CIRCULAR_IN_OUT";
  CurveFunctionId3["ELASTIC_IN"] = "ELASTIC_IN";
  CurveFunctionId3["ELASTIC_OUT"] = "ELASTIC_OUT";
  CurveFunctionId3["ELASTIC_IN_OUT"] = "ELASTIC_IN_OUT";
  CurveFunctionId3["BACK_IN"] = "BACK_IN";
  CurveFunctionId3["BACK_OUT"] = "BACK_OUT";
  CurveFunctionId3["BACK_IN_OUT"] = "BACK_IN_OUT";
  CurveFunctionId3["BOUNCE_IN"] = "BOUNCE_IN";
  CurveFunctionId3["BOUNCE_OUT"] = "BOUNCE_OUT";
  CurveFunctionId3["BOUNCE_IN_OUT"] = "BOUNCE_IN_OUT";
  return CurveFunctionId3;
})(CurveFunctionId || {});
var curveFunctionIdMap = {
  ["LINEAR" /* LINEAR */]: Easing.Linear.None,
  ["QUADRATIC_IN" /* QUADRATIC_IN */]: Easing.Quadratic.In,
  ["QUADRATIC_OUT" /* QUADRATIC_OUT */]: Easing.Quadratic.Out,
  ["QUADRATIC_IN_OUT" /* QUADRATIC_IN_OUT */]: Easing.Quadratic.InOut,
  ["CUBIC_IN" /* CUBIC_IN */]: Easing.Cubic.In,
  ["CUBIC_OUT" /* CUBIC_OUT */]: Easing.Cubic.Out,
  ["CUBIC_IN_OUT" /* CUBIC_IN_OUT */]: Easing.Cubic.InOut,
  ["QUARTIC_IN" /* QUARTIC_IN */]: Easing.Quartic.In,
  ["QUARTIC_OUT" /* QUARTIC_OUT */]: Easing.Quartic.Out,
  ["QUARTIC_IN_OUT" /* QUARTIC_IN_OUT */]: Easing.Quartic.InOut,
  ["QUINTIC_IN" /* QUINTIC_IN */]: Easing.Quintic.In,
  ["QUINTIC_OUT" /* QUINTIC_OUT */]: Easing.Quintic.Out,
  ["QUINTIC_IN_OUT" /* QUINTIC_IN_OUT */]: Easing.Quintic.InOut,
  ["SINUSOIDAL_IN" /* SINUSOIDAL_IN */]: Easing.Sinusoidal.In,
  ["SINUSOIDAL_OUT" /* SINUSOIDAL_OUT */]: Easing.Sinusoidal.Out,
  ["SINUSOIDAL_IN_OUT" /* SINUSOIDAL_IN_OUT */]: Easing.Sinusoidal.InOut,
  ["EXPONENTIAL_IN" /* EXPONENTIAL_IN */]: Easing.Exponential.In,
  ["EXPONENTIAL_OUT" /* EXPONENTIAL_OUT */]: Easing.Exponential.Out,
  ["EXPONENTIAL_IN_OUT" /* EXPONENTIAL_IN_OUT */]: Easing.Exponential.InOut,
  ["CIRCULAR_IN" /* CIRCULAR_IN */]: Easing.Circular.In,
  ["CIRCULAR_OUT" /* CIRCULAR_OUT */]: Easing.Circular.Out,
  ["CIRCULAR_IN_OUT" /* CIRCULAR_IN_OUT */]: Easing.Circular.InOut,
  ["ELASTIC_IN" /* ELASTIC_IN */]: Easing.Elastic.In,
  ["ELASTIC_OUT" /* ELASTIC_OUT */]: Easing.Elastic.Out,
  ["ELASTIC_IN_OUT" /* ELASTIC_IN_OUT */]: Easing.Elastic.InOut,
  ["BACK_IN" /* BACK_IN */]: Easing.Back.In,
  ["BACK_OUT" /* BACK_OUT */]: Easing.Back.Out,
  ["BACK_IN_OUT" /* BACK_IN_OUT */]: Easing.Back.InOut,
  ["BOUNCE_IN" /* BOUNCE_IN */]: Easing.Bounce.In,
  ["BOUNCE_OUT" /* BOUNCE_OUT */]: Easing.Bounce.Out,
  ["BOUNCE_IN_OUT" /* BOUNCE_IN_OUT */]: Easing.Bounce.InOut
};
var getCurveFunction = (curveFunctionId) => typeof curveFunctionId === "function" ? curveFunctionId : curveFunctionIdMap[curveFunctionId];

// src/js/effects/three-particles/three-particles-enums.ts
var SimulationSpace = /* @__PURE__ */ ((SimulationSpace2) => {
  SimulationSpace2["LOCAL"] = "LOCAL";
  SimulationSpace2["WORLD"] = "WORLD";
  return SimulationSpace2;
})(SimulationSpace || {});
var Shape = /* @__PURE__ */ ((Shape2) => {
  Shape2["SPHERE"] = "SPHERE";
  Shape2["CONE"] = "CONE";
  Shape2["BOX"] = "BOX";
  Shape2["CIRCLE"] = "CIRCLE";
  Shape2["RECTANGLE"] = "RECTANGLE";
  return Shape2;
})(Shape || {});
var EmitFrom = /* @__PURE__ */ ((EmitFrom2) => {
  EmitFrom2["VOLUME"] = "VOLUME";
  EmitFrom2["SHELL"] = "SHELL";
  EmitFrom2["EDGE"] = "EDGE";
  return EmitFrom2;
})(EmitFrom || {});
var TimeMode = /* @__PURE__ */ ((TimeMode2) => {
  TimeMode2["LIFETIME"] = "LIFETIME";
  TimeMode2["FPS"] = "FPS";
  return TimeMode2;
})(TimeMode || {});
var LifeTimeCurve = /* @__PURE__ */ ((LifeTimeCurve2) => {
  LifeTimeCurve2["BEZIER"] = "BEZIER";
  LifeTimeCurve2["EASING"] = "EASING";
  return LifeTimeCurve2;
})(LifeTimeCurve || {});
var SubEmitterTrigger = /* @__PURE__ */ ((SubEmitterTrigger2) => {
  SubEmitterTrigger2["BIRTH"] = "BIRTH";
  SubEmitterTrigger2["DEATH"] = "DEATH";
  return SubEmitterTrigger2;
})(SubEmitterTrigger || {});
var ForceFieldType = /* @__PURE__ */ ((ForceFieldType3) => {
  ForceFieldType3["POINT"] = "POINT";
  ForceFieldType3["DIRECTIONAL"] = "DIRECTIONAL";
  return ForceFieldType3;
})(ForceFieldType || {});
var RendererType = /* @__PURE__ */ ((RendererType2) => {
  RendererType2["POINTS"] = "POINTS";
  RendererType2["INSTANCED"] = "INSTANCED";
  RendererType2["TRAIL"] = "TRAIL";
  RendererType2["MESH"] = "MESH";
  return RendererType2;
})(RendererType || {});
var ForceFieldFalloff = /* @__PURE__ */ ((ForceFieldFalloff3) => {
  ForceFieldFalloff3["NONE"] = "NONE";
  ForceFieldFalloff3["LINEAR"] = "LINEAR";
  ForceFieldFalloff3["QUADRATIC"] = "QUADRATIC";
  return ForceFieldFalloff3;
})(ForceFieldFalloff || {});
var CollisionPlaneMode = /* @__PURE__ */ ((CollisionPlaneMode3) => {
  CollisionPlaneMode3["KILL"] = "KILL";
  CollisionPlaneMode3["CLAMP"] = "CLAMP";
  CollisionPlaneMode3["BOUNCE"] = "BOUNCE";
  return CollisionPlaneMode3;
})(CollisionPlaneMode || {});
var SimulationBackend = /* @__PURE__ */ ((SimulationBackend2) => {
  SimulationBackend2["AUTO"] = "AUTO";
  SimulationBackend2["CPU"] = "CPU";
  SimulationBackend2["GPU"] = "GPU";
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
var calculateRandomPositionAndVelocityOnSphere = (position, quaternion, velocity, speed, {
  radius,
  radiusThickness,
  arc
}) => {
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
  position.x = radius * normalizedThickness * xDirection + radius * radiusThickness * randomizedDistanceRatio * xDirection;
  position.y = radius * normalizedThickness * yDirection + radius * radiusThickness * randomizedDistanceRatio * yDirection;
  position.z = radius * normalizedThickness * zDirection + radius * radiusThickness * randomizedDistanceRatio * zDirection;
  position.applyQuaternion(quaternion);
  const speedMultiplierByPosition = 1 / position.length();
  velocity.set(
    position.x * speedMultiplierByPosition * speed,
    position.y * speedMultiplierByPosition * speed,
    position.z * speedMultiplierByPosition * speed
  );
  velocity.applyQuaternion(quaternion);
};
var calculateRandomPositionAndVelocityOnCone = (position, quaternion, velocity, speed, {
  radius,
  radiusThickness,
  arc,
  angle = 90
}) => {
  const theta = 2 * Math.PI * Math.random() * (arc / 360);
  const randomizedDistanceRatio = Math.random();
  const xDirection = Math.cos(theta);
  const yDirection = Math.sin(theta);
  const normalizedThickness = 1 - radiusThickness;
  position.x = radius * normalizedThickness * xDirection + radius * radiusThickness * randomizedDistanceRatio * xDirection;
  position.y = radius * normalizedThickness * yDirection + radius * radiusThickness * randomizedDistanceRatio * yDirection;
  position.z = 0;
  position.applyQuaternion(quaternion);
  const positionLength = position.length();
  const normalizedAngle = Math.abs(
    positionLength / radius * THREE5.MathUtils.degToRad(angle)
  );
  const sinNormalizedAngle = Math.sin(normalizedAngle);
  const speedMultiplierByPosition = 1 / positionLength;
  velocity.set(
    position.x * sinNormalizedAngle * speedMultiplierByPosition * speed,
    position.y * sinNormalizedAngle * speedMultiplierByPosition * speed,
    Math.cos(normalizedAngle) * speed
  );
  velocity.applyQuaternion(quaternion);
};
var calculateRandomPositionAndVelocityOnBox = (position, quaternion, velocity, speed, { scale, emitFrom }) => {
  const _scale = scale;
  switch (emitFrom) {
    case "VOLUME" /* VOLUME */:
      position.x = Math.random() * _scale.x - _scale.x / 2;
      position.y = Math.random() * _scale.y - _scale.y / 2;
      position.z = Math.random() * _scale.z - _scale.z / 2;
      break;
    case "SHELL" /* SHELL */:
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
    case "EDGE" /* EDGE */:
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
var calculateRandomPositionAndVelocityOnCircle = (position, quaternion, velocity, speed, {
  radius,
  radiusThickness,
  arc
}) => {
  const theta = 2 * Math.PI * Math.random() * (arc / 360);
  const randomizedDistanceRatio = Math.random();
  const xDirection = Math.cos(theta);
  const yDirection = Math.sin(theta);
  const normalizedThickness = 1 - radiusThickness;
  position.x = radius * normalizedThickness * xDirection + radius * radiusThickness * randomizedDistanceRatio * xDirection;
  position.y = radius * normalizedThickness * yDirection + radius * radiusThickness * randomizedDistanceRatio * yDirection;
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
var calculateRandomPositionAndVelocityOnRectangle = (position, quaternion, velocity, speed, { rotation, scale }) => {
  const _scale = scale;
  const _rotation = rotation;
  const xOffset = Math.random() * _scale.x - _scale.x / 2;
  const yOffset = Math.random() * _scale.y - _scale.y / 2;
  const rotationX = THREE5.MathUtils.degToRad(_rotation.x);
  const rotationY = THREE5.MathUtils.degToRad(_rotation.y);
  position.x = xOffset * Math.cos(rotationY);
  position.y = yOffset * Math.cos(rotationX);
  position.z = xOffset * Math.sin(rotationY) - yOffset * Math.sin(rotationX);
  position.applyQuaternion(quaternion);
  velocity.set(0, 0, speed);
  velocity.applyQuaternion(quaternion);
};
var createDefaultMeshTexture = () => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "white";
      context.fillRect(0, 0, 1, 1);
      const texture = new THREE5.CanvasTexture(canvas);
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
    const canvas = document.createElement("canvas");
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (context) {
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 2;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
      context.fillStyle = "white";
      context.fill();
      const texture = new THREE5.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    } else {
      console.warn(
        "Could not get 2D context to generate default particle texture."
      );
      return null;
    }
  } catch (error) {
    console.warn("Error creating default particle texture:", error);
    return null;
  }
};
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
    return THREE5.MathUtils.randFloat(value.min ?? 0, value.max ?? 1);
  }
  const lifetimeCurve = value;
  return getCurveFunctionFromConfig(particleSystemId, lifetimeCurve)(time) * (lifetimeCurve.scale ?? 1);
};

// src/js/effects/three-particles/three-particles-modifiers.ts
var noiseInput = new THREE5.Vector3(0, 0, 0);
var orbitalEuler = new THREE5.Euler();
var applyModifiers = ({
  delta,
  generalData,
  normalizedConfig,
  attributes,
  scalarArray,
  particleLifetimePercentage,
  particleIndex
}) => {
  const {
    particleSystemId,
    startValues,
    lifetimeValues,
    linearVelocityData,
    orbitalVelocityData,
    noise
  } = generalData;
  const positionIndex = particleIndex * 3;
  const positionArr = attributes.position.array;
  const base = particleIndex * SCALAR_STRIDE;
  if (linearVelocityData) {
    const { speed, valueModifiers } = linearVelocityData[particleIndex];
    const normalizedXSpeed = valueModifiers.x ? valueModifiers.x(particleLifetimePercentage) : speed.x;
    const normalizedYSpeed = valueModifiers.y ? valueModifiers.y(particleLifetimePercentage) : speed.y;
    const normalizedZSpeed = valueModifiers.z ? valueModifiers.z(particleLifetimePercentage) : speed.z;
    positionArr[positionIndex] += normalizedXSpeed * delta;
    positionArr[positionIndex + 1] += normalizedYSpeed * delta;
    positionArr[positionIndex + 2] += normalizedZSpeed * delta;
    attributes.position.needsUpdate = true;
  }
  if (orbitalVelocityData) {
    const { speed, positionOffset, valueModifiers } = orbitalVelocityData[particleIndex];
    positionArr[positionIndex] -= positionOffset.x;
    positionArr[positionIndex + 1] -= positionOffset.y;
    positionArr[positionIndex + 2] -= positionOffset.z;
    const normalizedXSpeed = valueModifiers.x ? valueModifiers.x(particleLifetimePercentage) : speed.x;
    const normalizedYSpeed = valueModifiers.y ? valueModifiers.y(particleLifetimePercentage) : speed.y;
    const normalizedZSpeed = valueModifiers.z ? valueModifiers.z(particleLifetimePercentage) : speed.z;
    orbitalEuler.set(
      normalizedXSpeed * delta,
      normalizedZSpeed * delta,
      normalizedYSpeed * delta
    );
    positionOffset.applyEuler(orbitalEuler);
    positionArr[positionIndex] += positionOffset.x;
    positionArr[positionIndex + 1] += positionOffset.y;
    positionArr[positionIndex + 2] += positionOffset.z;
    attributes.position.needsUpdate = true;
  }
  if (normalizedConfig.sizeOverLifetime.isActive) {
    const multiplier = calculateValue(
      particleSystemId,
      normalizedConfig.sizeOverLifetime.lifetimeCurve,
      particleLifetimePercentage
    );
    scalarArray[base + S_SIZE] = startValues.startSize[particleIndex] * multiplier;
  }
  if (normalizedConfig.opacityOverLifetime.isActive) {
    const multiplier = calculateValue(
      particleSystemId,
      normalizedConfig.opacityOverLifetime.lifetimeCurve,
      particleLifetimePercentage
    );
    scalarArray[base + S_COLOR_A] = startValues.startOpacity[particleIndex] * multiplier;
  }
  if (normalizedConfig.colorOverLifetime.isActive) {
    const rMultiplier = calculateValue(
      particleSystemId,
      normalizedConfig.colorOverLifetime.r,
      particleLifetimePercentage
    );
    const gMultiplier = calculateValue(
      particleSystemId,
      normalizedConfig.colorOverLifetime.g,
      particleLifetimePercentage
    );
    const bMultiplier = calculateValue(
      particleSystemId,
      normalizedConfig.colorOverLifetime.b,
      particleLifetimePercentage
    );
    scalarArray[base + S_COLOR_R] = startValues.startColorR[particleIndex] * rMultiplier;
    scalarArray[base + S_COLOR_G] = startValues.startColorG[particleIndex] * gMultiplier;
    scalarArray[base + S_COLOR_B] = startValues.startColorB[particleIndex] * bMultiplier;
  }
  if (lifetimeValues.rotationOverLifetime) {
    scalarArray[base + S_ROTATION] += lifetimeValues.rotationOverLifetime[particleIndex] * delta * 0.02;
  }
  if (noise.isActive) {
    const {
      sampler,
      strength,
      noisePower,
      offsets,
      positionAmount,
      rotationAmount,
      sizeAmount
    } = noise;
    let noiseOnPosition;
    const noisePosition = (particleLifetimePercentage + (offsets ? offsets[particleIndex] : 0)) * 10 * strength;
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
    attributes.position.needsUpdate = true;
  }
  if (attributes.quat) {
    const rotZ = scalarArray[base + S_ROTATION];
    const halfZ = rotZ * 0.5;
    const qi = particleIndex * 4;
    attributes.quat.array[qi] = 0;
    attributes.quat.array[qi + 1] = 0;
    attributes.quat.array[qi + 2] = Math.sin(halfZ);
    attributes.quat.array[qi + 3] = Math.cos(halfZ);
    attributes.quat.needsUpdate = true;
  }
};

// src/js/effects/three-particles/three-particles-renderer-detect.ts
function isComputeCapableRenderer(renderer) {
  return renderer !== null && renderer !== void 0 && typeof renderer === "object" && "compute" in renderer && typeof renderer.compute === "function" && "hasFeature" in renderer && typeof renderer.hasFeature === "function";
}
function resolveSimulationBackend(renderer, preference = "AUTO" /* AUTO */) {
  const gpuCapable = isComputeCapableRenderer(renderer);
  if (preference === "CPU" /* CPU */) {
    return "CPU" /* CPU */;
  }
  if (preference === "GPU" /* GPU */) {
    return gpuCapable ? "GPU" /* GPU */ : "CPU" /* CPU */;
  }
  return gpuCapable ? "GPU" /* GPU */ : "CPU" /* CPU */;
}

// src/js/effects/three-particles/shaders/instanced-particle-fragment-shader.glsl.ts
var InstancedParticleFragmentShader = `
  uniform sampler2D map;
  uniform float elapsed;
  uniform float fps;
  uniform bool useFPSForFrameIndex;
  uniform vec2 tiles;
  uniform bool discardBackgroundColor;
  uniform vec3 backgroundColor;
  uniform float backgroundColorTolerance;
  uniform bool softParticlesEnabled;
  uniform float softParticlesIntensity;
  uniform sampler2D sceneDepthTexture;
  uniform vec2 cameraNearFar;

  varying vec2 vUv;
  varying vec4 vColor;
  varying float vLifetime;
  varying float vStartLifetime;
  varying float vStartFrame;
  varying float vRotation;
  varying float vViewZ;

  #include <common>
  #include <logdepthbuf_pars_fragment>

  float linearizeDepth(float depthSample, float near, float far) {
    float z_ndc = 2.0 * depthSample - 1.0;
    return 2.0 * near * far / (far + near - z_ndc * (far - near));
  }

  void main()
  {
    gl_FragColor = vColor;

    // Rotate UV around centre (matches Points renderer behaviour)
    vec2 center = vec2(0.5);
    vec2 centeredPoint = vUv - center;

    mat2 rotation = mat2(
      cos(vRotation), sin(vRotation),
      -sin(vRotation), cos(vRotation)
    );

    centeredPoint = rotation * centeredPoint;
    vec2 centeredMiddlePoint = centeredPoint + center;

    // Discard pixels outside the inscribed circle
    float dist = distance(centeredMiddlePoint, center);
    if (dist > 0.5) discard;

    float frameIndex = round(vStartFrame) + (
      useFPSForFrameIndex == true
        ? fps == 0.0
            ? 0.0
            : max((vLifetime / 1000.0) * fps, 0.0)
        : max(min(floor(min(vLifetime / vStartLifetime, 1.0) * (tiles.x * tiles.y)), tiles.x * tiles.y - 1.0), 0.0)
    );

    float spriteXIndex = floor(mod(frameIndex, tiles.x));
    float spriteYIndex = floor(mod(frameIndex / tiles.x, tiles.y));

    vec2 uvPoint = vec2(
      centeredMiddlePoint.x / tiles.x + spriteXIndex / tiles.x,
      centeredMiddlePoint.y / tiles.y + spriteYIndex / tiles.y
    );

    vec4 rotatedTexture = texture2D(map, uvPoint);

    gl_FragColor = gl_FragColor * rotatedTexture;

    if (discardBackgroundColor && abs(length(rotatedTexture.rgb - backgroundColor.rgb)) < backgroundColorTolerance) discard;

    if (softParticlesEnabled) {
      vec2 screenUV = gl_FragCoord.xy / vec2(textureSize(sceneDepthTexture, 0));
      float sceneDepthSample = texture2D(sceneDepthTexture, screenUV).r;
      float sceneDepthLinear = linearizeDepth(sceneDepthSample, cameraNearFar.x, cameraNearFar.y);
      float depthDiff = sceneDepthLinear - vViewZ;
      float softFade = smoothstep(0.0, softParticlesIntensity, depthDiff);
      gl_FragColor.a *= softFade;
      if (gl_FragColor.a < 0.001) discard;
    }

    #include <logdepthbuf_fragment>
    #include <colorspace_fragment>
  }
`;
var instanced_particle_fragment_shader_glsl_default = InstancedParticleFragmentShader;

// src/js/effects/three-particles/shaders/instanced-particle-vertex-shader.glsl.ts
var InstancedParticleVertexShader = `
  attribute float instanceSize;
  attribute vec4 instanceColor;
  attribute float instanceLifetime;
  attribute float instanceStartLifetime;
  attribute float instanceRotation;
  attribute float instanceStartFrame;
  attribute vec3 instanceOffset;

  uniform float viewportHeight;

  varying vec2 vUv;
  varying vec4 vColor;
  varying float vLifetime;
  varying float vStartLifetime;
  varying float vStartFrame;
  varying float vRotation;
  varying float vViewZ;

  #include <common>
  #include <logdepthbuf_pars_vertex>

  void main()
  {
    // Early-out for dead particles: skip all transforms and emit a degenerate
    // position that produces zero-area triangles.
    if (instanceColor.a <= 0.0) {
      gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    vColor = instanceColor;
    vLifetime = instanceLifetime;
    vStartLifetime = instanceStartLifetime;
    vStartFrame = instanceStartFrame;
    vRotation = instanceRotation;

    vec4 mvPosition = modelViewMatrix * vec4(instanceOffset, 1.0);

    // Match the Points renderer pixel size: gl_PointSize = size * 100.0 / distance.
    // A view-space offset of d produces d * projectionMatrix[1][1] / w * (viewportHeight/2) pixels,
    // where w = -mvPosition.z for perspective.  Solving for d so the result equals
    // the gl_PointSize pixel count:
    //   d = size * 100.0 / distance
    //       * (-mvPosition.z)
    //       / (projectionMatrix[1][1] * viewportHeight * 0.5)
    // Since distance \u2248 -mvPosition.z for view-aligned particles the two cancel out,
    // leaving a distance-independent expression.  We keep them explicit so particles
    // off the viewing axis still scale correctly.
    float dist = length(mvPosition.xyz);
    float pointSizePx = instanceSize * 100.0 / dist;
    float perspectiveSize = pointSizePx * (-mvPosition.z)
                          / (projectionMatrix[1][1] * viewportHeight * 0.5);

    // Billboard: offset quad vertices in view space (no rotation here;
    // rotation is applied to UVs in the fragment shader to keep behaviour
    // identical to the Points renderer).
    mvPosition.xy += position.xy * perspectiveSize;

    vViewZ = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    // Pass UV for texture sampling (quad ranges from -0.5..0.5, map to 0..1).
    // Flip Y to match gl_PointCoord convention (Y runs top-to-bottom).
    vUv = vec2(position.x + 0.5, 0.5 - position.y);

    #include <logdepthbuf_vertex>
  }
`;
var instanced_particle_vertex_shader_glsl_default = InstancedParticleVertexShader;

// src/js/effects/three-particles/shaders/mesh-particle-fragment-shader.glsl.ts
var MeshParticleFragmentShader = `
  uniform sampler2D map;
  uniform float elapsed;
  uniform float fps;
  uniform bool useFPSForFrameIndex;
  uniform vec2 tiles;
  uniform bool discardBackgroundColor;
  uniform vec3 backgroundColor;
  uniform float backgroundColorTolerance;
  uniform bool softParticlesEnabled;
  uniform float softParticlesIntensity;
  uniform sampler2D sceneDepthTexture;
  uniform vec2 cameraNearFar;

  varying vec4 vColor;
  varying float vLifetime;
  varying float vStartLifetime;
  varying float vStartFrame;
  varying float vRotation;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vViewZ;

  #include <common>
  #include <logdepthbuf_pars_fragment>

  float linearizeDepth(float depthSample, float near, float far) {
    float z_ndc = 2.0 * depthSample - 1.0;
    return 2.0 * near * far / (far + near - z_ndc * (far - near));
  }

  void main()
  {
    gl_FragColor = vColor;

    // Use mesh UVs directly for texture sampling
    vec2 uvPoint = vUv;

    // Apply texture sheet animation if tiles > 1x1
    if (tiles.x > 1.0 || tiles.y > 1.0) {
      float frameIndex = round(vStartFrame) + (
        useFPSForFrameIndex == true
          ? fps == 0.0
              ? 0.0
              : max((vLifetime / 1000.0) * fps, 0.0)
          : max(min(floor(min(vLifetime / vStartLifetime, 1.0) * (tiles.x * tiles.y)), tiles.x * tiles.y - 1.0), 0.0)
      );

      float spriteXIndex = floor(mod(frameIndex, tiles.x));
      float spriteYIndex = floor(mod(frameIndex / tiles.x, tiles.y));

      uvPoint = vec2(
        vUv.x / tiles.x + spriteXIndex / tiles.x,
        vUv.y / tiles.y + spriteYIndex / tiles.y
      );
    }

    vec4 texColor = texture2D(map, uvPoint);
    gl_FragColor = gl_FragColor * texColor;

    if (discardBackgroundColor && abs(length(texColor.rgb - backgroundColor.rgb)) < backgroundColorTolerance) discard;

    // Simple directional lighting from camera direction
    float lightIntensity = 0.5 + 0.5 * max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    gl_FragColor.rgb *= lightIntensity;

    if (softParticlesEnabled) {
      vec2 screenUV = gl_FragCoord.xy / vec2(textureSize(sceneDepthTexture, 0));
      float sceneDepthSample = texture2D(sceneDepthTexture, screenUV).r;
      float sceneDepthLinear = linearizeDepth(sceneDepthSample, cameraNearFar.x, cameraNearFar.y);
      float depthDiff = sceneDepthLinear - vViewZ;
      float softFade = smoothstep(0.0, softParticlesIntensity, depthDiff);
      gl_FragColor.a *= softFade;
      if (gl_FragColor.a < 0.001) discard;
    }

    #include <logdepthbuf_fragment>
    #include <colorspace_fragment>
  }
`;
var mesh_particle_fragment_shader_glsl_default = MeshParticleFragmentShader;

// src/js/effects/three-particles/shaders/mesh-particle-vertex-shader.glsl.ts
var MeshParticleVertexShader = `
  attribute float instanceSize;
  attribute vec4 instanceColor;
  attribute float instanceLifetime;
  attribute float instanceStartLifetime;
  attribute float instanceRotation;
  attribute float instanceStartFrame;
  attribute vec3 instanceOffset;
  attribute vec4 instanceQuat;

  varying vec4 vColor;
  varying float vLifetime;
  varying float vStartLifetime;
  varying float vStartFrame;
  varying float vRotation;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vViewZ;

  #include <common>
  #include <logdepthbuf_pars_vertex>

  vec3 applyQuaternion(vec3 v, vec4 q) {
    vec3 t = 2.0 * cross(q.xyz, v);
    return v + q.w * t + cross(q.xyz, t);
  }

  void main()
  {
    // Early-out for dead particles: skip all expensive transforms and emit
    // a degenerate position that produces zero-area triangles.
    if (instanceColor.a <= 0.0) {
      gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    vColor = instanceColor;
    vLifetime = instanceLifetime;
    vStartLifetime = instanceStartLifetime;
    vStartFrame = instanceStartFrame;
    vRotation = instanceRotation;

    // Apply quaternion rotation to the mesh vertex position
    vec3 rotatedPosition = applyQuaternion(position, instanceQuat);

    // Scale mesh by particle size
    vec3 scaledPosition = rotatedPosition * instanceSize;

    // Apply instance offset (particle world position)
    vec3 worldPos = scaledPosition + instanceOffset;

    vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
    vViewZ = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    // Transform normal by quaternion for lighting
    vNormal = normalize((modelViewMatrix * vec4(applyQuaternion(normal, instanceQuat), 0.0)).xyz);

    // Pass through UVs from the mesh geometry
    vUv = uv;

    #include <logdepthbuf_vertex>
  }
`;
var mesh_particle_vertex_shader_glsl_default = MeshParticleVertexShader;

// src/js/effects/three-particles/shaders/particle-system-fragment-shader.glsl.ts
var ParticleSystemFragmentShader = `
  uniform sampler2D map;
  uniform float elapsed;
  uniform float fps;
  uniform bool useFPSForFrameIndex;
  uniform vec2 tiles;
  uniform bool discardBackgroundColor;
  uniform vec3 backgroundColor;
  uniform float backgroundColorTolerance;
  uniform bool softParticlesEnabled;
  uniform float softParticlesIntensity;
  uniform sampler2D sceneDepthTexture;
  uniform vec2 cameraNearFar;

  varying vec4 vColor;
  varying float vLifetime;
  varying float vStartLifetime;
  varying float vRotation;
  varying float vStartFrame;
  varying float vViewZ;

  #include <common>
  #include <logdepthbuf_pars_fragment>

  float linearizeDepth(float depthSample, float near, float far) {
    float z_ndc = 2.0 * depthSample - 1.0;
    return 2.0 * near * far / (far + near - z_ndc * (far - near));
  }

  void main()
  {
    gl_FragColor = vColor;
    float mid = 0.5;

    float frameIndex = round(vStartFrame) + (
      useFPSForFrameIndex == true
        ? fps == 0.0
            ? 0.0
            : max((vLifetime / 1000.0) * fps, 0.0)
        : max(min(floor(min(vLifetime / vStartLifetime, 1.0) * (tiles.x * tiles.y)), tiles.x * tiles.y - 1.0), 0.0)
    );
        
    float spriteXIndex = floor(mod(frameIndex, tiles.x));
    float spriteYIndex = floor(mod(frameIndex / tiles.x, tiles.y));

    vec2 frameUV = vec2(
      gl_PointCoord.x / tiles.x + spriteXIndex / tiles.x,
      gl_PointCoord.y / tiles.y + spriteYIndex / tiles.y);

    vec2 center = vec2(0.5, 0.5);
    vec2 centeredPoint = gl_PointCoord - center;

    mat2 rotation = mat2(
      cos(vRotation), sin(vRotation),
      -sin(vRotation), cos(vRotation)
    );

    centeredPoint = rotation * centeredPoint;
    vec2 centeredMiddlePoint = vec2(
      centeredPoint.x + center.x,
      centeredPoint.y + center.y
    );

    float dist = distance(centeredMiddlePoint, center);
    if (dist > 0.5) discard;

    vec2 uvPoint = vec2(
      centeredMiddlePoint.x / tiles.x + spriteXIndex / tiles.x,
      centeredMiddlePoint.y / tiles.y + spriteYIndex / tiles.y
    );

    vec4 rotatedTexture = texture2D(map, uvPoint);

    gl_FragColor = gl_FragColor * rotatedTexture;

    if (discardBackgroundColor && abs(length(rotatedTexture.rgb - backgroundColor.rgb)) < backgroundColorTolerance) discard;

    if (softParticlesEnabled) {
      vec2 screenUV = gl_FragCoord.xy / vec2(textureSize(sceneDepthTexture, 0));
      float sceneDepthSample = texture2D(sceneDepthTexture, screenUV).r;
      float sceneDepthLinear = linearizeDepth(sceneDepthSample, cameraNearFar.x, cameraNearFar.y);
      float depthDiff = sceneDepthLinear - vViewZ;
      float softFade = smoothstep(0.0, softParticlesIntensity, depthDiff);
      gl_FragColor.a *= softFade;
      if (gl_FragColor.a < 0.001) discard;
    }

    #include <logdepthbuf_fragment>
    #include <colorspace_fragment>
  }
`;
var particle_system_fragment_shader_glsl_default = ParticleSystemFragmentShader;

// src/js/effects/three-particles/shaders/particle-system-vertex-shader.glsl.ts
var ParticleSystemVertexShader = `
  attribute float size;
  attribute vec4 color;
  attribute float lifetime;
  attribute float startLifetime;
  attribute float rotation;
  attribute float startFrame;

  varying mat4 vPosition;
  varying vec4 vColor;
  varying float vLifetime;
  varying float vStartLifetime;
  varying float vRotation;
  varying float vStartFrame;
  varying float vViewZ;

  #include <common>
  #include <logdepthbuf_pars_vertex>

  void main()
  {
    vColor = color;
    vLifetime = lifetime;
    vStartLifetime = startLifetime;
    vRotation = rotation;
    vStartFrame = startFrame;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (100.0 / length(mvPosition.xyz));
    vViewZ = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    #include <logdepthbuf_vertex>
  }
`;
var particle_system_vertex_shader_glsl_default = ParticleSystemVertexShader;

// src/js/effects/three-particles/shaders/trail-fragment-shader.glsl.ts
var TrailFragmentShader = `
  uniform sampler2D map;
  uniform bool useMap;
  uniform bool discardBackgroundColor;
  uniform vec3 backgroundColor;
  uniform float backgroundColorTolerance;
  uniform bool softParticlesEnabled;
  uniform float softParticlesIntensity;
  uniform sampler2D sceneDepthTexture;
  uniform vec2 cameraNearFar;

  varying float vAlpha;
  varying vec4 vColor;
  varying vec2 vUv;
  varying float vViewZ;

  #include <common>
  #include <logdepthbuf_pars_fragment>

  float linearizeDepth(float depthSample, float near, float far) {
    float z_ndc = 2.0 * depthSample - 1.0;
    return 2.0 * near * far / (far + near - z_ndc * (far - near));
  }

  void main()
  {
    // Soft edge: always fade near ribbon edges
    float edgeDist = 1.0 - abs(vUv.x * 2.0 - 1.0);
    float softEdge = smoothstep(0.0, 0.4, edgeDist);

    gl_FragColor = vColor;

    if (useMap) {
      // Use texture luminance as brightness modulation on top of soft edge
      vec4 texColor = texture2D(map, vUv);
      float texBrightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
      gl_FragColor.rgb *= (0.5 + texBrightness * 0.5);
      gl_FragColor.a *= texColor.a;
    }

    gl_FragColor.a *= vAlpha * softEdge;

    if (gl_FragColor.a < 0.001) discard;

    if (softParticlesEnabled) {
      vec2 screenUV = gl_FragCoord.xy / vec2(textureSize(sceneDepthTexture, 0));
      float sceneDepthSample = texture2D(sceneDepthTexture, screenUV).r;
      float sceneDepthLinear = linearizeDepth(sceneDepthSample, cameraNearFar.x, cameraNearFar.y);
      float depthDiff = sceneDepthLinear - vViewZ;
      float softFade = smoothstep(0.0, softParticlesIntensity, depthDiff);
      gl_FragColor.a *= softFade;
      if (gl_FragColor.a < 0.001) discard;
    }

    if (discardBackgroundColor && abs(length(gl_FragColor.rgb - backgroundColor.rgb)) < backgroundColorTolerance) discard;

    #include <logdepthbuf_fragment>
    #include <colorspace_fragment>
  }
`;
var trail_fragment_shader_glsl_default = TrailFragmentShader;

// src/js/effects/three-particles/shaders/trail-vertex-shader.glsl.ts
var TrailVertexShader = `
  attribute float trailAlpha;
  attribute vec4 trailColor;
  attribute float trailOffset;
  attribute float trailHalfWidth;
  attribute vec3 trailNext;
  attribute vec2 trailUV;

  varying float vAlpha;
  varying vec4 vColor;
  varying vec2 vUv;
  varying float vViewZ;

  #include <common>
  #include <logdepthbuf_pars_vertex>

  void main()
  {
    vAlpha = trailAlpha;
    vColor = trailColor;
    vUv = trailUV;

    // Compute tangent from current position to next sample
    vec3 tangent = trailNext - position;
    float tangentLen = length(tangent);
    if (tangentLen < 0.0001) {
      tangent = vec3(0.0, 1.0, 0.0);
    } else {
      tangent = tangent / tangentLen;
    }

    // Billboard: perpendicular = cross(tangent, viewDirection)
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 viewDir = normalize(cameraPosition - worldPos);
    vec3 perp = cross(tangent, viewDir);
    float perpLen = length(perp);

    // When tangent is nearly parallel to view direction, the cross product
    // collapses and the ribbon becomes edge-on (invisible). Build a stable
    // fallback perpendicular from the camera's right axis \u2014 this keeps the
    // ribbon in screen-space and prevents it from flipping into an arbitrary
    // plane when viewed edge-on.
    vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 fallbackPerp = normalize(camRight - tangent * dot(camRight, tangent));

    if (perpLen < 0.0001) {
      perp = fallbackPerp;
    } else {
      perp = perp / perpLen;
      // Smoothly blend toward the fallback when the billboard perp weakens.
      // The wide range (0..0.7) ensures a gradual transition so the ribbon
      // does not snap abruptly when rotating toward edge-on.
      float blendFactor = smoothstep(0.0, 0.7, perpLen);
      perp = normalize(mix(fallbackPerp, perp, blendFactor));
    }

    vec3 offsetPos = position + perp * trailOffset * trailHalfWidth;
    vec4 mvPosition = modelViewMatrix * vec4(offsetPos, 1.0);
    vViewZ = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    #include <logdepthbuf_vertex>
  }
`;
var trail_vertex_shader_glsl_default = TrailVertexShader;
var _planeToParticle = new THREE5.Vector3();
var _normalComponent = new THREE5.Vector3();
var applyCollisionPlanes = ({
  collisionPlanes,
  velocity,
  positionArr,
  positionIndex,
  scalarArr,
  scalarBase,
  deactivateParticle,
  particleIndex
}) => {
  for (let i = 0; i < collisionPlanes.length; i++) {
    const plane = collisionPlanes[i];
    if (!plane.isActive) continue;
    const normal = plane.normal;
    const planePos = plane.position;
    _planeToParticle.set(
      positionArr[positionIndex] - planePos.x,
      positionArr[positionIndex + 1] - planePos.y,
      positionArr[positionIndex + 2] - planePos.z
    );
    const signedDistance = _planeToParticle.dot(normal);
    if (signedDistance >= 0) continue;
    switch (plane.mode) {
      case "KILL" /* KILL */:
        deactivateParticle(particleIndex);
        return true;
      case "CLAMP" /* CLAMP */:
        positionArr[positionIndex] = positionArr[positionIndex] - signedDistance * normal.x;
        positionArr[positionIndex + 1] = positionArr[positionIndex + 1] - signedDistance * normal.y;
        positionArr[positionIndex + 2] = positionArr[positionIndex + 2] - signedDistance * normal.z;
        const velDotNormal = velocity.x * normal.x + velocity.y * normal.y + velocity.z * normal.z;
        if (velDotNormal < 0) {
          velocity.x -= velDotNormal * normal.x;
          velocity.y -= velDotNormal * normal.y;
          velocity.z -= velDotNormal * normal.z;
        }
        break;
      case "BOUNCE" /* BOUNCE */: {
        positionArr[positionIndex] = positionArr[positionIndex] - signedDistance * normal.x;
        positionArr[positionIndex + 1] = positionArr[positionIndex + 1] - signedDistance * normal.y;
        positionArr[positionIndex + 2] = positionArr[positionIndex + 2] - signedDistance * normal.z;
        const vDotN = velocity.x * normal.x + velocity.y * normal.y + velocity.z * normal.z;
        _normalComponent.set(
          2 * vDotN * normal.x,
          2 * vDotN * normal.y,
          2 * vDotN * normal.z
        );
        velocity.x = (velocity.x - _normalComponent.x) * plane.dampen;
        velocity.y = (velocity.y - _normalComponent.y) * plane.dampen;
        velocity.z = (velocity.z - _normalComponent.z) * plane.dampen;
        if (plane.lifetimeLoss > 0) {
          const startLifetime = scalarArr[scalarBase + S_START_LIFETIME];
          scalarArr[scalarBase + S_LIFETIME] += plane.lifetimeLoss * startLifetime;
        }
        break;
      }
    }
  }
  return false;
};
var _forceDirection = new THREE5.Vector3();
var applyPointForce = (field, strength, velocity, positionArr, positionIndex, delta) => {
  _forceDirection.set(
    field.position.x - positionArr[positionIndex],
    field.position.y - positionArr[positionIndex + 1],
    field.position.z - positionArr[positionIndex + 2]
  );
  const distance = _forceDirection.length();
  if (distance < 1e-4) return;
  if (field.range !== Infinity && distance > field.range) return;
  _forceDirection.divideScalar(distance);
  let falloffMultiplier = 1;
  if (field.range !== Infinity) {
    const normalizedDistance = distance / field.range;
    switch (field.falloff) {
      case "LINEAR" /* LINEAR */:
        falloffMultiplier = 1 - normalizedDistance;
        break;
      case "QUADRATIC" /* QUADRATIC */:
        falloffMultiplier = 1 - normalizedDistance * normalizedDistance;
        break;
      case "NONE" /* NONE */:
        falloffMultiplier = 1;
        break;
    }
  }
  const force = strength * falloffMultiplier * delta;
  velocity.x += _forceDirection.x * force;
  velocity.y += _forceDirection.y * force;
  velocity.z += _forceDirection.z * force;
};
var applyDirectionalForce = (field, strength, velocity, delta) => {
  const force = strength * delta;
  velocity.x += field.direction.x * force;
  velocity.y += field.direction.y * force;
  velocity.z += field.direction.z * force;
};
var applyForceFields = ({
  particleSystemId,
  forceFields,
  velocity,
  positionArr,
  positionIndex,
  delta,
  systemLifetimePercentage
}) => {
  for (let i = 0; i < forceFields.length; i++) {
    const field = forceFields[i];
    if (!field.isActive) continue;
    const strength = calculateValue(
      particleSystemId,
      field.strength,
      systemLifetimePercentage
    );
    if (strength === 0) continue;
    if (field.type === "POINT" /* POINT */) {
      applyPointForce(
        field,
        strength,
        velocity,
        positionArr,
        positionIndex,
        delta
      );
    } else if (field.type === "DIRECTIONAL" /* DIRECTIONAL */) {
      applyDirectionalForce(field, strength, velocity, delta);
    }
  }
};

// src/js/effects/three-particles/three-particles.ts
var normalizeTrailCurve = (curve, defaultCurve) => {
  if (!curve) return defaultCurve;
  const raw = curve;
  if (!raw.type && Array.isArray(raw.bezierPoints)) {
    return { type: "BEZIER" /* BEZIER */, ...raw };
  }
  return curve;
};
var _particleSystemId = 0;
var createdParticleSystems = [];
var setUniformFloat = (u, v) => {
  u.value = v;
};
var setUniformVec3 = (u, x, y, z) => {
  u.value.set(x, y, z);
};
var _tslMaterialFactory = null;
var registerTSLMaterialFactory = (factory) => {
  _tslMaterialFactory = factory;
};
var _subEmitterPosition = new THREE5.Vector3();
var _subLocalPosition = new THREE5.Vector3();
var _shadowOrbitalEuler = new THREE5.Euler(0, 0, 0, "XYZ");
var _lastWorldPositionSnapshot = new THREE5.Vector3();
var _localForceFieldPos = new THREE5.Vector3();
var _localForceFieldDir = new THREE5.Vector3();
var _inverseQuat = new THREE5.Quaternion();
var _localForceFields = [];
var _localCollisionPlanePos = new THREE5.Vector3();
var _localCollisionPlaneNormal = new THREE5.Vector3();
var _localCollisionPlanes = [];
new THREE5.Vector3();
new THREE5.Vector3();
new THREE5.Vector3();
var _distanceStep = { x: 0, y: 0, z: 0 };
var _tempPosition = { x: 0, y: 0, z: 0 };
var _modifierParams = {
  delta: 0,
  generalData: null,
  normalizedConfig: null,
  attributes: null,
  scalarArray: null,
  particleLifetimePercentage: 0,
  particleIndex: 0
};
var toVector3 = (v, fallback) => v ? new THREE5.Vector3(v.x ?? 0, v.y ?? 0, v.z ?? 0) : fallback.clone();
var normalizeForceFields = (rawForceFields) => (rawForceFields ?? []).map((ff) => ({
  isActive: ff.isActive ?? true,
  type: ff.type ?? "POINT" /* POINT */,
  position: toVector3(ff.position, new THREE5.Vector3(0, 0, 0)),
  direction: toVector3(ff.direction, new THREE5.Vector3(0, 1, 0)).normalize(),
  strength: ff.strength ?? 1,
  range: Math.max(0, ff.range ?? Infinity),
  falloff: ff.falloff ?? "LINEAR" /* LINEAR */
}));
var normalizeCollisionPlanes = (rawPlanes) => (rawPlanes ?? []).map((cp) => ({
  isActive: cp.isActive ?? true,
  position: toVector3(cp.position, new THREE5.Vector3(0, 0, 0)),
  normal: toVector3(cp.normal, new THREE5.Vector3(0, 1, 0)).normalize(),
  mode: cp.mode ?? "KILL" /* KILL */,
  dampen: Math.max(0, Math.min(1, cp.dampen ?? 0.5)),
  lifetimeLoss: Math.max(0, Math.min(1, cp.lifetimeLoss ?? 0))
}));
var blendingMap = {
  "THREE.NoBlending": THREE5.NoBlending,
  "THREE.NormalBlending": THREE5.NormalBlending,
  "THREE.AdditiveBlending": THREE5.AdditiveBlending,
  "THREE.SubtractiveBlending": THREE5.SubtractiveBlending,
  "THREE.MultiplyBlending": THREE5.MultiplyBlending
};
var getDefaultParticleSystemConfig = () => JSON.parse(JSON.stringify(DEFAULT_PARTICLE_SYSTEM_CONFIG));
var DEFAULT_PARTICLE_SYSTEM_CONFIG = {
  transform: {
    position: new THREE5.Vector3(),
    rotation: new THREE5.Vector3(),
    scale: new THREE5.Vector3(1, 1, 1)
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
    max: { r: 1, g: 1, b: 1 }
  },
  gravity: 0,
  simulationSpace: "LOCAL" /* LOCAL */,
  simulationBackend: "AUTO" /* AUTO */,
  maxParticles: 100,
  emission: {
    rateOverTime: 10,
    rateOverDistance: 0,
    bursts: []
  },
  shape: {
    shape: "SPHERE" /* SPHERE */,
    sphere: {
      radius: 1,
      radiusThickness: 1,
      arc: 360
    },
    cone: {
      angle: 25,
      radius: 1,
      radiusThickness: 1,
      arc: 360
    },
    circle: {
      radius: 1,
      radiusThickness: 1,
      arc: 360
    },
    rectangle: {
      rotation: { x: 0, y: 0 },
      // TODO: add z rotation
      scale: { x: 1, y: 1 }
    },
    box: {
      scale: { x: 1, y: 1, z: 1 },
      emitFrom: "VOLUME" /* VOLUME */
    }
  },
  map: void 0,
  renderer: {
    blending: THREE5.NormalBlending,
    discardBackgroundColor: false,
    backgroundColorTolerance: 1,
    backgroundColor: { r: 1, g: 1, b: 1 },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    softParticles: {
      enabled: false,
      intensity: 1
    }
  },
  velocityOverLifetime: {
    isActive: false,
    linear: {
      x: 0,
      y: 0,
      z: 0
    },
    orbital: {
      x: 0,
      y: 0,
      z: 0
    }
  },
  sizeOverLifetime: {
    isActive: false,
    lifetimeCurve: {
      type: "BEZIER" /* BEZIER */,
      scale: 1,
      bezierPoints: [
        { x: 0, y: 0, percentage: 0 },
        { x: 1, y: 1, percentage: 1 }
      ]
    }
  },
  colorOverLifetime: {
    isActive: false,
    r: {
      type: "BEZIER" /* BEZIER */,
      scale: 1,
      bezierPoints: [
        { x: 0, y: 1, percentage: 0 },
        { x: 1, y: 1, percentage: 1 }
      ]
    },
    g: {
      type: "BEZIER" /* BEZIER */,
      scale: 1,
      bezierPoints: [
        { x: 0, y: 1, percentage: 0 },
        { x: 1, y: 1, percentage: 1 }
      ]
    },
    b: {
      type: "BEZIER" /* BEZIER */,
      scale: 1,
      bezierPoints: [
        { x: 0, y: 1, percentage: 0 },
        { x: 1, y: 1, percentage: 1 }
      ]
    }
  },
  opacityOverLifetime: {
    isActive: false,
    lifetimeCurve: {
      type: "BEZIER" /* BEZIER */,
      scale: 1,
      bezierPoints: [
        { x: 0, y: 0, percentage: 0 },
        { x: 1, y: 1, percentage: 1 }
      ]
    }
  },
  rotationOverLifetime: {
    isActive: false,
    min: 0,
    max: 0
  },
  noise: {
    isActive: false,
    useRandomOffset: false,
    strength: 1,
    frequency: 0.5,
    octaves: 1,
    positionAmount: 1,
    rotationAmount: 0,
    sizeAmount: 0
  },
  textureSheetAnimation: {
    tiles: new THREE5.Vector2(1, 1),
    timeMode: "LIFETIME" /* LIFETIME */,
    fps: 30,
    startFrame: 0
  },
  forceFields: [],
  collisionPlanes: []
};
var calculatePositionAndVelocity = (generalData, { shape, sphere, cone, circle, rectangle, box }, startSpeed, position, velocity) => {
  const calculatedStartSpeed = calculateValue(
    generalData.particleSystemId,
    startSpeed,
    generalData.normalizedLifetimePercentage
  );
  switch (shape) {
    case "SPHERE" /* SPHERE */:
      calculateRandomPositionAndVelocityOnSphere(
        position,
        generalData.wrapperQuaternion,
        velocity,
        calculatedStartSpeed,
        sphere
      );
      break;
    case "CONE" /* CONE */:
      calculateRandomPositionAndVelocityOnCone(
        position,
        generalData.wrapperQuaternion,
        velocity,
        calculatedStartSpeed,
        cone
      );
      break;
    case "CIRCLE" /* CIRCLE */:
      calculateRandomPositionAndVelocityOnCircle(
        position,
        generalData.wrapperQuaternion,
        velocity,
        calculatedStartSpeed,
        circle
      );
      break;
    case "RECTANGLE" /* RECTANGLE */:
      calculateRandomPositionAndVelocityOnRectangle(
        position,
        generalData.wrapperQuaternion,
        velocity,
        calculatedStartSpeed,
        rectangle
      );
      break;
    case "BOX" /* BOX */:
      calculateRandomPositionAndVelocityOnBox(
        position,
        generalData.wrapperQuaternion,
        velocity,
        calculatedStartSpeed,
        box
      );
      break;
  }
};
var destroyParticleSystem = (particleSystem) => {
  createdParticleSystems = createdParticleSystems.filter(
    ({
      particleSystem: savedParticleSystem,
      trailMesh,
      generalData: { particleSystemId }
    }) => {
      if (savedParticleSystem !== particleSystem) {
        return true;
      }
      removeBezierCurveFunction(particleSystemId);
      if (trailMesh) {
        trailMesh.geometry.dispose();
        if (Array.isArray(trailMesh.material))
          trailMesh.material.forEach((m) => m.dispose());
        else trailMesh.material.dispose();
        if (trailMesh.parent) trailMesh.parent.remove(trailMesh);
      }
      savedParticleSystem.geometry.dispose();
      if (Array.isArray(savedParticleSystem.material))
        savedParticleSystem.material.forEach((material) => material.dispose());
      else savedParticleSystem.material.dispose();
      if (savedParticleSystem.parent)
        savedParticleSystem.parent.remove(savedParticleSystem);
      return false;
    }
  );
};
var createParticleSystem = (config = DEFAULT_PARTICLE_SYSTEM_CONFIG, externalNow) => {
  const now = externalNow || Date.now();
  const generalData = {
    particleSystemId: _particleSystemId++,
    normalizedLifetimePercentage: 0,
    distanceFromLastEmitByDistance: 0,
    lastWorldPosition: new THREE5.Vector3(-99999),
    currentWorldPosition: new THREE5.Vector3(-99999),
    worldPositionChange: new THREE5.Vector3(),
    sourceWorldMatrix: new THREE5.Matrix4(),
    worldQuaternion: new THREE5.Quaternion(),
    wrapperQuaternion: new THREE5.Quaternion(),
    worldScale: new THREE5.Vector3(1, 1, 1),
    worldEuler: new THREE5.Euler(),
    gravityVelocity: new THREE5.Vector3(0, 0, 0),
    startValues: {},
    linearVelocityData: void 0,
    orbitalVelocityData: void 0,
    lifetimeValues: {},
    creationTimes: [],
    noise: {
      isActive: false,
      strength: 0,
      noisePower: 0,
      frequency: 0.5,
      positionAmount: 0,
      rotationAmount: 0,
      sizeAmount: 0,
      fbmMax: 1
    },
    isEnabled: true,
hwm: 0
  };
  const normalizedConfig = ObjectUtils.deepMerge(
    DEFAULT_PARTICLE_SYSTEM_CONFIG,
    config,
    { applyToFirstObject: false, skippedProperties: [] }
  );
  let particleMap = normalizedConfig.map || (normalizedConfig.renderer.rendererType === "MESH" /* MESH */ ? createDefaultMeshTexture() : createDefaultParticleTexture());
  if (particleMap) {
    particleMap.wrapS = THREE5.ClampToEdgeWrapping;
    particleMap.wrapT = THREE5.ClampToEdgeWrapping;
  }
  const {
    transform,
    duration,
    looping,
    startDelay,
    startLifetime,
    startSpeed,
    startSize,
    startRotation,
    startColor,
    startOpacity,
    gravity,
    simulationSpace,
    maxParticles,
    emission,
    shape,
    renderer,
    noise,
    velocityOverLifetime,
    onUpdate,
    onComplete,
    textureSheetAnimation,
    subEmitters,
    forceFields: rawForceFields
  } = normalizedConfig;
  const normalizedForceFields = normalizeForceFields(rawForceFields);
  const normalizedCollisionPlanes = normalizeCollisionPlanes(normalizedConfig.collisionPlanes);
  if (typeof renderer?.blending === "string")
    renderer.blending = blendingMap[renderer.blending];
  const startPositions = Array.from(
    { length: maxParticles },
    () => new THREE5.Vector3()
  );
  const velocities = Array.from(
    { length: maxParticles },
    () => new THREE5.Vector3()
  );
  generalData.creationTimes = Array.from({ length: maxParticles }, () => 0);
  const freeList = Array.from(
    { length: maxParticles },
    (_, i) => maxParticles - 1 - i
  );
  if (velocityOverLifetime.isActive) {
    generalData.linearVelocityData = Array.from(
      { length: maxParticles },
      () => ({
        speed: new THREE5.Vector3(
          velocityOverLifetime.linear.x ? calculateValue(
            generalData.particleSystemId,
            velocityOverLifetime.linear.x,
            0
          ) : 0,
          velocityOverLifetime.linear.y ? calculateValue(
            generalData.particleSystemId,
            velocityOverLifetime.linear.y,
            0
          ) : 0,
          velocityOverLifetime.linear.z ? calculateValue(
            generalData.particleSystemId,
            velocityOverLifetime.linear.z,
            0
          ) : 0
        ),
        valueModifiers: {
          x: isLifeTimeCurve(velocityOverLifetime.linear.x || 0) ? getCurveFunctionFromConfig(
            generalData.particleSystemId,
            velocityOverLifetime.linear.x
          ) : void 0,
          y: isLifeTimeCurve(velocityOverLifetime.linear.y || 0) ? getCurveFunctionFromConfig(
            generalData.particleSystemId,
            velocityOverLifetime.linear.y
          ) : void 0,
          z: isLifeTimeCurve(velocityOverLifetime.linear.z || 0) ? getCurveFunctionFromConfig(
            generalData.particleSystemId,
            velocityOverLifetime.linear.z
          ) : void 0
        }
      })
    );
    generalData.orbitalVelocityData = Array.from(
      { length: maxParticles },
      () => ({
        speed: new THREE5.Vector3(
          velocityOverLifetime.orbital.x ? calculateValue(
            generalData.particleSystemId,
            velocityOverLifetime.orbital.x,
            0
          ) : 0,
          velocityOverLifetime.orbital.y ? calculateValue(
            generalData.particleSystemId,
            velocityOverLifetime.orbital.y,
            0
          ) : 0,
          velocityOverLifetime.orbital.z ? calculateValue(
            generalData.particleSystemId,
            velocityOverLifetime.orbital.z,
            0
          ) : 0
        ),
        valueModifiers: {
          x: isLifeTimeCurve(velocityOverLifetime.orbital.x || 0) ? getCurveFunctionFromConfig(
            generalData.particleSystemId,
            velocityOverLifetime.orbital.x
          ) : void 0,
          y: isLifeTimeCurve(velocityOverLifetime.orbital.y || 0) ? getCurveFunctionFromConfig(
            generalData.particleSystemId,
            velocityOverLifetime.orbital.y
          ) : void 0,
          z: isLifeTimeCurve(velocityOverLifetime.orbital.z || 0) ? getCurveFunctionFromConfig(
            generalData.particleSystemId,
            velocityOverLifetime.orbital.z
          ) : void 0
        },
        positionOffset: new THREE5.Vector3()
      })
    );
  }
  const startValueKeys = [
    "startSize",
    "startOpacity"
  ];
  startValueKeys.forEach((key) => {
    generalData.startValues[key] = Array.from(
      { length: maxParticles },
      () => calculateValue(
        generalData.particleSystemId,
        normalizedConfig[key],
        0
      )
    );
  });
  generalData.startValues.startColorR = Array.from(
    { length: maxParticles },
    () => 0
  );
  generalData.startValues.startColorG = Array.from(
    { length: maxParticles },
    () => 0
  );
  generalData.startValues.startColorB = Array.from(
    { length: maxParticles },
    () => 0
  );
  const lifetimeValueKeys = [
    "rotationOverLifetime"
  ];
  lifetimeValueKeys.forEach((key) => {
    const value = normalizedConfig[key];
    if (value.isActive)
      generalData.lifetimeValues[key] = Array.from(
        { length: maxParticles },
        () => THREE5.MathUtils.randFloat(value.min, value.max)
      );
  });
  const fbmMax = 2 - Math.pow(2, -noise.octaves);
  generalData.noise = {
    isActive: noise.isActive,
    strength: noise.strength,
    noisePower: 0.15 * noise.strength,
    frequency: noise.frequency,
    positionAmount: noise.positionAmount,
    rotationAmount: noise.rotationAmount,
    sizeAmount: noise.sizeAmount,
    fbmMax,
    sampler: noise.isActive ? new FBM({
      seed: Math.random(),
      scale: noise.frequency,
      octaves: noise.octaves
    }) : void 0,
    offsets: noise.useRandomOffset ? Array.from({ length: maxParticles }, () => Math.random() * 100) : void 0
  };
  if (emission.bursts && emission.bursts.length > 0) {
    generalData.burstStates = emission.bursts.map(() => ({
      cyclesExecuted: 0,
      lastCycleTime: 0,
      probabilityPassed: false
    }));
  }
  const useTrail = renderer.rendererType === "TRAIL" /* TRAIL */;
  const useMesh = renderer.rendererType === "MESH" /* MESH */;
  const useInstancing = !useTrail && !useMesh && renderer.rendererType === "INSTANCED" /* INSTANCED */;
  const useInstancedAttributes = useInstancing || useMesh;
  const defaultTrailCurve = {
    type: "BEZIER" /* BEZIER */,
    scale: 1,
    bezierPoints: [
      { x: 0, y: 1, percentage: 0 },
      { x: 1, y: 0, percentage: 1 }
    ]
  };
  const trailConfig = useTrail ? {
    length: renderer.trail?.length ?? 20,
    width: renderer.trail?.width ?? 1,
    widthOverTrail: normalizeTrailCurve(
      renderer.trail?.widthOverTrail,
      defaultTrailCurve
    ),
    opacityOverTrail: normalizeTrailCurve(
      renderer.trail?.opacityOverTrail,
      defaultTrailCurve
    ),
    colorOverTrail: renderer.trail?.colorOverTrail,
    minVertexDistance: renderer.trail?.minVertexDistance ?? 0,
    maxTime: renderer.trail?.maxTime ?? 0,
    smoothing: renderer.trail?.smoothing ?? false,
    smoothingSubdivisions: renderer.trail?.smoothingSubdivisions ?? 3,
    twistPrevention: renderer.trail?.twistPrevention ?? false,
    ribbonId: renderer.trail?.ribbonId
  } : void 0;
  if (useTrail && trailConfig) {
    const trailLength = trailConfig.length;
    generalData.trailLength = trailLength;
    generalData.positionHistory = new Float32Array(
      maxParticles * trailLength * 3
    );
    generalData.positionHistoryIndex = new Uint16Array(maxParticles);
    generalData.positionHistoryCount = new Uint16Array(maxParticles);
    if (trailConfig.minVertexDistance > 0) {
      generalData.trailLastSampledPosition = new Float32Array(maxParticles * 3);
    }
    if (trailConfig.maxTime > 0) {
      generalData.trailSampleTimes = new Float64Array(
        maxParticles * trailLength
      );
    }
    if (trailConfig.twistPrevention) {
      generalData.trailPrevNormal = new Float32Array(maxParticles * 3);
    }
  }
  const attr = (name) => useInstancedAttributes ? `instance${name.charAt(0).toUpperCase()}${name.slice(1)}` : name;
  const posAttr = useInstancedAttributes ? "instanceOffset" : "position";
  const softParticlesEnabled = !!(renderer.softParticles?.enabled && renderer.softParticles?.depthTexture);
  const sharedUniforms = {
    elapsed: { value: 0 },
    map: { value: particleMap },
    tiles: {
      value: new THREE5.Vector2(
        textureSheetAnimation.tiles?.x ?? 1,
        textureSheetAnimation.tiles?.y ?? 1
      )
    },
    fps: { value: textureSheetAnimation.fps },
    useFPSForFrameIndex: {
      value: textureSheetAnimation.timeMode === "FPS" /* FPS */
    },
    // backgroundColor is authored in sRGB; convert to linear so the
    // fragment comparison against the (now linear) texture sample is valid.
    backgroundColor: { value: rgbSRGBToLinear(renderer.backgroundColor) },
    discardBackgroundColor: { value: renderer.discardBackgroundColor },
    backgroundColorTolerance: { value: renderer.backgroundColorTolerance },
    ...useInstancing ? { viewportHeight: { value: 1 } } : {},
    softParticlesEnabled: { value: softParticlesEnabled },
    softParticlesIntensity: {
      value: Math.max(renderer.softParticles?.intensity ?? 1, 1e-3)
    },
    sceneDepthTexture: {
      value: renderer.softParticles?.depthTexture ?? null
    },
    cameraNearFar: { value: new THREE5.Vector2(0.1, 1e3) }
  };
  const getVertexShader = () => {
    if (useMesh) return mesh_particle_vertex_shader_glsl_default;
    if (useInstancing) return instanced_particle_vertex_shader_glsl_default;
    return particle_system_vertex_shader_glsl_default;
  };
  const getFragmentShader = () => {
    if (useMesh) return mesh_particle_fragment_shader_glsl_default;
    if (useInstancing) return instanced_particle_fragment_shader_glsl_default;
    return particle_system_fragment_shader_glsl_default;
  };
  const useTSL = _tslMaterialFactory !== null;
  const useGPUCompute = useTSL && !useTrail && normalizedConfig.simulationBackend !== "CPU" /* CPU */ && !!_tslMaterialFactory?.createComputePipeline && !!_tslMaterialFactory.writeParticleToModifierBuffers && !!_tslMaterialFactory.deactivateParticleInModifierBuffers && !!_tslMaterialFactory.flushEmitQueue;
  let gpuPipeline = null;
  if (useGPUCompute) {
    gpuPipeline = _tslMaterialFactory.createComputePipeline(
      maxParticles,
      useInstancedAttributes,
      normalizedConfig,
      generalData.particleSystemId,
      normalizedForceFields.length,
      normalizedCollisionPlanes.length
    );
    if (gpuPipeline && _tslMaterialFactory.registerCurveDataLength) {
      _tslMaterialFactory.registerCurveDataLength(
        gpuPipeline.buffers,
        gpuPipeline.curveDataLength
      );
    }
  }
  const rendererConfig = {
    transparent: renderer.transparent,
    blending: renderer.blending,
    depthTest: renderer.depthTest,
    depthWrite: renderer.depthWrite
  };
  const material = useTSL ? _tslMaterialFactory.createTSLParticleMaterial(
    renderer.rendererType ?? "POINTS" /* POINTS */,
    sharedUniforms,
    rendererConfig,
    useGPUCompute
  ) : new THREE5.ShaderMaterial({
    uniforms: sharedUniforms,
    vertexShader: getVertexShader(),
    fragmentShader: getFragmentShader(),
    ...rendererConfig
  });
  let geometry;
  if (useMesh) {
    const meshConfig = renderer.mesh;
    if (!meshConfig?.geometry) {
      throw new Error(
        "RendererType.MESH requires a mesh configuration with a geometry. Set renderer.mesh.geometry to a THREE.BufferGeometry instance."
      );
    }
    const instancedGeometry = new THREE5.InstancedBufferGeometry();
    const sourceGeom = meshConfig.geometry;
    const srcPos = sourceGeom.getAttribute("position");
    if (srcPos) instancedGeometry.setAttribute("position", srcPos);
    const srcNormal = sourceGeom.getAttribute("normal");
    if (srcNormal) instancedGeometry.setAttribute("normal", srcNormal);
    const srcUv = sourceGeom.getAttribute("uv");
    if (srcUv) instancedGeometry.setAttribute("uv", srcUv);
    const srcIndex = sourceGeom.getIndex();
    if (srcIndex) instancedGeometry.setIndex(srcIndex);
    instancedGeometry.instanceCount = maxParticles;
    geometry = instancedGeometry;
  } else if (useInstancing) {
    const instancedGeometry = new THREE5.InstancedBufferGeometry();
    const quadPositions = new Float32Array([
      -0.5,
      -0.5,
      0,
      0.5,
      -0.5,
      0,
      0.5,
      0.5,
      0,
      -0.5,
      0.5,
      0
    ]);
    const quadIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    instancedGeometry.setAttribute(
      "position",
      new THREE5.BufferAttribute(quadPositions, 3)
    );
    instancedGeometry.setIndex(new THREE5.BufferAttribute(quadIndices, 1));
    instancedGeometry.instanceCount = maxParticles;
    geometry = instancedGeometry;
  } else {
    geometry = new THREE5.BufferGeometry();
  }
  for (let i = 0; i < maxParticles; i++)
    calculatePositionAndVelocity(
      generalData,
      shape,
      startSpeed,
      startPositions[i],
      velocities[i]
    );
  const scalarArray = new Float32Array(maxParticles * SCALAR_STRIDE);
  for (let i = 0; i < maxParticles; i++) {
    const base = i * SCALAR_STRIDE;
    scalarArray[base + S_IS_ACTIVE] = 0;
    scalarArray[base + S_LIFETIME] = 0;
    scalarArray[base + S_START_LIFETIME] = calculateValue(generalData.particleSystemId, startLifetime, 0) * 1e3;
    scalarArray[base + S_START_FRAME] = textureSheetAnimation.startFrame ? calculateValue(
      generalData.particleSystemId,
      textureSheetAnimation.startFrame,
      0
    ) : 0;
    scalarArray[base + S_SIZE] = generalData.startValues.startSize[i];
    scalarArray[base + S_ROTATION] = 0;
    const colorRandomRatio = Math.random();
    scalarArray[base + S_COLOR_R] = sRGBToLinear(
      startColor.min.r + colorRandomRatio * (startColor.max.r - startColor.min.r)
    );
    scalarArray[base + S_COLOR_G] = sRGBToLinear(
      startColor.min.g + colorRandomRatio * (startColor.max.g - startColor.min.g)
    );
    scalarArray[base + S_COLOR_B] = sRGBToLinear(
      startColor.min.b + colorRandomRatio * (startColor.max.b - startColor.min.b)
    );
    scalarArray[base + S_COLOR_A] = 0;
  }
  const scalarInterleavedBuffer = useInstancedAttributes ? new THREE5.InstancedInterleavedBuffer(scalarArray, SCALAR_STRIDE) : new THREE5.InterleavedBuffer(scalarArray, SCALAR_STRIDE);
  if (useGPUCompute && gpuPipeline) {
    const gpuBuf = gpuPipeline.buffers;
    geometry.setAttribute(posAttr, gpuBuf.position);
    geometry.setAttribute(attr("color"), gpuBuf.color);
    geometry.setAttribute(attr("particleState"), gpuBuf.particleState);
    geometry.setAttribute(attr("startValues"), gpuBuf.startValues);
  } else {
    const positionArray = new Float32Array(maxParticles * 3);
    for (let i = 0; i < maxParticles; i++) {
      positionArray[i * 3] = startPositions[i].x;
      positionArray[i * 3 + 1] = startPositions[i].y;
      positionArray[i * 3 + 2] = startPositions[i].z;
    }
    const positionAttribute = useInstancedAttributes ? new THREE5.InstancedBufferAttribute(positionArray, 3) : new THREE5.BufferAttribute(positionArray, 3);
    geometry.setAttribute(posAttr, positionAttribute);
    geometry.setAttribute(
      attr("isActive"),
      new THREE5.InterleavedBufferAttribute(
        scalarInterleavedBuffer,
        1,
        S_IS_ACTIVE
      )
    );
    geometry.setAttribute(
      attr("lifetime"),
      new THREE5.InterleavedBufferAttribute(
        scalarInterleavedBuffer,
        1,
        S_LIFETIME
      )
    );
    geometry.setAttribute(
      attr("startLifetime"),
      new THREE5.InterleavedBufferAttribute(
        scalarInterleavedBuffer,
        1,
        S_START_LIFETIME
      )
    );
    geometry.setAttribute(
      attr("startFrame"),
      new THREE5.InterleavedBufferAttribute(
        scalarInterleavedBuffer,
        1,
        S_START_FRAME
      )
    );
    geometry.setAttribute(
      attr("size"),
      new THREE5.InterleavedBufferAttribute(scalarInterleavedBuffer, 1, S_SIZE)
    );
    geometry.setAttribute(
      attr("rotation"),
      new THREE5.InterleavedBufferAttribute(
        scalarInterleavedBuffer,
        1,
        S_ROTATION
      )
    );
    geometry.setAttribute(
      attr("color"),
      new THREE5.InterleavedBufferAttribute(
        scalarInterleavedBuffer,
        4,
        S_COLOR_R
      )
    );
  }
  if (useMesh && !useGPUCompute) {
    const quatArray = new Float32Array(maxParticles * 4);
    for (let i = 0; i < maxParticles; i++) {
      quatArray[i * 4 + 3] = 1;
    }
    geometry.setAttribute(
      attr("quat"),
      new THREE5.InstancedBufferAttribute(quatArray, 4)
    );
  }
  const a = geometry.attributes;
  const aIsActive = a[attr("isActive")];
  const aColor = a[attr("color")];
  const aStartFrame = a[attr("startFrame")];
  const aStartLifetime = a[attr("startLifetime")];
  const aSize = a[attr("size")];
  const aRotation = a[attr("rotation")];
  const aLifetime = a[attr("lifetime")];
  const aPosition = a[posAttr];
  const aQuat = useMesh && !useGPUCompute ? a[attr("quat")] : void 0;
  const deactivateParticle = (particleIndex) => {
    const base = particleIndex * SCALAR_STRIDE;
    scalarArray[base + S_IS_ACTIVE] = 0;
    scalarArray[base + S_COLOR_A] = 0;
    if (useGPUCompute && gpuPipeline) {
      _tslMaterialFactory.deactivateParticleInModifierBuffers(
        gpuPipeline.buffers,
        particleIndex
      );
    } else {
      scalarInterleavedBuffer.needsUpdate = true;
    }
    freeList.push(particleIndex);
  };
  const activateParticle = ({
    particleIndex,
    activationTime,
    position
  }) => {
    const base = particleIndex * SCALAR_STRIDE;
    if (particleIndex >= generalData.hwm) generalData.hwm = particleIndex + 1;
    scalarArray[base + S_IS_ACTIVE] = 1;
    generalData.creationTimes[particleIndex] = activationTime;
    if (generalData.positionHistoryCount) {
      generalData.positionHistoryCount[particleIndex] = 0;
      generalData.positionHistoryIndex[particleIndex] = 0;
      if (generalData.trailLastSampledPosition) {
        const lsIdx = particleIndex * 3;
        generalData.trailLastSampledPosition[lsIdx] = 0;
        generalData.trailLastSampledPosition[lsIdx + 1] = 0;
        generalData.trailLastSampledPosition[lsIdx + 2] = 0;
      }
      if (generalData.trailPrevNormal) {
        const nIdx = particleIndex * 3;
        generalData.trailPrevNormal[nIdx] = 0;
        generalData.trailPrevNormal[nIdx + 1] = 0;
        generalData.trailPrevNormal[nIdx + 2] = 0;
      }
    }
    if (generalData.noise.offsets)
      generalData.noise.offsets[particleIndex] = Math.random() * 100;
    const colorRandomRatio = Math.random();
    const cfgStartColor = normalizedConfig.startColor;
    scalarArray[base + S_COLOR_R] = sRGBToLinear(
      cfgStartColor.min.r + colorRandomRatio * (cfgStartColor.max.r - cfgStartColor.min.r)
    );
    scalarArray[base + S_COLOR_G] = sRGBToLinear(
      cfgStartColor.min.g + colorRandomRatio * (cfgStartColor.max.g - cfgStartColor.min.g)
    );
    scalarArray[base + S_COLOR_B] = sRGBToLinear(
      cfgStartColor.min.b + colorRandomRatio * (cfgStartColor.max.b - cfgStartColor.min.b)
    );
    generalData.startValues.startColorR[particleIndex] = scalarArray[base + S_COLOR_R];
    generalData.startValues.startColorG[particleIndex] = scalarArray[base + S_COLOR_G];
    generalData.startValues.startColorB[particleIndex] = scalarArray[base + S_COLOR_B];
    scalarArray[base + S_START_FRAME] = normalizedConfig.textureSheetAnimation.startFrame ? calculateValue(
      generalData.particleSystemId,
      normalizedConfig.textureSheetAnimation.startFrame,
      0
    ) : 0;
    scalarArray[base + S_START_LIFETIME] = calculateValue(
      generalData.particleSystemId,
      normalizedConfig.startLifetime,
      generalData.normalizedLifetimePercentage
    ) * 1e3;
    generalData.startValues.startSize[particleIndex] = calculateValue(
      generalData.particleSystemId,
      normalizedConfig.startSize,
      generalData.normalizedLifetimePercentage
    );
    scalarArray[base + S_SIZE] = generalData.startValues.startSize[particleIndex];
    generalData.startValues.startOpacity[particleIndex] = calculateValue(
      generalData.particleSystemId,
      normalizedConfig.startOpacity,
      generalData.normalizedLifetimePercentage
    );
    scalarArray[base + S_COLOR_A] = generalData.startValues.startOpacity[particleIndex];
    scalarArray[base + S_ROTATION] = calculateValue(
      generalData.particleSystemId,
      normalizedConfig.startRotation,
      generalData.normalizedLifetimePercentage
    );
    if (aQuat) {
      const rotZ = scalarArray[base + S_ROTATION];
      const halfZ = rotZ * 0.5;
      const qi = particleIndex * 4;
      aQuat.array[qi] = 0;
      aQuat.array[qi + 1] = 0;
      aQuat.array[qi + 2] = Math.sin(halfZ);
      aQuat.array[qi + 3] = Math.cos(halfZ);
      aQuat.needsUpdate = true;
    }
    if (normalizedConfig.rotationOverLifetime.isActive)
      generalData.lifetimeValues.rotationOverLifetime[particleIndex] = THREE5.MathUtils.randFloat(
        normalizedConfig.rotationOverLifetime.min,
        normalizedConfig.rotationOverLifetime.max
      );
    calculatePositionAndVelocity(
      generalData,
      normalizedConfig.shape,
      normalizedConfig.startSpeed,
      startPositions[particleIndex],
      velocities[particleIndex]
    );
    {
      const positionIndex = particleIndex * 3;
      const isWorld = normalizedConfig.simulationSpace === "WORLD" /* WORLD */;
      const ox = startPositions[particleIndex].x;
      const oy = startPositions[particleIndex].y;
      const oz = startPositions[particleIndex].z;
      if (isWorld) {
        const m = generalData.sourceWorldMatrix.elements;
        const s = generalData.worldScale;
        aPosition.array[positionIndex] = position.x + ox * s.x + m[12];
        aPosition.array[positionIndex + 1] = position.y + oy * s.y + m[13];
        aPosition.array[positionIndex + 2] = position.z + oz * s.z + m[14];
      } else {
        aPosition.array[positionIndex] = position.x + ox;
        aPosition.array[positionIndex + 1] = position.y + oy;
        aPosition.array[positionIndex + 2] = position.z + oz;
      }
      if (!useGPUCompute) {
        aPosition.needsUpdate = true;
      }
    }
    if (generalData.linearVelocityData) {
      generalData.linearVelocityData[particleIndex].speed.set(
        normalizedConfig.velocityOverLifetime.linear.x ? calculateValue(
          generalData.particleSystemId,
          normalizedConfig.velocityOverLifetime.linear.x,
          0
        ) : 0,
        normalizedConfig.velocityOverLifetime.linear.y ? calculateValue(
          generalData.particleSystemId,
          normalizedConfig.velocityOverLifetime.linear.y,
          0
        ) : 0,
        normalizedConfig.velocityOverLifetime.linear.z ? calculateValue(
          generalData.particleSystemId,
          normalizedConfig.velocityOverLifetime.linear.z,
          0
        ) : 0
      );
    }
    if (generalData.orbitalVelocityData) {
      generalData.orbitalVelocityData[particleIndex].speed.set(
        normalizedConfig.velocityOverLifetime.orbital.x ? calculateValue(
          generalData.particleSystemId,
          normalizedConfig.velocityOverLifetime.orbital.x,
          0
        ) : 0,
        normalizedConfig.velocityOverLifetime.orbital.y ? calculateValue(
          generalData.particleSystemId,
          normalizedConfig.velocityOverLifetime.orbital.y,
          0
        ) : 0,
        normalizedConfig.velocityOverLifetime.orbital.z ? calculateValue(
          generalData.particleSystemId,
          normalizedConfig.velocityOverLifetime.orbital.z,
          0
        ) : 0
      );
      generalData.orbitalVelocityData[particleIndex].positionOffset.set(
        startPositions[particleIndex].x,
        startPositions[particleIndex].y,
        startPositions[particleIndex].z
      );
    }
    scalarArray[base + S_LIFETIME] = 0;
    if (useGPUCompute && gpuPipeline) {
      const isWorld = normalizedConfig.simulationSpace === "WORLD" /* WORLD */;
      const m = generalData.sourceWorldMatrix.elements;
      const s = generalData.worldScale;
      const ox = startPositions[particleIndex].x;
      const oy = startPositions[particleIndex].y;
      const oz = startPositions[particleIndex].z;
      _tslMaterialFactory.writeParticleToModifierBuffers(
        gpuPipeline.buffers,
        particleIndex,
        {
          position: {
            x: position.x + (isWorld ? ox * s.x + m[12] : ox),
            y: position.y + (isWorld ? oy * s.y + m[13] : oy),
            z: position.z + (isWorld ? oz * s.z + m[14] : oz)
          },
          velocity: {
            x: velocities[particleIndex].x,
            y: velocities[particleIndex].y,
            z: velocities[particleIndex].z
          },
          startLifetime: scalarArray[base + S_START_LIFETIME],
          colorA: scalarArray[base + S_COLOR_A],
          size: scalarArray[base + S_SIZE],
          rotation: scalarArray[base + S_ROTATION],
          colorR: scalarArray[base + S_COLOR_R],
          colorG: scalarArray[base + S_COLOR_G],
          colorB: scalarArray[base + S_COLOR_B],
          startSize: generalData.startValues.startSize[particleIndex],
          startOpacity: generalData.startValues.startOpacity[particleIndex],
          startColorR: generalData.startValues.startColorR[particleIndex],
          startColorG: generalData.startValues.startColorG[particleIndex],
          startColorB: generalData.startValues.startColorB[particleIndex],
          rotationSpeed: generalData.lifetimeValues.rotationOverLifetime ? generalData.lifetimeValues.rotationOverLifetime[particleIndex] : 0,
          noiseOffset: generalData.noise.offsets ? generalData.noise.offsets[particleIndex] : 0,
          startFrame: scalarArray[base + S_START_FRAME],
          orbitalOffset: {
            x: startPositions[particleIndex].x,
            y: startPositions[particleIndex].y,
            z: startPositions[particleIndex].z
          }
        }
      );
    } else {
      scalarInterleavedBuffer.needsUpdate = true;
      applyModifiers({
        delta: 0,
        generalData,
        normalizedConfig,
        attributes: mappedAttributes,
        scalarArray,
        particleLifetimePercentage: 0,
        particleIndex
      });
    }
  };
  const subEmitterArr = subEmitters ?? [];
  const deathSubEmitters = subEmitterArr.filter(
    (s) => (s.trigger ?? "DEATH" /* DEATH */) === "DEATH" /* DEATH */
  );
  const birthSubEmitters = subEmitterArr.filter(
    (s) => s.trigger === "BIRTH" /* BIRTH */
  );
  const subEmitterInstancesMap = /* @__PURE__ */ new Map();
  for (const cfg of subEmitterArr) {
    subEmitterInstancesMap.set(cfg, []);
  }
  const cleanupCompletedInstances = (instances) => {
    for (let i = instances.length - 1; i >= 0; i--) {
      const sub = instances[i];
      const geomAttrs = sub.instance.geometry?.attributes;
      const isActiveAttr = geomAttrs ? geomAttrs.isActive ?? geomAttrs.instanceIsActive : void 0;
      if (!isActiveAttr) {
        sub.dispose();
        instances.splice(i, 1);
        continue;
      }
      let hasActive = false;
      for (let j = 0; j < isActiveAttr.count; j++) {
        if (isActiveAttr.getX(j)) {
          hasActive = true;
          break;
        }
      }
      if (!hasActive) {
        sub.dispose();
        instances.splice(i, 1);
      }
    }
  };
  const spawnSubEmitters = (configs, position, velocity, spawnNow) => {
    const parentObj = particleSystem.parent;
    _subLocalPosition.copy(position);
    if (parentObj) {
      parentObj.updateMatrixWorld();
      parentObj.worldToLocal(_subLocalPosition);
    }
    for (const subConfig of configs) {
      const instances = subEmitterInstancesMap.get(subConfig);
      const maxInst = subConfig.maxInstances ?? 32;
      if (instances.length >= maxInst) {
        cleanupCompletedInstances(instances);
        if (instances.length >= maxInst) continue;
      }
      const inheritVelocity = subConfig.inheritVelocity ?? 0;
      const subSystem = createParticleSystem(
        {
          ...subConfig.config,
          looping: false,
          // Sub-emitters must always use CPU simulation because their compute
          // nodes cannot be dispatched independently by the parent system.
          simulationBackend: "CPU" /* CPU */,
          transform: {
            ...subConfig.config.transform,
            position: new THREE5.Vector3(
              _subLocalPosition.x,
              _subLocalPosition.y,
              _subLocalPosition.z
            )
          },
          renderer: {
            ...subConfig.config.renderer ?? {},
            ...subConfig.config.renderer?.rendererType ? {} : renderer.rendererType === "MESH" /* MESH */ || renderer.rendererType === "TRAIL" /* TRAIL */ ? {} : { rendererType: renderer.rendererType }
          },
          ...inheritVelocity > 0 ? {
            startSpeed: (typeof subConfig.config.startSpeed === "number" ? subConfig.config.startSpeed : typeof subConfig.config.startSpeed === "object" && subConfig.config.startSpeed !== null && "min" in subConfig.config.startSpeed ? subConfig.config.startSpeed.min ?? 0 : 0) + velocity.length() * inheritVelocity
          } : {}
        },
        spawnNow
      );
      if (parentObj) parentObj.add(subSystem.instance);
      instances.push(subSystem);
    }
  };
  let trailMesh;
  let trailGeometry;
  let trailPositionAttr;
  let trailAlphaAttr;
  let trailColorAttr;
  let trailNextAttr;
  let trailHalfWidthAttr;
  let trailUVAttr;
  let trailIndexAttr;
  let trailWidthCurveFn;
  let trailOpacityCurveFn;
  let trailColorOverTrailFns;
  if (useTrail && trailConfig) {
    const trailLength = trailConfig.length;
    const verticesPerParticle = trailLength * 2;
    const totalVertices = maxParticles * verticesPerParticle;
    const indicesPerParticle = (trailLength - 1) * 6;
    const totalIndices = maxParticles * indicesPerParticle;
    trailGeometry = new THREE5.BufferGeometry();
    const trailPositions = new Float32Array(totalVertices * 3);
    const trailNextPositions = new Float32Array(totalVertices * 3);
    const trailAlphas = new Float32Array(totalVertices);
    const trailColors = new Float32Array(totalVertices * 4);
    const trailOffsets = new Float32Array(totalVertices);
    const trailHalfWidths = new Float32Array(totalVertices);
    const trailUVs = new Float32Array(totalVertices * 2);
    const trailIndices = new Uint32Array(totalIndices);
    for (let p = 0; p < maxParticles; p++) {
      const vertBase = p * verticesPerParticle;
      const idxBase = p * indicesPerParticle;
      for (let s = 0; s < trailLength; s++) {
        trailOffsets[vertBase + s * 2] = -1;
        trailOffsets[vertBase + s * 2 + 1] = 1;
      }
      for (let s = 0; s < trailLength - 1; s++) {
        const i = idxBase + s * 6;
        const v = vertBase + s * 2;
        trailIndices[i] = v;
        trailIndices[i + 1] = v + 1;
        trailIndices[i + 2] = v + 2;
        trailIndices[i + 3] = v + 1;
        trailIndices[i + 4] = v + 3;
        trailIndices[i + 5] = v + 2;
      }
    }
    trailPositionAttr = new THREE5.BufferAttribute(trailPositions, 3);
    trailPositionAttr.setUsage(THREE5.DynamicDrawUsage);
    trailNextAttr = new THREE5.BufferAttribute(trailNextPositions, 3);
    trailNextAttr.setUsage(THREE5.DynamicDrawUsage);
    trailAlphaAttr = new THREE5.BufferAttribute(trailAlphas, 1);
    trailAlphaAttr.setUsage(THREE5.DynamicDrawUsage);
    trailColorAttr = new THREE5.BufferAttribute(trailColors, 4);
    trailColorAttr.setUsage(THREE5.DynamicDrawUsage);
    trailHalfWidthAttr = new THREE5.BufferAttribute(trailHalfWidths, 1);
    trailHalfWidthAttr.setUsage(THREE5.DynamicDrawUsage);
    trailUVAttr = new THREE5.BufferAttribute(trailUVs, 2);
    trailUVAttr.setUsage(THREE5.DynamicDrawUsage);
    trailIndexAttr = new THREE5.BufferAttribute(trailIndices, 1);
    trailGeometry.setAttribute("position", trailPositionAttr);
    trailGeometry.setAttribute("trailNext", trailNextAttr);
    trailGeometry.setAttribute("trailAlpha", trailAlphaAttr);
    trailGeometry.setAttribute("trailColor", trailColorAttr);
    trailGeometry.setAttribute(
      "trailOffset",
      new THREE5.BufferAttribute(trailOffsets, 1)
    );
    trailGeometry.setAttribute("trailHalfWidth", trailHalfWidthAttr);
    trailGeometry.setAttribute("trailUV", trailUVAttr);
    trailGeometry.setIndex(trailIndexAttr);
    const trailUniformValues = {
      map: { value: particleMap },
      useMap: { value: !!particleMap },
      discardBackgroundColor: { value: renderer.discardBackgroundColor },
      // sRGB ??? linear so the trail fragment comparison matches the
      // (now linear) texture sample and vertex color.
      backgroundColor: { value: rgbSRGBToLinear(renderer.backgroundColor) },
      backgroundColorTolerance: { value: renderer.backgroundColorTolerance },
      softParticlesEnabled: { value: softParticlesEnabled },
      softParticlesIntensity: {
        value: Math.max(renderer.softParticles?.intensity ?? 1, 1e-3)
      },
      sceneDepthTexture: {
        value: renderer.softParticles?.depthTexture ?? null
      },
      cameraNearFar: { value: new THREE5.Vector2(0.1, 1e3) }
    };
    const trailMaterial = useTSL ? _tslMaterialFactory.createTSLTrailMaterial(
      trailUniformValues,
      rendererConfig
    ) : new THREE5.ShaderMaterial({
      uniforms: trailUniformValues,
      vertexShader: trail_vertex_shader_glsl_default,
      fragmentShader: trail_fragment_shader_glsl_default,
      ...rendererConfig,
      side: THREE5.DoubleSide
    });
    trailMesh = new THREE5.Mesh(trailGeometry, trailMaterial);
    trailMesh.frustumCulled = false;
    const trailCameraPos = new THREE5.Vector3();
    trailMesh.onBeforeRender = (_renderer, _scene, camera) => {
      camera.getWorldPosition(trailCameraPos);
      if (softParticlesEnabled && camera.isPerspectiveCamera) {
        const perspCam = camera;
        trailUniformValues.cameraNearFar.value.set(
          perspCam.near,
          perspCam.far
        );
      }
    };
    generalData.trailCameraPosition = trailCameraPos;
    trailWidthCurveFn = getCurveFunctionFromConfig(
      generalData.particleSystemId,
      trailConfig.widthOverTrail
    );
    trailOpacityCurveFn = getCurveFunctionFromConfig(
      generalData.particleSystemId,
      trailConfig.opacityOverTrail
    );
    if (trailConfig.colorOverTrail?.isActive) {
      trailColorOverTrailFns = {
        r: getCurveFunctionFromConfig(
          generalData.particleSystemId,
          normalizeTrailCurve(trailConfig.colorOverTrail.r, defaultTrailCurve)
        ),
        g: getCurveFunctionFromConfig(
          generalData.particleSystemId,
          normalizeTrailCurve(trailConfig.colorOverTrail.g, defaultTrailCurve)
        ),
        b: getCurveFunctionFromConfig(
          generalData.particleSystemId,
          normalizeTrailCurve(trailConfig.colorOverTrail.b, defaultTrailCurve)
        )
      };
    }
  }
  let particleSystem = useInstancing || useMesh ? new THREE5.Mesh(geometry, material) : new THREE5.Points(geometry, material);
  if (useInstancing || softParticlesEnabled || useGPUCompute) {
    particleSystem.onBeforeRender = (glRenderer, _scene, camera) => {
      if (useInstancing) {
        const size = glRenderer.getSize(new THREE5.Vector2());
        sharedUniforms.viewportHeight.value = size.y * glRenderer.getPixelRatio();
      }
      if (softParticlesEnabled && camera.isPerspectiveCamera) {
        const perspCam = camera;
        sharedUniforms.cameraNearFar.value.set(
          perspCam.near,
          perspCam.far
        );
      }
    };
  }
  if (useTrail && trailMesh) {
    material.visible = false;
    particleSystem.add(trailMesh);
  }
  particleSystem.position.copy(transform.position);
  particleSystem.rotation.x = THREE5.MathUtils.degToRad(transform.rotation.x);
  particleSystem.rotation.y = THREE5.MathUtils.degToRad(transform.rotation.y);
  particleSystem.rotation.z = THREE5.MathUtils.degToRad(transform.rotation.z);
  particleSystem.scale.copy(transform.scale);
  const mappedAttributes = {
    position: aPosition,
    isActive: aIsActive,
    lifetime: aLifetime,
    startLifetime: aStartLifetime,
    startFrame: aStartFrame,
    size: aSize,
    rotation: aRotation,
    color: aColor,
    ...useMesh ? { quat: aQuat } : {}
  };
  const calculatedCreationTime = now + calculateValue(generalData.particleSystemId, startDelay) * 1e3;
  if (normalizedConfig.simulationSpace === "WORLD" /* WORLD */) {
    particleSystem.matrixWorldAutoUpdate = false;
    particleSystem.matrixWorld.identity();
  }
  const hasDeathSubEmitters = deathSubEmitters.length > 0;
  const hasBirthSubEmitters = birthSubEmitters.length > 0;
  const onParticleDeath = hasDeathSubEmitters ? (particleIndex, positionArr, velocity, deathNow) => {
    const posIdx = particleIndex * 3;
    _subEmitterPosition.set(
      positionArr[posIdx],
      positionArr[posIdx + 1],
      positionArr[posIdx + 2]
    );
    if (simulationSpace === "LOCAL" /* LOCAL */) {
      particleSystem.updateMatrixWorld();
      particleSystem.localToWorld(_subEmitterPosition);
    }
    spawnSubEmitters(
      deathSubEmitters,
      _subEmitterPosition,
      velocity,
      deathNow
    );
  } : void 0;
  const onParticleBirth = hasBirthSubEmitters ? (particleIndex, positionArr, velocity, birthNow) => {
    const posIdx = particleIndex * 3;
    _subEmitterPosition.set(
      positionArr[posIdx],
      positionArr[posIdx + 1],
      positionArr[posIdx + 2]
    );
    if (simulationSpace === "LOCAL" /* LOCAL */) {
      particleSystem.updateMatrixWorld();
      particleSystem.localToWorld(_subEmitterPosition);
    }
    spawnSubEmitters(
      birthSubEmitters,
      _subEmitterPosition,
      velocity,
      birthNow
    );
  } : void 0;
  const instanceData = {
    particleSystem,
    mappedAttributes,
    scalarArray,
    scalarInterleavedBuffer,
    elapsedUniform: sharedUniforms.elapsed,
    generalData,
    onUpdate,
    onComplete,
    creationTime: calculatedCreationTime,
    lastEmissionTime: calculatedCreationTime,
    duration,
    looping,
    simulationSpace,
    gravity,
    normalizedForceFields,
    normalizedCollisionPlanes,
    emission,
    normalizedConfig,
    iterationCount: 0,
    velocities,
    freeList,
    deactivateParticle,
    activateParticle,
    onParticleDeath,
    onParticleBirth,
    useGPUCompute: useGPUCompute && gpuPipeline !== null,
    computePipeline: gpuPipeline ?? void 0,
    computeDispatchReady: false,
    ...useTrail ? {
      trailMesh,
      trailPositionAttr,
      trailAlphaAttr,
      trailColorAttr,
      trailNextAttr,
      trailHalfWidthAttr,
      trailUVAttr,
      trailWidthCurveFn,
      trailOpacityCurveFn,
      trailColorOverTrailFns,
      trailConfig: {
        length: trailConfig.length,
        width: trailConfig.width,
        minVertexDistance: trailConfig.minVertexDistance,
        maxTime: trailConfig.maxTime,
        smoothing: trailConfig.smoothing,
        smoothingSubdivisions: trailConfig.smoothingSubdivisions,
        twistPrevention: trailConfig.twistPrevention,
        ribbonId: trailConfig.ribbonId
      }
    } : {}
  };
  createdParticleSystems.push(instanceData);
  const resumeEmitter = () => generalData.isEnabled = true;
  const pauseEmitter = () => generalData.isEnabled = false;
  const dispose = () => {
    for (const instances of subEmitterInstancesMap.values()) {
      for (const sub of instances) sub.dispose();
      instances.length = 0;
    }
    destroyParticleSystem(particleSystem);
  };
  const update = (cycleData) => {
    updateParticleSystemInstance(instanceData, cycleData);
    for (const instances of subEmitterInstancesMap.values()) {
      for (const sub of instances) sub.update(cycleData);
    }
  };
  const updateConfig = (partialConfig) => {
    ObjectUtils.deepMerge(instanceData.normalizedConfig, partialConfig, {
      applyToFirstObject: true,
      skippedProperties: []
    });
    const cfg = instanceData.normalizedConfig;
    if (partialConfig.gravity !== void 0) {
      instanceData.gravity = cfg.gravity;
    }
    if (partialConfig.duration !== void 0)
      instanceData.duration = cfg.duration;
    if (partialConfig.looping !== void 0) instanceData.looping = cfg.looping;
    if (partialConfig.simulationSpace !== void 0 && instanceData.simulationSpace !== cfg.simulationSpace) {
      for (let i = 0; i < maxParticles; i++) {
        if (scalarArray[i * SCALAR_STRIDE + S_IS_ACTIVE]) {
          deactivateParticle(i);
        }
      }
      generalData.lastWorldPosition.set(-99999, -99999, -99999);
      if (cfg.simulationSpace === "WORLD" /* WORLD */) {
        particleSystem.matrixWorldAutoUpdate = false;
        particleSystem.matrixWorld.identity();
      } else {
        particleSystem.matrixWorldAutoUpdate = true;
      }
      instanceData.simulationSpace = cfg.simulationSpace;
    }
    if (partialConfig.emission !== void 0)
      instanceData.emission = cfg.emission;
    if (partialConfig.forceFields !== void 0) {
      instanceData.normalizedForceFields = normalizeForceFields(
        cfg.forceFields
      );
    }
    if (partialConfig.collisionPlanes !== void 0) {
      instanceData.normalizedCollisionPlanes = normalizeCollisionPlanes(
        cfg.collisionPlanes
      );
    }
    if (partialConfig.noise !== void 0) {
      const n = cfg.noise;
      generalData.noise = {
        isActive: n.isActive,
        strength: n.strength,
        noisePower: 0.15 * n.strength,
        frequency: n.frequency,
        positionAmount: n.positionAmount,
        rotationAmount: n.rotationAmount,
        sizeAmount: n.sizeAmount,
        fbmMax: 2 - Math.pow(2, -n.octaves),
        sampler: n.isActive ? new FBM({
          seed: Math.random(),
          scale: n.frequency,
          octaves: n.octaves
        }) : void 0,
        offsets: n.useRandomOffset ? generalData.noise.offsets ?? Array.from({ length: maxParticles }, () => Math.random() * 100) : void 0
      };
    }
  };
  return {
    instance: particleSystem,
    resumeEmitter,
    pauseEmitter,
    dispose,
    update,
    updateConfig,
    computeNode: gpuPipeline?.computeNode ?? null
  };
};
var updateParticleSystemInstance = (props, { now, delta, elapsed }) => {
  const {
    onUpdate,
    generalData,
    onComplete,
    particleSystem,
    elapsedUniform,
    creationTime,
    lastEmissionTime,
    duration,
    looping,
    emission,
    normalizedConfig,
    iterationCount,
    velocities,
    freeList,
    deactivateParticle,
    activateParticle,
    simulationSpace,
    gravity,
    normalizedForceFields,
    normalizedCollisionPlanes,
    onParticleDeath,
    onParticleBirth,
    mappedAttributes: ma,
    useGPUCompute,
    computePipeline
  } = props;
  const hasForceFields = normalizedForceFields.length > 0;
  const hasCollisionPlanes = normalizedCollisionPlanes.length > 0;
  const lifetime = now - creationTime;
  const normalizedLifetime = lifetime % (duration * 1e3);
  generalData.normalizedLifetimePercentage = Math.max(
    Math.min(normalizedLifetime / (duration * 1e3), 1),
    0
  );
  const {
    lastWorldPosition,
    currentWorldPosition,
    worldPositionChange,
    worldQuaternion,
    worldEuler,
    gravityVelocity,
    sourceWorldMatrix,
    isEnabled
  } = generalData;
  _lastWorldPositionSnapshot.copy(lastWorldPosition);
  elapsedUniform.value = elapsed;
  if (simulationSpace === "WORLD" /* WORLD */) {
    particleSystem.updateMatrix();
    if (particleSystem.parent) {
      particleSystem.parent.updateMatrixWorld();
      sourceWorldMatrix.multiplyMatrices(
        particleSystem.parent.matrixWorld,
        particleSystem.matrix
      );
    } else {
      sourceWorldMatrix.copy(particleSystem.matrix);
    }
    sourceWorldMatrix.decompose(
      currentWorldPosition,
      worldQuaternion,
      generalData.worldScale
    );
    generalData.wrapperQuaternion.copy(worldQuaternion);
    particleSystem.matrixWorld.identity();
  } else {
    particleSystem.updateMatrixWorld();
    particleSystem.getWorldPosition(currentWorldPosition);
    particleSystem.getWorldQuaternion(worldQuaternion);
    particleSystem.getWorldScale(generalData.worldScale);
    generalData.wrapperQuaternion.identity();
  }
  if (lastWorldPosition.x !== -99999) {
    worldPositionChange.set(
      currentWorldPosition.x - lastWorldPosition.x,
      currentWorldPosition.y - lastWorldPosition.y,
      currentWorldPosition.z - lastWorldPosition.z
    );
  } else {
    worldPositionChange.set(0, 0, 0);
  }
  if (isEnabled) {
    generalData.distanceFromLastEmitByDistance += worldPositionChange.length();
  }
  lastWorldPosition.copy(currentWorldPosition);
  worldEuler.setFromQuaternion(worldQuaternion);
  if (simulationSpace === "WORLD" /* WORLD */) {
    gravityVelocity.set(0, gravity, 0);
  } else {
    gravityVelocity.set(0, gravity, 0);
    _inverseQuat.copy(worldQuaternion).invert();
    gravityVelocity.applyQuaternion(_inverseQuat);
    const sx = generalData.worldScale.x || 1;
    const sy = generalData.worldScale.y || 1;
    const sz = generalData.worldScale.z || 1;
    gravityVelocity.x /= sx;
    gravityVelocity.y /= sy;
    gravityVelocity.z /= sz;
  }
  if (hasForceFields) {
    if (simulationSpace === "LOCAL" /* LOCAL */) {
      _inverseQuat.copy(worldQuaternion).invert();
    }
    _localForceFields.length = normalizedForceFields.length;
    for (let i = 0; i < normalizedForceFields.length; i++) {
      const src = normalizedForceFields[i];
      let dst = _localForceFields[i];
      if (!dst) {
        dst = {
          isActive: true,
          type: "POINT" /* POINT */,
          position: new THREE5.Vector3(),
          direction: new THREE5.Vector3(),
          strength: 0,
          range: 0,
          falloff: "LINEAR" /* LINEAR */
        };
        _localForceFields[i] = dst;
      }
      dst.isActive = src.isActive;
      dst.type = src.type;
      dst.strength = src.strength;
      dst.range = src.range;
      dst.falloff = src.falloff;
      if (simulationSpace === "WORLD" /* WORLD */) {
        dst.position.copy(src.position);
        dst.direction.copy(src.direction);
      } else {
        _localForceFieldPos.copy(src.position);
        particleSystem.worldToLocal(_localForceFieldPos);
        dst.position.copy(_localForceFieldPos);
        _localForceFieldDir.copy(src.direction);
        _localForceFieldDir.applyQuaternion(_inverseQuat);
        dst.direction.copy(_localForceFieldDir);
      }
    }
  }
  if (hasCollisionPlanes) {
    if (simulationSpace === "LOCAL" /* LOCAL */ && !hasForceFields) {
      _inverseQuat.copy(worldQuaternion).invert();
    }
    _localCollisionPlanes.length = normalizedCollisionPlanes.length;
    for (let i = 0; i < normalizedCollisionPlanes.length; i++) {
      const src = normalizedCollisionPlanes[i];
      let dst = _localCollisionPlanes[i];
      if (!dst) {
        dst = {
          isActive: true,
          position: new THREE5.Vector3(),
          normal: new THREE5.Vector3(),
          mode: "KILL" /* KILL */,
          dampen: 0.5,
          lifetimeLoss: 0
        };
        _localCollisionPlanes[i] = dst;
      }
      dst.isActive = src.isActive;
      dst.mode = src.mode;
      dst.dampen = src.dampen;
      dst.lifetimeLoss = src.lifetimeLoss;
      if (simulationSpace === "WORLD" /* WORLD */) {
        dst.position.copy(src.position);
        dst.normal.copy(src.normal);
      } else {
        _localCollisionPlanePos.copy(src.position);
        particleSystem.worldToLocal(_localCollisionPlanePos);
        dst.position.copy(_localCollisionPlanePos);
        _localCollisionPlaneNormal.copy(src.normal);
        _localCollisionPlaneNormal.applyQuaternion(_inverseQuat);
        dst.normal.copy(_localCollisionPlaneNormal);
      }
    }
  }
  const creationTimes = generalData.creationTimes;
  const scalarArr = props.scalarArray;
  const positionArr = ma.position.array;
  const creationTimesLength = generalData.hwm > 0 ? generalData.hwm : creationTimes.length;
  if (useGPUCompute && computePipeline) {
    const cp = computePipeline;
    setUniformFloat(cp.uniforms.delta, delta);
    setUniformFloat(cp.uniforms.deltaMs, delta * 1e3);
    setUniformVec3(
      cp.uniforms.gravityVelocity,
      gravityVelocity.x,
      gravityVelocity.y,
      gravityVelocity.z
    );
    const noiseData = generalData.noise;
    setUniformFloat(cp.uniforms.noiseStrength, noiseData.strength);
    setUniformFloat(
      cp.uniforms.noisePower,
      noiseData.noisePower / noiseData.fbmMax
    );
    setUniformFloat(cp.uniforms.noiseFrequency, noiseData.frequency);
    setUniformFloat(cp.uniforms.noisePositionAmount, noiseData.positionAmount);
    setUniformFloat(cp.uniforms.noiseRotationAmount, noiseData.rotationAmount);
    setUniformFloat(cp.uniforms.noiseSizeAmount, noiseData.sizeAmount);
    if (cp.forceFieldInfo && hasForceFields && _tslMaterialFactory?.encodeForceFieldsForGPU) {
      const encodedFF = _tslMaterialFactory.encodeForceFieldsForGPU(
        _localForceFields,
        generalData.particleSystemId,
        generalData.normalizedLifetimePercentage
      );
      const curveArr = cp.buffers.curveData.array;
      const offset = cp.forceFieldInfo.offset;
      curveArr.set(encodedFF, offset);
      cp.buffers.curveData.addUpdateRange(offset, encodedFF.length);
      cp.buffers.curveData.needsUpdate = true;
      setUniformFloat(
        cp.forceFieldInfo.countUniform,
        normalizedForceFields.length
      );
    }
    if (cp.collisionPlaneInfo && hasCollisionPlanes && _tslMaterialFactory?.encodeCollisionPlanesForGPU) {
      const encodedCP = _tslMaterialFactory.encodeCollisionPlanesForGPU(
        _localCollisionPlanes
      );
      const curveArr = cp.buffers.curveData.array;
      const offset = cp.collisionPlaneInfo.offset;
      curveArr.set(encodedCP, offset);
      cp.buffers.curveData.addUpdateRange(offset, encodedCP.length);
      cp.buffers.curveData.needsUpdate = true;
      setUniformFloat(
        cp.collisionPlaneInfo.countUniform,
        normalizedCollisionPlanes.length
      );
    }
    if (_tslMaterialFactory?.flushEmitQueue) {
      _tslMaterialFactory.flushEmitQueue(cp.buffers);
    }
    props.computeDispatchReady = true;
    for (let index = 0; index < creationTimesLength; index++) {
      const base = index * SCALAR_STRIDE;
      if (scalarArr[base + S_IS_ACTIVE]) {
        const particleLifetime = now - creationTimes[index];
        if (particleLifetime > scalarArr[base + S_START_LIFETIME]) {
          if (onParticleDeath)
            onParticleDeath(index, positionArr, velocities[index], now);
          deactivateParticle(index);
        } else if (onParticleDeath) {
          const velocity = velocities[index];
          velocity.x -= gravityVelocity.x * delta;
          velocity.y -= gravityVelocity.y * delta;
          velocity.z -= gravityVelocity.z * delta;
          if (hasForceFields) {
            applyForceFields({
              particleSystemId: generalData.particleSystemId,
              forceFields: _localForceFields,
              velocity,
              positionArr,
              positionIndex: index * 3,
              delta,
              systemLifetimePercentage: generalData.normalizedLifetimePercentage
            });
          }
          const positionIndex = index * 3;
          positionArr[positionIndex] += velocity.x * delta;
          positionArr[positionIndex + 1] += velocity.y * delta;
          positionArr[positionIndex + 2] += velocity.z * delta;
          if (generalData.orbitalVelocityData) {
            const orbData = generalData.orbitalVelocityData[index];
            const { speed, positionOffset, valueModifiers } = orbData;
            const pctLife = particleLifetime / scalarArr[base + S_START_LIFETIME];
            positionArr[positionIndex] -= positionOffset.x;
            positionArr[positionIndex + 1] -= positionOffset.y;
            positionArr[positionIndex + 2] -= positionOffset.z;
            const sx = valueModifiers.x ? valueModifiers.x(pctLife) : speed.x;
            const sy = valueModifiers.y ? valueModifiers.y(pctLife) : speed.y;
            const sz = valueModifiers.z ? valueModifiers.z(pctLife) : speed.z;
            _shadowOrbitalEuler.set(sx * delta, sz * delta, sy * delta);
            positionOffset.applyEuler(_shadowOrbitalEuler);
            positionArr[positionIndex] += positionOffset.x;
            positionArr[positionIndex + 1] += positionOffset.y;
            positionArr[positionIndex + 2] += positionOffset.z;
          }
          if (hasCollisionPlanes) {
            applyCollisionPlanes({
              collisionPlanes: _localCollisionPlanes,
              velocity,
              positionArr,
              positionIndex,
              scalarArr,
              scalarBase: base,
              deactivateParticle: (pi) => {
                if (onParticleDeath)
                  onParticleDeath(pi, positionArr, velocities[pi], now);
                deactivateParticle(pi);
              },
              particleIndex: index
            });
          }
        }
      }
    }
  } else {
    let positionNeedsUpdate = false;
    let scalarNeedsUpdate = false;
    _modifierParams.delta = delta;
    _modifierParams.generalData = generalData;
    _modifierParams.normalizedConfig = normalizedConfig;
    _modifierParams.attributes = ma;
    _modifierParams.scalarArray = scalarArr;
    for (let index = 0; index < creationTimesLength; index++) {
      const base = index * SCALAR_STRIDE;
      if (scalarArr[base + S_IS_ACTIVE]) {
        const particleLifetime = now - creationTimes[index];
        if (particleLifetime > scalarArr[base + S_START_LIFETIME]) {
          if (onParticleDeath)
            onParticleDeath(index, positionArr, velocities[index], now);
          deactivateParticle(index);
        } else {
          const velocity = velocities[index];
          velocity.x -= gravityVelocity.x * delta;
          velocity.y -= gravityVelocity.y * delta;
          velocity.z -= gravityVelocity.z * delta;
          if (hasForceFields) {
            applyForceFields({
              particleSystemId: generalData.particleSystemId,
              forceFields: _localForceFields,
              velocity,
              positionArr,
              positionIndex: index * 3,
              delta,
              systemLifetimePercentage: generalData.normalizedLifetimePercentage
            });
          }
          if (gravity !== 0 || velocity.x !== 0 || velocity.y !== 0 || velocity.z !== 0) {
            const positionIndex = index * 3;
            positionArr[positionIndex] += velocity.x * delta;
            positionArr[positionIndex + 1] += velocity.y * delta;
            positionArr[positionIndex + 2] += velocity.z * delta;
            positionNeedsUpdate = true;
          }
          if (hasCollisionPlanes) {
            const killed = applyCollisionPlanes({
              collisionPlanes: _localCollisionPlanes,
              velocity,
              positionArr,
              positionIndex: index * 3,
              scalarArr,
              scalarBase: base,
              deactivateParticle: (pi) => {
                if (onParticleDeath)
                  onParticleDeath(pi, positionArr, velocities[pi], now);
                deactivateParticle(pi);
              },
              particleIndex: index
            });
            if (killed) {
              positionNeedsUpdate = true;
              continue;
            }
          }
          scalarArr[base + S_LIFETIME] = particleLifetime;
          scalarNeedsUpdate = true;
          _modifierParams.particleLifetimePercentage = particleLifetime / scalarArr[base + S_START_LIFETIME];
          _modifierParams.particleIndex = index;
          applyModifiers(_modifierParams);
        }
      }
    }
    if (positionNeedsUpdate) ma.position.needsUpdate = true;
    if (scalarNeedsUpdate) props.scalarInterleavedBuffer.needsUpdate = true;
  }
  if (isEnabled && (looping || lifetime < duration * 1e3)) {
    const emissionDelta = now - lastEmissionTime;
    const neededParticlesByTime = emission.rateOverTime ? Math.floor(
      calculateValue(
        generalData.particleSystemId,
        emission.rateOverTime,
        generalData.normalizedLifetimePercentage
      ) * (emissionDelta / 1e3)
    ) : 0;
    const rateOverDistance = emission.rateOverDistance ? calculateValue(
      generalData.particleSystemId,
      emission.rateOverDistance,
      generalData.normalizedLifetimePercentage
    ) : 0;
    const neededParticlesByDistance = rateOverDistance > 0 && generalData.distanceFromLastEmitByDistance > 0 ? Math.floor(
      generalData.distanceFromLastEmitByDistance / (1 / rateOverDistance)
    ) : 0;
    const useDistanceStep = neededParticlesByDistance > 0;
    if (useDistanceStep) {
      _distanceStep.x = (currentWorldPosition.x - _lastWorldPositionSnapshot.x) / neededParticlesByDistance;
      _distanceStep.y = (currentWorldPosition.y - _lastWorldPositionSnapshot.y) / neededParticlesByDistance;
      _distanceStep.z = (currentWorldPosition.z - _lastWorldPositionSnapshot.z) / neededParticlesByDistance;
    }
    let neededParticles = neededParticlesByTime + neededParticlesByDistance;
    if (rateOverDistance > 0 && neededParticlesByDistance >= 1) {
      generalData.distanceFromLastEmitByDistance = 0;
    }
    if (emission.bursts && generalData.burstStates) {
      const bursts = emission.bursts;
      const burstStates = generalData.burstStates;
      const currentIterationTime = normalizedLifetime;
      for (let i = 0; i < bursts.length; i++) {
        const burst = bursts[i];
        const state = burstStates[i];
        const burstTimeMs = burst.time * 1e3;
        const cycles = burst.cycles ?? 1;
        const intervalMs = (burst.interval ?? 0) * 1e3;
        const probability = burst.probability ?? 1;
        if (looping && currentIterationTime < burstTimeMs && state.cyclesExecuted > 0) {
          state.cyclesExecuted = 0;
          state.lastCycleTime = 0;
          state.probabilityPassed = false;
        }
        if (state.cyclesExecuted >= cycles) continue;
        const nextCycleTime = burstTimeMs + state.cyclesExecuted * intervalMs;
        if (currentIterationTime >= nextCycleTime) {
          if (state.cyclesExecuted === 0) {
            state.probabilityPassed = Math.random() < probability;
          }
          if (state.probabilityPassed) {
            const burstCount = Math.floor(
              calculateValue(
                generalData.particleSystemId,
                burst.count,
                generalData.normalizedLifetimePercentage
              )
            );
            neededParticles += burstCount;
          }
          state.cyclesExecuted++;
          state.lastCycleTime = currentIterationTime;
        }
      }
    }
    if (neededParticles > 0) {
      let generatedParticlesByDistanceNeeds = 0;
      for (let i = 0; i < neededParticles; i++) {
        if (freeList.length === 0) break;
        const particleIndex = freeList.pop();
        _tempPosition.x = 0;
        _tempPosition.y = 0;
        _tempPosition.z = 0;
        if (useDistanceStep && generatedParticlesByDistanceNeeds < neededParticlesByDistance) {
          _tempPosition.x = _distanceStep.x * generatedParticlesByDistanceNeeds;
          _tempPosition.y = _distanceStep.y * generatedParticlesByDistanceNeeds;
          _tempPosition.z = _distanceStep.z * generatedParticlesByDistanceNeeds;
          generatedParticlesByDistanceNeeds++;
        }
        activateParticle({
          particleIndex,
          activationTime: now,
          position: _tempPosition
        });
        if (onParticleBirth)
          onParticleBirth(
            particleIndex,
            ma.position.array,
            velocities[particleIndex],
            now
          );
        props.lastEmissionTime = now;
      }
    }
    if (onUpdate)
      onUpdate({
        particleSystem,
        delta,
        elapsed,
        lifetime,
        normalizedLifetime,
        iterationCount: iterationCount + 1
      });
  } else if (onComplete)
    onComplete({
      particleSystem
    });
  if (props.trailMesh) {
    updateTrailGeometry(props, now);
  }
};
var catmullRom = (out, outIdx, p0x, p0y, p0z, p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z, t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  out[outIdx] = 0.5 * (2 * p1x + (-p0x + p2x) * t + (2 * p0x - 5 * p1x + 4 * p2x - p3x) * t2 + (-p0x + 3 * p1x - 3 * p2x + p3x) * t3);
  out[outIdx + 1] = 0.5 * (2 * p1y + (-p0y + p2y) * t + (2 * p0y - 5 * p1y + 4 * p2y - p3y) * t2 + (-p0y + 3 * p1y - 3 * p2y + p3y) * t3);
  out[outIdx + 2] = 0.5 * (2 * p1z + (-p0z + p2z) * t + (2 * p0z - 5 * p1z + 4 * p2z - p3z) * t2 + (-p0z + 3 * p1z - 3 * p2z + p3z) * t3);
};
var clearTrailVertex = (vIdx, cIdx, aIdx, uvIdx, trailPosArr, trailNextArr, trailHalfWidthArr, trailUVArr, trailAlphaArr, trailColorArr, fallbackX, fallbackY, fallbackZ) => {
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
var writeTrailVertex = (vIdx, cIdx, aIdx, uvIdx, hx, hy, hz, nx, ny, nz, halfWidth, t, alpha, fr, fg, fb, ca, trailPosArr, trailNextArr, trailHalfWidthArr, trailUVArr, trailAlphaArr, trailColorArr) => {
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
    mappedAttributes: ma
  } = props;
  if (!trailPositionAttr || !trailAlphaAttr || !trailColorAttr || !trailNextAttrCached || !trailHalfWidthAttrCached || !trailUVAttrCached || !trailWidthCurveFn || !trailOpacityCurveFn || !trailConfig || !generalData.positionHistory || !generalData.positionHistoryIndex || !generalData.positionHistoryCount)
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
  const trailPosArr = trailPositionAttr.array;
  const trailAlphaArr = trailAlphaAttr.array;
  const trailColorArr = trailColorAttr.array;
  const trailNextArr = trailNextAttrCached.array;
  const trailUVArr = trailUVAttrCached.array;
  const trailHalfWidthArr = trailHalfWidthAttrCached.array;
  const verticesPerParticle = trailLength * 2;
  const creationTimesLength = generalData.hwm > 0 ? generalData.hwm : generalData.creationTimes.length;
  let hasUpdates = false;
  const useRibbon = ribbonId !== void 0;
  let ribbonLeader = -1;
  if (useRibbon) {
    if (!_ribbonIndices || _ribbonIndicesSize < creationTimesLength) {
      _ribbonIndices = new Uint16Array(creationTimesLength);
      _ribbonIndicesSize = creationTimesLength;
    }
    _ribbonCount = 0;
    for (let i = 0; i < creationTimesLength; i++) {
      if (trailScalarArr[i * SCALAR_STRIDE + S_IS_ACTIVE])
        _ribbonIndices[_ribbonCount++] = i;
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
        const histSlot = (historyIndex[index] - 1 - s + trailLength * 2) % trailLength * 3 + ringOff;
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
          const p0x = rawPts[i0 * 3], p0y = rawPts[i0 * 3 + 1], p0z = rawPts[i0 * 3 + 2];
          const p1x = rawPts[i1 * 3], p1y = rawPts[i1 * 3 + 1], p1z = rawPts[i1 * 3 + 2];
          const p2x = rawPts[i2 * 3], p2y = rawPts[i2 * 3 + 1], p2z = rawPts[i2 * 3 + 2];
          const p3x = rawPts[i3 * 3], p3y = rawPts[i3 * 3 + 1], p3z = rawPts[i3 * 3 + 2];
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
      for (let s = 0; s < trailLength; s++) {
        const vIdx = (vertBase + s * 2) * 3;
        const cIdx = (vertBase + s * 2) * 4;
        const aIdx = vertBase + s * 2;
        const uvIdxBase = (vertBase + s * 2) * 2;
        if (s >= finalCount) {
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
            const rawF = s / Math.max(finalCount - 1, 1) * (rawCount - 1);
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
          let upx = 0, upy = 1, upz = 0;
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
    } else if (historyCount[index] > 0) {
      hasUpdates = true;
      historyCount[index] = 0;
      historyIndex[index] = 0;
      for (let s = 0; s < trailLength; s++) {
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
    const filledCount = Math.min(
      trailLength,
      Math.max(controlCount * 4, controlCount)
    );
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
        _rawPoints[i * 3 + 1] = positionArr[p0Idx + 1] + t * (positionArr[p1Idx + 1] - positionArr[p0Idx + 1]);
        _rawPoints[i * 3 + 2] = positionArr[p0Idx + 2] + t * (positionArr[p1Idx + 2] - positionArr[p0Idx + 2]);
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
    for (let s = 0; s < trailLength; s++) {
      const vIdx = (leaderVertBase + s * 2) * 3;
      const cIdx = (leaderVertBase + s * 2) * 4;
      const aIdx = leaderVertBase + s * 2;
      const uvIdxBase = (leaderVertBase + s * 2) * 2;
      if (s >= filledCount) {
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
        let upx = 0, upy = 1, upz = 0;
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
      for (let s = 0; s < trailLength; s++) {
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
  createdParticleSystems.forEach(
    (props) => updateParticleSystemInstance(props, cycleData)
  );
};

// src/js/effects/three-particles/three-particles-serialization.ts
var SERIALIZATION_VERSION = 1;
var reverseBlendingMap = new Map(
  Object.entries(blendingMap).map(([k, v]) => [
    v,
    k
  ])
);
var reverseCurveFunctionMap = /* @__PURE__ */ new Map();
for (const [id, fn] of Object.entries(curveFunctionIdMap)) {
  if (fn) reverseCurveFunctionMap.set(fn, id);
}
function serializeAny(value, key) {
  if (value === null || value === void 0) return value;
  if (value instanceof THREE5.Vector3)
    return { x: value.x, y: value.y, z: value.z };
  if (value instanceof THREE5.Vector2) return { x: value.x, y: value.y };
  if (value instanceof THREE5.Texture) return void 0;
  if (typeof value === "function") return void 0;
  if (Array.isArray(value)) return value.map((item) => serializeAny(item));
  if (typeof value === "object") {
    const obj = value;
    if (obj["type"] === "EASING" /* EASING */ && typeof obj["curveFunction"] === "function") {
      const id = reverseCurveFunctionMap.get(
        obj["curveFunction"]
      );
      if (!id) {
        throw new Error(
          "Cannot serialize a custom curveFunction. Use a predefined CurveFunctionId instead."
        );
      }
      return {
        type: "EASING" /* EASING */,
        curveFunctionId: id,
        ...obj["scale"] !== void 0 ? { scale: obj["scale"] } : {}
      };
    }
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "onUpdate" || k === "onComplete") continue;
      if (k === "blending" && typeof v === "number") {
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
  if (Array.isArray(obj["bezierPoints"]) && !obj["type"]) {
    return { type: "BEZIER" /* BEZIER */, ...obj };
  }
  if (obj["type"] === "EASING" /* EASING */) {
    const id = obj["curveFunctionId"];
    const fn = getCurveFunction(id);
    if (!fn) {
      throw new Error(
        `Unknown curveFunctionId: "${id}". Use a value from CurveFunctionId.`
      );
    }
    const curve = {
      type: "EASING" /* EASING */,
      curveFunction: fn
    };
    if (obj["scale"] !== void 0) curve.scale = obj["scale"];
    return curve;
  }
  return obj;
}
function deserializeCurveOrValue(value) {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "object") return value;
  const obj = value;
  const looksLikeCurve = Array.isArray(obj["bezierPoints"]) || obj["type"] === "BEZIER" /* BEZIER */ || obj["type"] === "EASING" /* EASING */ || typeof obj["curveFunctionId"] === "string";
  if (looksLikeCurve) return deserializeCurve(obj);
  return obj;
}
function deserializeVector3(raw) {
  if (!raw || typeof raw !== "object") return void 0;
  const { x = 0, y = 0, z = 0 } = raw;
  return new THREE5.Vector3(x, y, z);
}
function deserializeVector2(raw) {
  if (!raw || typeof raw !== "object") return void 0;
  const { x = 1, y = 1 } = raw;
  return new THREE5.Vector2(x, y);
}
function deserializeConfig(raw) {
  const config = {};
  if (raw["transform"] && typeof raw["transform"] === "object") {
    const t = raw["transform"];
    config.transform = {
      position: deserializeVector3(t["position"]),
      rotation: deserializeVector3(t["rotation"]),
      scale: deserializeVector3(t["scale"])
    };
  }
  for (const field of [
    "duration",
    "looping",
    "gravity",
    "simulationSpace",
    "simulationBackend",
    "maxParticles"
  ]) {
    if (field in raw) config[field] = raw[field];
  }
  for (const field of [
    "startDelay",
    "startLifetime",
    "startSpeed",
    "startSize",
    "startOpacity",
    "startRotation"
  ]) {
    if (field in raw)
      config[field] = deserializeCurveOrValue(raw[field]);
  }
  if ("startColor" in raw)
    config.startColor = raw["startColor"];
  if (raw["emission"] && typeof raw["emission"] === "object") {
    const e = raw["emission"];
    config.emission = {
      rateOverTime: deserializeCurveOrValue(e["rateOverTime"]),
      rateOverDistance: deserializeCurveOrValue(
        e["rateOverDistance"]
      ),
      bursts: Array.isArray(e["bursts"]) ? e["bursts"] : []
    };
  }
  if ("shape" in raw)
    config.shape = raw["shape"];
  if (raw["renderer"] && typeof raw["renderer"] === "object") {
    const r = raw["renderer"];
    const blending = typeof r["blending"] === "string" ? blendingMap[r["blending"]] ?? THREE5.NormalBlending : r["blending"] ?? THREE5.NormalBlending;
    config.renderer = { ...r, blending };
  }
  if (raw["velocityOverLifetime"] && typeof raw["velocityOverLifetime"] === "object") {
    const vol = raw["velocityOverLifetime"];
    const deserializeAxis = (axis) => {
      if (!axis || typeof axis !== "object") return {};
      const a = axis;
      return {
        ...a["x"] !== void 0 ? { x: deserializeCurveOrValue(a["x"]) } : {},
        ...a["y"] !== void 0 ? { y: deserializeCurveOrValue(a["y"]) } : {},
        ...a["z"] !== void 0 ? { z: deserializeCurveOrValue(a["z"]) } : {}
      };
    };
    config.velocityOverLifetime = {
      isActive: vol["isActive"] ?? false,
      linear: deserializeAxis(vol["linear"]),
      orbital: deserializeAxis(vol["orbital"])
    };
  }
  for (const field of ["sizeOverLifetime", "opacityOverLifetime"]) {
    if (raw[field] && typeof raw[field] === "object") {
      const m = raw[field];
      config[field] = {
        isActive: m["isActive"] ?? false,
        lifetimeCurve: deserializeCurve(m["lifetimeCurve"])
      };
    }
  }
  if (raw["colorOverLifetime"] && typeof raw["colorOverLifetime"] === "object") {
    const col = raw["colorOverLifetime"];
    config.colorOverLifetime = {
      isActive: col["isActive"] ?? true,
      r: deserializeCurve(col["r"]),
      g: deserializeCurve(col["g"]),
      b: deserializeCurve(col["b"])
    };
  }
  if (raw["rotationOverLifetime"] && typeof raw["rotationOverLifetime"] === "object") {
    config.rotationOverLifetime = raw["rotationOverLifetime"];
  }
  if (raw["noise"] && typeof raw["noise"] === "object") {
    config.noise = raw["noise"];
  }
  if (raw["textureSheetAnimation"] && typeof raw["textureSheetAnimation"] === "object") {
    const tsa = raw["textureSheetAnimation"];
    config.textureSheetAnimation = {
      ...tsa,
      tiles: deserializeVector2(tsa["tiles"]),
      startFrame: deserializeCurveOrValue(tsa["startFrame"])
    };
  }
  if (Array.isArray(raw["subEmitters"])) {
    config.subEmitters = raw["subEmitters"].map((se) => ({
      ...se,
      config: deserializeConfig(se["config"])
    }));
  }
  if (Array.isArray(raw["forceFields"])) {
    config.forceFields = raw["forceFields"].map((ff) => {
      const result = {};
      if ("isActive" in ff) result.isActive = ff["isActive"];
      if ("type" in ff) result.type = ff["type"];
      if (ff["position"]) result.position = deserializeVector3(ff["position"]);
      if (ff["direction"])
        result.direction = deserializeVector3(ff["direction"]);
      if ("strength" in ff)
        result.strength = deserializeCurveOrValue(
          ff["strength"]
        );
      if ("range" in ff)
        result.range = ff["range"] === null ? Infinity : ff["range"];
      if ("falloff" in ff) result.falloff = ff["falloff"];
      return result;
    });
  }
  if (Array.isArray(raw["collisionPlanes"])) {
    config.collisionPlanes = raw["collisionPlanes"].map(
      (cp) => {
        const result = {};
        if ("isActive" in cp) result.isActive = cp["isActive"];
        if ("mode" in cp) result.mode = cp["mode"];
        if (cp["position"])
          result.position = deserializeVector3(cp["position"]);
        if (cp["normal"]) result.normal = deserializeVector3(cp["normal"]);
        if ("dampen" in cp) result.dampen = cp["dampen"];
        if ("lifetimeLoss" in cp)
          result.lifetimeLoss = cp["lifetimeLoss"];
        return result;
      }
    );
  }
  for (const key of Object.keys(raw)) {
    if (!(key in config) && key !== "_version" && raw[key] !== null) {
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

export { CollisionPlaneMode, CurveFunctionId, EmitFrom, ForceFieldFalloff, ForceFieldType, LifeTimeCurve, REVISION, RendererType, SCALAR_STRIDE, S_COLOR_A, S_COLOR_B, S_COLOR_G, S_COLOR_R, S_IS_ACTIVE, S_LIFETIME, S_ROTATION, S_SIZE, S_START_FRAME, S_START_LIFETIME, Shape, SimulationBackend, SimulationSpace, SubEmitterTrigger, TimeMode, applyModifiers, blendingMap, calculateRandomPositionAndVelocityOnBox, calculateRandomPositionAndVelocityOnCircle, calculateRandomPositionAndVelocityOnCone, calculateRandomPositionAndVelocityOnRectangle, calculateRandomPositionAndVelocityOnSphere, calculateValue, createBezierCurveFunction, createDefaultMeshTexture, createDefaultParticleTexture, createParticleSystem, curveFunctionIdMap, deserializeParticleSystem, getBezierCacheSize, getCurveFunction, getCurveFunctionFromConfig, getDefaultParticleSystemConfig, isComputeCapableRenderer, isLifeTimeCurve, linearToSRGB, registerTSLMaterialFactory, removeBezierCurveFunction, resolveSimulationBackend, rgbSRGBToLinear, sRGBToLinear, serializeParticleSystem, updateParticleSystems };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map