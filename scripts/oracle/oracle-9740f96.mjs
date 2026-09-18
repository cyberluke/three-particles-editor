/**
 * Oracle helper — semantic reference extracted VERBATIM (as pure JS) from
 * engine commit 9740f964c9c4b9550e622dc9da0b560f1cdd896e:
 *   - src/js/effects/three-particles/three-particles-utils.ts (shape math,
 *     calculateValue, getCurveFunctionFromConfig)
 *   - src/js/effects/three-particles/three-particles-bezier.ts (Bezier)
 *   - src/js/effects/three-particles/three-particles-modifiers.ts
 *     (applyModifiers semantics)
 *   - src/js/effects/three-particles/three-particles-forces.ts
 *     (applyForceFields)
 *   - src/js/effects/three-particles/three-particles.ts (activateParticle /
 *     shadow-orbital Euler semantics; three.js 'XYZ' Euler matrix Rx*Ry*Rz)
 * These helpers are dev-time only; they are not part of the shipped library.
 */

// Deterministic LCG replacing Math.random (same call order as the oracle).
export function makeRng(seed = 12345) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const degToRad = (d) => (d * Math.PI) / 180;

export function applyQuat(q, v) {
  // THREE.Quaternion (x,y,z,w) applied to vec3.
  const [x, y, z] = v;
  const [qx, qy, qz, qw] = q;
  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx,
  ];
}

// ── three-particles-utils.ts ───────────────────────────────────────────────
export function sphereOn(rng, { radius, radiusThickness, arc }) {
  const u = rng() * (arc / 360);
  const v = rng();
  const ratio = rng();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const sinPhi = Math.sin(phi);
  const dx = sinPhi * Math.cos(theta);
  const dy = sinPhi * Math.sin(theta);
  const dz = Math.cos(phi);
  const t = 1 - radiusThickness;
  const d = radius * t + radius * radiusThickness * ratio;
  return { pos: [dx * d, dy * d, dz * d], dir: [dx, dy, dz] };
}

export function coneOn(rng, { radius, radiusThickness, arc, angle = 90 }) {
  const theta = 2 * Math.PI * rng() * (arc / 360);
  const ratio = rng();
  const dx = Math.cos(theta);
  const dy = Math.sin(theta);
  const t = 1 - radiusThickness;
  const dist = radius * t * 1 + radius * radiusThickness * ratio;
  const pos = [dx * dist, dy * dist, 0];
  const len = Math.hypot(...pos);
  const na = Math.abs((len / radius) * degToRad(angle));
  const sinNA = Math.sin(na);
  const cosNA = Math.cos(na);
  const mul = len > 1e-9 ? 1 / (len || 1) : 1;
  const vel = [
    len > 1e-9 ? pos[0] * mul * sinNA : 0,
    len > 1e-9 ? pos[1] * mul * sinNA : 0,
    cosNA,
  ];
  return { pos, vel };
}

export function circleOn(rng, { radius, radiusThickness, arc }) {
  const theta = 2 * Math.PI * rng() * (arc / 360);
  const ratio = rng();
  const dx = Math.cos(theta);
  const dy = Math.sin(theta);
  const t = 1 - radiusThickness;
  const dist = radius * t + radius * radiusThickness * ratio;
  const pos = [dx * dist, dy * dist, 0];
  const len = Math.hypot(pos[0], pos[1]) || 1;
  const vel = [(pos[0] / len) * 1, (pos[1] / len) * 1, 0];
  return { pos, vel };
}

export function rectangleOn(rng, { rotation, scale }) {
  const xOff = rng() * scale.x - scale.x / 2;
  const yOff = rng() * scale.y - scale.y / 2;
  const rx = degToRad(rotation.x);
  const ry = degToRad(rotation.y);
  const pos = [
    xOff * Math.cos(ry),
    yOff * Math.cos(rx),
    xOff * Math.sin(ry) - yOff * Math.sin(rx),
  ];
  return { pos, vel: [0, 0, 1] };
}

export function boxOn(rng, { scale, emitFrom }) {
  const s = scale;
  let pos;
  if (emitFrom === 'VOLUME') {
    pos = [
      rng() * s.x - s.x / 2,
      rng() * s.y - s.y / 2,
      rng() * s.z - s.z / 2,
    ];
  } else if (emitFrom === 'SHELL') {
    const side = Math.floor(rng() * 6);
    const pa = side % 3;
    const r = [0, 0, 0];
    r[pa] = side > 2 ? 1 : 0;
    r[(pa + 1) % 3] = rng();
    r[(pa + 2) % 3] = rng();
    pos = [r[0] * s.x - s.x / 2, r[1] * s.y - s.y / 2, r[2] * s.z - s.z / 2];
  } else {
    const side2 = Math.floor(rng() * 6);
    const pa2 = side2 % 3;
    const edge = Math.floor(rng() * 4);
    const e = [0, 0, 0];
    e[pa2] = side2 > 2 ? 1 : 0;
    e[(pa2 + 1) % 3] = edge < 2 ? rng() : edge - 2;
    e[(pa2 + 2) % 3] = edge < 2 ? edge : rng();
    pos = [e[0] * s.x - s.x / 2, e[1] * s.y - s.y / 2, e[2] * s.z - s.z / 2];
  }
  return { pos, vel: [0, 0, 1] };
}

// ── Bezier (three-particles-bezier.ts, cache-free copy) ────────────────────
const nCr = (n, k) => {
  let z = 1;
  for (let i = 1; i <= k; i++) z *= (n + 1 - i) / i;
  return z;
};
export function bezierFunction(pts) {
  return (percentage) => {
    if (percentage < 0) return pts[0].y;
    if (percentage > 1) return pts[pts.length - 1].y;
    let start = 0;
    let stop = pts.length - 1;
    for (let i = 0; i < pts.length; i++) {
      const point = pts[i];
      if (percentage < (point.percentage ?? 0)) {
        stop = i;
        break;
      }
      if (point.percentage !== undefined) start = i;
    }
    const n = stop - start;
    const cp =
      (percentage - (pts[start].percentage ?? 0)) /
      ((pts[stop].percentage ?? 1) - (pts[start].percentage ?? 0));
    let value = 0;
    for (let i = 0; i <= n; i++) {
      const c =
        nCr(n, i) *
        Math.pow(1 - cp, n - i) *
        Math.pow(cp, i);
      value += c * pts[start + i].y;
    }
    return value;
  };
}

// ── calculateValue (three-particles-utils.ts) ──────────────────────────────
export function calculateValue(rng, value, time = 0) {
  if (typeof value === 'number') return value;
  if (value && 'min' in value && 'max' in value) {
    if (value.min === value.max) return value.min ?? 0;
    const a = value.min ?? 0;
    const b = value.max ?? 1;
    return a + rng() * (b - a);
  }
  const fn = value.type === 'EASING'
    ? value.curveFunction
    : bezierFunction(value.bezierPoints);
  return fn(time) * (value.scale ?? 1);
}

// ── applyModifiers semantics (three-particles-modifiers.ts) ────────────────
export function applyModifiersOracle({
  delta,
  pct,
  start: { size, opacity, colorR, colorG, colorB, rotSpeed },
  axes: {
    lin = [0, 0, 0],
    orb = [0, 0, 0],
  } = {},
  offset = [0, 0, 0],
  curves = {},
  noise,
  pos = [0, 0, 0],
  rot = 0,
}) {
  const p = pos.slice();
  // linear velocity over lifetime
  p[0] += (curves.linearX ? curves.linearX(pct) : lin[0]) * delta;
  p[1] += (curves.linearY ? curves.linearY(pct) : lin[1]) * delta;
  p[2] += (curves.linearZ ? curves.linearZ(pct) : lin[2]) * delta;
  // orbital pivot + Euler( x, z, y ) 'XYZ'
  const off = offset.slice();
  for (let k = 0; k < 3; k++) p[k] -= off[k];
  const ex = (curves.orbX ? curves.orbX(pct) : orb[0]) * delta;
  const ey = (curves.orbZ ? curves.orbZ(pct) : orb[2]) * delta;
  const ez = (curves.orbY ? curves.orbY(pct) : orb[1]) * delta;
  const [nx, ny, nz] = applyEulerXYZ(off, ex, ey, ez);
  off[0] = nx; off[1] = ny; off[2] = nz;
  for (let k = 0; k < 3; k++) p[k] += off[k];
  // size / opacity / color over lifetime (multipliers on start values)
  let outSize = size;
  let outAlpha = opacity;
  let outColor = [colorR, colorG, colorB];
  let outRot = rot;
  if (curves.size) outSize = size * curves.size(pct);
  if (curves.opacity) outAlpha = opacity * curves.opacity(pct);
  if (curves.colorR || curves.colorG || curves.colorB) {
    outColor = [
      colorR * (curves.colorR ? curves.colorR(pct) : 1),
      colorG * (curves.colorG ? curves.colorG(pct) : 1),
      colorB * (curves.colorB ? curves.colorB(pct) : 1),
    ];
  }
  // rotation over lifetime: speed * delta * 0.02
  outRot += (rotSpeed ?? 0) * delta * 0.02;
  // noise (three-noise FBM)
  let noiseOut = 0;
  if (noise && noise.isActive) {
    noiseOut = fbm3(noise, noise.tIn(pct));
    p[0] += noiseOut * noise.power * noise.positionAmount;
  }
  return { pos: p, size: outSize, alpha: outAlpha, color: outColor, rot: outRot, noiseOut };
}

// three.js Quaternion.setFromEuler order 'XYZ': M = Rx * Ry * Rz.
export function applyEulerXYZ([x, y, z], ex, ey, ez) {
  // v' = Rx (Ry (Rz v)) — matrix product Rx*Ry*Rz, applied right to left.
  const ce = Math.cos(ez), se = Math.sin(ez);
  const z1x = x * ce - y * se;
  const z1y = x * se + y * ce;
  const z1z = z;
  const cy = Math.cos(ey), sy = Math.sin(ey);
  const y1x = z1x * cy + z1z * sy;
  const y1y = z1y;
  const y1z = -z1x * sy + z1z * cy;
  const cx = Math.cos(ex), sx = Math.sin(ex);
  const fx = y1x;
  const fy = y1y * cx - y1z * sx;
  const fz = y1y * sx + y1z * cx;
  return [fx, fy, fz];
}

// three-noise FBM over classic Perlin 3D.
const PERLIN_PERM = (() => {
  const p = new Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = 1;
  for (let i = 255; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 256; i < 512; i++) p[i] = p[i - 256];
  return p;
})();
function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function gradP(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}
function perlin3(x, y, z) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  const xx = x - Math.floor(x);
  const yy = y - Math.floor(y);
  const zz = z - Math.floor(z);
  const u = fade(xx), v = fade(yy), w = fade(zz);
  const p = PERLIN_PERM;
  const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
  const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
  const lerp = (a, b, t) => (1 - t) * a + t * b;
  return lerp(
    lerp(
      lerp(gradP(p[AA], xx, yy, zz), gradP(p[BA], xx - 1, yy, zz), u),
      lerp(gradP(p[AB], xx, yy - 1, zz), gradP(p[BB], xx - 1, yy - 1, zz), u),
      v
    ),
    lerp(
      lerp(
        gradP(p[AA + 1], xx, yy, zz - 1),
        gradP(p[BA + 1], xx - 1, yy, zz - 1),
        u
      ),
      lerp(
        gradP(p[AB + 1], xx, yy - 1, zz - 1),
        gradP(p[BB + 1], xx - 1, yy - 1, zz - 1),
        u
      ),
      v
    ),
    w
  );
}

export function fbm3({ seed = 1, scale = 1, octaves = 1 }, { x, y, z }) {
  let result = 0;
  let amplitude = 1;
  let freq = 1;
  let max = amplitude;
  for (let i = 0; i < octaves; i++) {
    result += perlin3(x * scale * freq, y * scale * freq, z * scale * freq) * amplitude;
    freq *= 2;
    amplitude *= 0.5;
    max += amplitude;
  }
  return result / max;
}

// ── applyForceFields (three-particles-forces.ts) ───────────────────────────
export function applyForceFieldsOracle({ fields, pos, vel, delta, evalStrength }) {
  const v = vel.slice();
  for (const f of fields) {
    if (!f.isActive) continue;
    const strength = evalStrength(f.strength);
    if (strength === 0) continue;
    if (f.type === 'POINT') {
      const dx = f.position[0] - pos[0];
      const dy = f.position[1] - pos[1];
      const dz = f.position[2] - pos[2];
      const dist = Math.hypot(dx, dy, dz);
      if (dist < 0.0001) continue;
      if (f.range !== Infinity && dist > f.range) continue;
      const nx = dx / dist, ny = dy / dist, nz = dz / dist;
      let falloff = 1.0;
      if (f.range !== Infinity) {
        const nd = dist / f.range;
        if (f.falloff === 'LINEAR') falloff = 1.0 - nd;
        else if (f.falloff === 'QUADRATIC') falloff = 1.0 - nd * nd;
      }
      const force = strength * falloff * delta;
      v[0] += nx * force;
      v[1] += ny * force;
      v[2] += nz * force;
    } else {
      const force = strength * delta;
      v[0] += f.direction[0] * force;
      v[1] += f.direction[1] * force;
      v[2] += f.direction[2] * force;
    }
  }
  return v;
}
