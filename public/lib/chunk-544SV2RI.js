import * as e from 'three';
import { Vector4 as t } from 'three';
import { StorageBufferAttribute as r } from 'three/webgpu';
import {
  Fn as s,
  mod as n,
  float as i,
  floor as o,
  dot as a,
  vec3 as l,
  step as u,
  min as c,
  max as d,
  vec4 as m,
  vec2 as f,
  abs as p,
  uint as y,
  round as h,
  If as b,
  texture as g,
  screenUV as x,
  smoothstep as v,
  cross as w,
  length as P,
  cameraViewMatrix as S,
  normalize as A,
  mix as z,
  uniform as M,
  storage as T,
  compute as C,
  instanceIndex as E,
  atomicStore as N,
  atomicAdd as F,
  invocationLocalIndex as V,
  workgroupArray as B,
  workgroupBarrier as I,
  add as R,
  sub as O,
  pow as L,
  atomicLoad as U,
  Loop as D,
  sqrt as k,
} from 'three/tsl';
var W = Object.create,
  q = Object.defineProperty,
  G = Object.getOwnPropertyDescriptor,
  $ = Object.getOwnPropertyNames,
  j = Object.getPrototypeOf,
  H = Object.prototype.hasOwnProperty,
  Q = (e, t) =>
    function () {
      return (t || (0, e[$(e)[0]])((t = { exports: {} }).exports, t), t.exports);
    },
  Z = (e, t, r) => (
    (r = null != e ? W(j(e)) : {}),
    ((e, t, r, s) => {
      if ((t && 'object' == typeof t) || 'function' == typeof t)
        for (let n of $(t))
          H.call(e, n) ||
            n === r ||
            q(e, n, { get: () => t[n], enumerable: !(s = G(t, n)) || s.enumerable });
      return e;
    })(!t && e && e.__esModule ? r : q(r, 'default', { value: e, enumerable: !0 }), e)
  ),
  K = {};
((e, t) => {
  for (var r in t) q(e, r, { get: t[r], enumerable: !0 });
})(K, { deepMerge: () => X, getObjectDiff: () => Y, patchObject: () => _ });
var _ = (e, t, r = { skippedProperties: [], applyToFirstObject: !1 }) => {
    const s = {};
    return (
      Object.keys(e).forEach((n) => {
        (r.skippedProperties && r.skippedProperties.includes(n)) ||
          ('object' == typeof e[n] && e[n] && t[n] && !Array.isArray(e[n])
            ? (s[n] = _(e[n], t[n], r))
            : ((s[n] = 0 === t[n] ? 0 : !1 !== t[n] && (t[n] || e[n])),
              r.applyToFirstObject && (e[n] = s[n])));
      }),
      s
    );
  },
  X = (e, t, r = { skippedProperties: [], applyToFirstObject: !1 }) => {
    const s = {};
    return (
      Array.from(new Set([...Object.keys(e || {}), ...Object.keys(t || {})])).forEach((n) => {
        (r.skippedProperties && r.skippedProperties.includes(n)) ||
          ('object' == typeof e?.[n] && e?.[n] && t?.[n] && !Array.isArray(e[n])
            ? (s[n] = X(e[n], t[n], r))
            : ((s[n] = 0 === t?.[n] ? 0 : !1 !== t?.[n] && (t?.[n] || e?.[n])),
              r.applyToFirstObject && (e[n] = s[n])));
      }),
      s
    );
  },
  Y = (e, t, r = { skippedProperties: [] }) => {
    const s = {};
    return (
      Object.keys(e).forEach((n) => {
        if (!r.skippedProperties || !r.skippedProperties.includes(n))
          if ('object' == typeof e[n] && e[n] && t[n] && !Array.isArray(e[n])) {
            const i = Y(e[n], t[n], r);
            Object.keys(i).length > 0 && (s[n] = i);
          } else {
            const r = 0 === t[n] ? 0 : t[n] || e[n];
            r !== e[n] && (s[n] = r);
          }
      }),
      s
    );
  },
  J = function () {};
((J.prototype.load = J), (J.prototype.parse = J));
var ee = J;
(Array.from({ length: 3 }, () => ({ loader: new ee(), isUsed: !1 })),
  Array.from({ length: 3 }, () => ({ loader: new e.TextureLoader(), isUsed: !1 })),
  Array.from({ length: 3 }, () => ({ loader: new e.AudioLoader(), isUsed: !1 })));
var te = [],
  re = (e, t) => {
    let r = 1;
    for (let s = 1; s <= t; s++) r *= (e + 1 - s) / s;
    return r;
  },
  se = (e, t) => {
    const r = te.find((e) => e.bezierPoints === t);
    if (r) return (r.referencedBy.includes(e) || r.referencedBy.push(e), r.curveFunction);
    const s = {
      referencedBy: [e],
      bezierPoints: t,
      curveFunction: (e) => {
        if (e < 0) return t[0].y;
        if (e > 1) return t[t.length - 1].y;
        let r = 0,
          s = t.length - 1;
        for (let n = 0; n < t.length; n++) {
          const i = t[n];
          if (e < (i.percentage ?? 0)) {
            s = n;
            break;
          }
          void 0 !== i.percentage && (r = n);
        }
        const n = s - r,
          i = (e - (t[r].percentage ?? 0)) / ((t[s].percentage ?? 1) - (t[r].percentage ?? 0));
        let o = 0;
        for (let e = 0; e <= n; e++) {
          const s = t[r + e];
          o += re(n, e) * Math.pow(1 - i, n - e) * Math.pow(i, e) * s.y;
        }
        return o;
      },
    };
    return (te.push(s), s.curveFunction);
  },
  ne = (e) => {
    for (;;) {
      const t = te.findIndex((t) => t.referencedBy.includes(e));
      if (-1 === t) break;
      const r = te[t];
      ((r.referencedBy = r.referencedBy.filter((t) => t !== e)),
        0 === r.referencedBy.length && te.splice(t, 1));
    }
  },
  ie = () => te.length,
  oe = 10,
  ae = 0,
  le = 1,
  ue = 2,
  ce = 3,
  de = 4,
  me = 5,
  fe = 6,
  pe = 7,
  ye = 8,
  he = 9,
  be = ((e) => ((e.LOCAL = 'LOCAL'), (e.WORLD = 'WORLD'), e))(be || {}),
  ge = ((e) => (
    (e.SPHERE = 'SPHERE'),
    (e.CONE = 'CONE'),
    (e.BOX = 'BOX'),
    (e.CIRCLE = 'CIRCLE'),
    (e.RECTANGLE = 'RECTANGLE'),
    e
  ))(ge || {}),
  xe = ((e) => ((e.VOLUME = 'VOLUME'), (e.SHELL = 'SHELL'), (e.EDGE = 'EDGE'), e))(xe || {}),
  ve = ((e) => ((e.LIFETIME = 'LIFETIME'), (e.FPS = 'FPS'), e))(ve || {}),
  we = ((e) => ((e.BEZIER = 'BEZIER'), (e.EASING = 'EASING'), e))(we || {}),
  Pe = ((e) => ((e.BIRTH = 'BIRTH'), (e.DEATH = 'DEATH'), e))(Pe || {}),
  Se = ((e) => ((e.POINT = 'POINT'), (e.DIRECTIONAL = 'DIRECTIONAL'), e))(Se || {}),
  Ae = ((e) => (
    (e.POINTS = 'POINTS'),
    (e.INSTANCED = 'INSTANCED'),
    (e.TRAIL = 'TRAIL'),
    (e.MESH = 'MESH'),
    (e.FLUID = 'FLUID'),
    e
  ))(Ae || {}),
  ze = ((e) => ((e.NONE = 'NONE'), (e.LINEAR = 'LINEAR'), (e.QUADRATIC = 'QUADRATIC'), e))(
    ze || {}
  ),
  Me = ((e) => ((e.KILL = 'KILL'), (e.CLAMP = 'CLAMP'), (e.BOUNCE = 'BOUNCE'), e))(Me || {}),
  Te = ((e) => ((e.AUTO = 'AUTO'), (e.CPU = 'CPU'), (e.GPU = 'GPU'), e))(Te || {});
function Ce(e) {
  return (
    null != e &&
    'object' == typeof e &&
    'compute' in e &&
    'function' == typeof e.compute &&
    'hasFeature' in e &&
    'function' == typeof e.hasFeature
  );
}
function Ee(e, t = 'AUTO') {
  const r = Ce(e);
  return 'CPU' === t ? 'CPU' : r ? 'GPU' : 'CPU';
}
var Ne = (e, t, r, s, { radius: n, radiusThickness: i, arc: o }) => {
    const a = Math.random() * (o / 360),
      l = Math.random(),
      u = Math.random(),
      c = 2 * Math.PI * a,
      d = Math.acos(2 * l - 1),
      m = Math.sin(d),
      f = m * Math.cos(c),
      p = m * Math.sin(c),
      y = Math.cos(d),
      h = 1 - i;
    ((e.x = n * h * f + n * i * u * f),
      (e.y = n * h * p + n * i * u * p),
      (e.z = n * h * y + n * i * u * y),
      e.applyQuaternion(t));
    const b = 1 / e.length();
    (r.set(e.x * b * s, e.y * b * s, e.z * b * s), r.applyQuaternion(t));
  },
  Fe = (t, r, s, n, { radius: i, radiusThickness: o, arc: a, angle: l = 90 }) => {
    const u = 2 * Math.PI * Math.random() * (a / 360),
      c = Math.random(),
      d = Math.cos(u),
      m = Math.sin(u),
      f = 1 - o;
    ((t.x = i * f * d + i * o * c * d),
      (t.y = i * f * m + i * o * c * m),
      (t.z = 0),
      t.applyQuaternion(r));
    const p = t.length(),
      y = Math.abs((p / i) * e.MathUtils.degToRad(l)),
      h = Math.sin(y),
      b = 1 / p;
    (s.set(t.x * h * b * n, t.y * h * b * n, Math.cos(y) * n), s.applyQuaternion(r));
  },
  Ve = (e, t, r, s, { scale: n, emitFrom: i }) => {
    const o = n;
    switch (i) {
      case 'VOLUME':
        ((e.x = Math.random() * o.x - o.x / 2),
          (e.y = Math.random() * o.y - o.y / 2),
          (e.z = Math.random() * o.z - o.z / 2));
        break;
      case 'SHELL':
        const t = Math.floor(6 * Math.random()),
          r = t % 3,
          s = [];
        ((s[r] = t > 2 ? 1 : 0),
          (s[(r + 1) % 3] = Math.random()),
          (s[(r + 2) % 3] = Math.random()),
          (e.x = s[0] * o.x - o.x / 2),
          (e.y = s[1] * o.y - o.y / 2),
          (e.z = s[2] * o.z - o.z / 2));
        break;
      case 'EDGE':
        const n = Math.floor(6 * Math.random()),
          i = n % 3,
          a = Math.floor(4 * Math.random()),
          l = [];
        ((l[i] = n > 2 ? 1 : 0),
          (l[(i + 1) % 3] = a < 2 ? Math.random() : a - 2),
          (l[(i + 2) % 3] = a < 2 ? a : Math.random()),
          (e.x = l[0] * o.x - o.x / 2),
          (e.y = l[1] * o.y - o.y / 2),
          (e.z = l[2] * o.z - o.z / 2));
    }
    (e.applyQuaternion(t), r.set(0, 0, s), r.applyQuaternion(t));
  },
  Be = (e, t, r, s, { radius: n, radiusThickness: i, arc: o }) => {
    const a = 2 * Math.PI * Math.random() * (o / 360),
      l = Math.random(),
      u = Math.cos(a),
      c = Math.sin(a),
      d = 1 - i;
    ((e.x = n * d * u + n * i * l * u),
      (e.y = n * d * c + n * i * l * c),
      (e.z = 0),
      e.applyQuaternion(t));
    const m = 1 / e.length();
    (r.set(e.x * m * s, e.y * m * s, 0), r.applyQuaternion(t));
  },
  Ie = (t, r, s, n, { rotation: i, scale: o }) => {
    const a = o,
      l = i,
      u = Math.random() * a.x - a.x / 2,
      c = Math.random() * a.y - a.y / 2,
      d = e.MathUtils.degToRad(l.x),
      m = e.MathUtils.degToRad(l.y);
    ((t.x = u * Math.cos(m)),
      (t.y = c * Math.cos(d)),
      (t.z = u * Math.sin(m) - c * Math.sin(d)),
      t.applyQuaternion(r),
      s.set(0, 0, n),
      s.applyQuaternion(r));
  },
  Re = () => {
    try {
      const t = document.createElement('canvas');
      ((t.width = 1), (t.height = 1));
      const r = t.getContext('2d');
      if (r) {
        ((r.fillStyle = 'white'), r.fillRect(0, 0, 1, 1));
        const s = new e.CanvasTexture(t);
        return ((s.needsUpdate = !0), s);
      }
      return null;
    } catch {
      return null;
    }
  },
  Oe = () => {
    try {
      const t = document.createElement('canvas'),
        r = 64;
      ((t.width = r), (t.height = r));
      const s = t.getContext('2d');
      if (s) {
        const n = r / 2,
          i = r / 2,
          o = r / 2 - 2;
        (s.beginPath(), s.arc(n, i, o, 0, 2 * Math.PI, !1), (s.fillStyle = 'white'), s.fill());
        const a = new e.CanvasTexture(t);
        return ((a.needsUpdate = !0), a);
      }
      return null;
    } catch (e) {
      return null;
    }
  },
  Le = (e) => 'number' != typeof e && 'type' in e,
  Ue = (e, t) => {
    if ('BEZIER' === t.type) return se(e, t.bezierPoints);
    if ('EASING' === t.type) return t.curveFunction;
    const r = t;
    if (Array.isArray(r.bezierPoints)) return se(e, r.bezierPoints);
    if ('function' == typeof r.curveFunction) return r.curveFunction;
    throw new Error(`Unsupported value type: ${t}`);
  },
  De = (t, r, s = 0) => {
    if ('number' == typeof r) return r;
    if ('min' in r && 'max' in r)
      return r.min === r.max ? (r.min ?? 0) : e.MathUtils.randFloat(r.min ?? 0, r.max ?? 1);
    const n = r;
    return Ue(t, n)(s) * (n.scale ?? 1);
  },
  ke = (e) => (e < 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4)),
  We = (e) => (e < 0.0031308 ? 12.92 * e : 1.055 * Math.pow(e, 1 / 2.4) - 0.055),
  qe = (e) => ({ r: ke(e.r ?? 0), g: ke(e.g ?? 0), b: ke(e.b ?? 0) }),
  Ge = s(({ x: e }) => n(e.mul(34).add(10).mul(e), i(289))),
  $e = s(({ r: e }) => i(1.79284291400159).sub(i(0.85373472095314).mul(e))),
  je = s(({ v: e }) => {
    const t = i(1 / 3),
      r = i(1 / 6),
      s = o(e.add(a(e, l(t, t, t)))).toVar(),
      y = e
        .sub(s)
        .add(a(s, l(r, r, r)))
        .toVar(),
      h = u(y.yzx, y.xyz).toVar(),
      b = i(1).sub(h).toVar(),
      g = c(h.xyz, b.zxy).toVar(),
      x = d(h.xyz, b.zxy).toVar(),
      v = y.sub(g).add(r).toVar(),
      w = y.sub(x).add(r.mul(2)).toVar(),
      P = y.sub(i(1)).add(r.mul(3)).toVar(),
      S = n(s, i(289)).toVar(),
      A = Ge({
        x: Ge({ x: m(f(S.z, S.z.add(g.z)), f(S.z.add(x.z), S.z.add(1))) }).add(
          m(f(S.y, S.y.add(g.y)), f(S.y.add(x.y), S.y.add(1)))
        ),
      }),
      z = Ge({ x: A.add(m(f(S.x, S.x.add(g.x)), f(S.x.add(x.x), S.x.add(1)))) }),
      M = i(0.142857142857142),
      T = z.sub(i(49).mul(o(z.mul(M).mul(M)))).toVar(),
      C = o(T.mul(M)).toVar(),
      E = o(T.sub(i(7).mul(C))).toVar(),
      N = i(0.285714285714286),
      F = i(-0.928571428571429),
      V = C.mul(N).add(F),
      B = E.mul(N).add(F),
      I = i(1).sub(p(V)).sub(p(B)).toVar(),
      R = u(I, m(0)),
      O = R.mul(o(V).add(0.5)),
      L = R.mul(o(B).add(0.5)),
      U = V.sub(O),
      D = B.sub(L),
      k = l(U.x, D.x, I.x).toVar(),
      W = l(U.y, D.y, I.y).toVar(),
      q = l(U.z, D.z, I.z).toVar(),
      G = l(U.w, D.w, I.w).toVar(),
      $ = $e({ r: m(f(a(k, k), a(W, W)), f(a(q, q), a(G, G))) });
    (k.assign(k.mul($.x)), W.assign(W.mul($.y)), q.assign(q.mul($.z)), G.assign(G.mul($.w)));
    const j = d(
        m(f(i(0.5).sub(a(y, y)), i(0.5).sub(a(v, v))), f(i(0.5).sub(a(w, w)), i(0.5).sub(a(P, P)))),
        i(0)
      ).toVar(),
      H = j.mul(j).toVar(),
      Q = H.mul(H).toVar(),
      Z = m(f(a(k, y), a(W, v)), f(a(q, w), a(G, P)));
    return i(42).mul(a(Q, Z));
  });
(s(({ t: e }) => {
  const t = je({ v: l(e, i(0), i(0)) }),
    r = je({ v: l(e, e, i(0)) }),
    s = je({ v: l(e, e, e) });
  return l(t, r, s);
}),
  y(1),
  y(2),
  y(3),
  y(4),
  y(5),
  y(6),
  y(7),
  y(8),
  y(9),
  y(10),
  y(11),
  y(12),
  y(13),
  y(14),
  y(15),
  y(16),
  y(17),
  y(18),
  y(19));
var He = {
    stiffness: 3,
    restDensity: 4,
    dynamicViscosity: 0.1,
    dt: 0.2,
    gravity: -0.3,
    sphereSize: 1.2,
    boxSize: [40, 30, 60],
  },
  Qe = 3,
  Ze = 4,
  Ke = 0.3,
  _e = 3,
  Xe = 1,
  Ye = 2,
  Je = 2,
  et = 3;
function tt(e, t) {
  const [r, s, n] = ((e) => [
    Math.min(64, Math.ceil(e[0])),
    Math.min(64, Math.ceil(e[1])),
    Math.min(64, Math.ceil(e[2])),
  ])(t);
  return {
    stiffness: e?.stiffness ?? He.stiffness,
    restDensity: e?.restDensity ?? He.restDensity,
    dynamicViscosity: e?.dynamicViscosity ?? He.dynamicViscosity,
    dt: e?.dt ?? He.dt,
    gravity: e?.gravity ?? He.gravity,
    cellSize: e?.cellSize ?? 1,
    gridSize: e?.gridSize ?? 64,
    sphereSize: e?.sphereSize ?? He.sphereSize,
    boxSize: [t[0], t[1], t[2]],
    gridDims: [r, s, n],
    wallStiffness: Ke,
    extrapolationK: _e,
  };
}
var rt = Array.from({ length: 27 }, (e, t) => [Math.floor(t / 9), Math.floor(t / 3) % 3, t % 3]),
  st = (e) => {
    const t = i(0.5).sub(e),
      r = i(0.5).add(e);
    return [t.mul(t).mul(i(0.5)), i(0.75).sub(e.mul(e)), r.mul(r).mul(i(0.5))];
  },
  nt = (e) => {
    const t = o(e),
      r = e.sub(t.add(i(0.5)));
    return { cellIdx: t, wx: st(r.x), wy: st(r.y), wz: st(r.z) };
  },
  it = (e, t, r, s, n) => {
    const [o, a, l] = t;
    return {
      cx: e.x.add(i(o - 1)),
      cy: e.y.add(i(a - 1)),
      cz: e.z.add(i(l - 1)),
      weight: r[o].mul(s[a]).mul(n[l]),
    };
  },
  ot = (e, t, r, s) =>
    e
      .mul(i(s.ny * s.nz))
      .add(t.mul(i(s.nz)))
      .add(r)
      .mul(i(4)),
  at = (e, t, r, s) => l(e.add(0.5).sub(s.x), t.add(0.5).sub(s.y), r.add(0.5).sub(s.z)),
  lt = (e, t) => {
    const r = i(e);
    return r
      .lessThan(i(2147483648))
      .select(r, r.sub(i(4294967296)))
      .div(t);
  },
  ut = (e, t, r) => lt(U(e.sCells.element(t.add(r))), e.fp),
  ct = (e, t, r, s) => {
    F(e.sCells.element(t.add(r)), y(s.mul(e.fp)));
  },
  dt = (e, t, r, s) => {
    (b(r.lessThan(i(Je)), () => {
      N(e.sCells.element(t), y(0));
    }),
      b(r.greaterThan(s.sub(i(et))), () => {
        N(e.sCells.element(t), y(0));
      }));
  };
function mt(e, n, o, u) {
  const f = Math.max(1, Math.floor(e)),
    [p, h, g] = n.gridDims,
    x = p * h * g,
    v = o ?? n.boxSize,
    w = (function (e, t, s) {
      const n = Math.max(1, Math.floor(e)),
        i = Math.max(1, Math.floor(t)),
        o = new Float32Array(3 * n * 4);
      for (let e = 0; e < n; e++) {
        const t = 3 * e * 4;
        ((o[t] = 1), (o[t + 5] = 1), (o[t + 10] = 1));
      }
      const a = new r(new Uint32Array(4 * i), 1),
        l = new r(new Float32Array(4 * n), 4),
        u = new r(new Float32Array(4 * n), 4),
        c = new r(o, 4);
      return s
        ? { position: s.position, velocity: s.velocity, coefficients: c, cells: a }
        : { position: l, velocity: u, coefficients: c, cells: a };
    })(f, x, u),
    S = M(n.boxSize[2] > 0 ? v[2] / n.boxSize[2] : 1),
    A = M(new t(0, 0, 0, 0)),
    z = M(new t(0, 0, 0, 0)),
    F = M(new t(0, 0, 0, 0)),
    V = T(w.position, 'vec4', f),
    B = T(w.velocity, 'vec4', f),
    I = T(w.coefficients, 'vec4', 3 * f),
    R = T(w.cells, 'uint', 4 * x).toAtomic(),
    O = {
      count: f,
      gridCount: x,
      ny: h,
      nz: g,
      sPos: V,
      sVel: B,
      sC: I,
      sCells: R,
      fp: i(1e7),
      k: i(n.stiffness),
      d0: i(n.restDensity),
      mu: i(n.dynamicViscosity),
      dt: i(n.dt),
      gravity: i(n.gravity),
      wallStiffness: i(n.wallStiffness),
      extrapolationK: i(n.extrapolationK),
      rx: i(v[0]),
      ry: i(v[1]),
      rz: i(n.boxSize[2]).mul(S),
      uSphere: A,
      uPointerPos: z,
      uPointerVel: F,
    },
    D = ((e) =>
      s(() => {
        const t = E;
        b(i(t).lessThan(i(e.gridCount)), () => {
          const r = t.mul(i(4));
          (N(e.sCells.element(r), y(0)),
            N(e.sCells.element(r.add(1)), y(0)),
            N(e.sCells.element(r.add(2)), y(0)),
            N(e.sCells.element(r.add(3)), y(0)));
        });
      }))(O),
    k = ((e) =>
      s(() => {
        const t = E;
        b(i(t).lessThan(i(e.count)), () => {
          const r = e.sPos.element(t).xyz.toVar(),
            s = e.sVel.element(t).xyz.toVar(),
            n = nt(r),
            o = t.mul(i(3)),
            a = e.sC.element(o).xyz,
            l = e.sC.element(o.add(1)).xyz,
            u = e.sC.element(o.add(2)).xyz;
          for (const t of rt) {
            const i = it(n.cellIdx, t, n.wx, n.wy, n.wz),
              o = at(i.cx, i.cy, i.cz, r),
              c = a.mul(o.x).add(l.mul(o.y)).add(u.mul(o.z)),
              d = s.add(c).mul(i.weight),
              m = ot(i.cx, i.cy, i.cz, e);
            (ct(e, m, 0, d.x), ct(e, m, 1, d.y), ct(e, m, 2, d.z), ct(e, m, 3, i.weight));
          }
        });
      }))(O),
    W = ((e) =>
      s(() => {
        const t = E;
        b(i(t).lessThan(i(e.count)), () => {
          const r = e.sPos.element(t).xyz.toVar(),
            s = nt(r),
            n = t.mul(i(3)),
            o = e.sC.element(n).xyz,
            a = e.sC.element(n.add(1)).xyz,
            u = e.sC.element(n.add(2)).xyz,
            c = i(0).toVar();
          for (const t of rt) {
            const r = it(s.cellIdx, t, s.wx, s.wy, s.wz),
              n = ut(e, ot(r.cx, r.cy, r.cz, e), 3);
            c.assign(c.add(n.mul(r.weight)));
          }
          const m = i(1).div(c),
            f = d(e.k.mul(L(c.div(e.d0), i(5)).sub(i(1))), i(0)),
            p = i(-1).mul(f),
            y = e.mu.mul(o.add(l(o.x, a.x, u.x))).add(l(p, i(0), i(0))),
            h = e.mu.mul(a.add(l(o.y, a.y, u.y))).add(l(i(0), p, i(0))),
            b = e.mu.mul(u.add(l(o.z, a.z, u.z))).add(l(i(0), i(0), p)),
            g = i(-4).mul(m).mul(e.dt);
          for (const t of rt) {
            const n = it(s.cellIdx, t, s.wx, s.wy, s.wz),
              i = at(n.cx, n.cy, n.cz, r),
              o = y.mul(i.x).add(h.mul(i.y)).add(b.mul(i.z)).mul(n.weight).mul(g),
              a = ot(n.cx, n.cy, n.cz, e);
            (ct(e, a, 0, o.x), ct(e, a, 1, o.y), ct(e, a, 2, o.z));
          }
        });
      }))(O),
    q = ((e) =>
      s(() => {
        const t = E;
        b(i(t).lessThan(i(e.gridCount)), () => {
          const r = t.mul(i(4)),
            s = lt(U(e.sCells.element(r.add(3))), e.fp);
          b(s.greaterThan(i(0)), () => {
            const n = i(1).div(s),
              o = ut(e, r, 0).mul(n),
              a = ut(e, r, 1).mul(n).add(e.gravity.mul(e.dt)),
              l = ut(e, r, 2).mul(n);
            (N(e.sCells.element(r), y(o.mul(e.fp))),
              N(e.sCells.element(r.add(1)), y(a.mul(e.fp))),
              N(e.sCells.element(r.add(2)), y(l.mul(e.fp))));
            const u = i(t),
              c = u.mod(i(e.nz)),
              d = u.div(i(e.nz)).floor().mod(i(e.ny)),
              m = u.div(i(e.ny * e.nz)).floor();
            (dt(e, r, m, e.rx), dt(e, r.add(1), d, e.ry), dt(e, r.add(2), c, e.rz));
          });
        });
      }))(O),
    G = ((e) =>
      s(() => {
        const t = E;
        b(i(t).lessThan(i(e.count)), () => {
          const r = e.sPos.element(t).xyz.toVar(),
            s = nt(r),
            n = t.mul(i(3)),
            o = l(i(0), i(0), i(0)).toVar(),
            u = l(i(0), i(0), i(0)).toVar(),
            f = l(i(0), i(0), i(0)).toVar(),
            p = l(i(0), i(0), i(0)).toVar();
          for (const t of rt) {
            const n = it(s.cellIdx, t, s.wx, s.wy, s.wz),
              i = at(n.cx, n.cy, n.cz, r),
              a = ot(n.cx, n.cy, n.cz, e),
              c = ut(e, a, 0).mul(n.weight),
              d = ut(e, a, 1).mul(n.weight),
              m = ut(e, a, 2).mul(n.weight);
            (o.assign(o.add(l(c, d, m))),
              u.assign(u.add(l(c.mul(i.x), d.mul(i.x), m.mul(i.x)))),
              f.assign(f.add(l(c.mul(i.y), d.mul(i.y), m.mul(i.y)))),
              p.assign(p.add(l(c.mul(i.z), d.mul(i.z), m.mul(i.z)))));
          }
          const y = i(4);
          (e.sC.element(n).assign(m(u.mul(y), i(0))),
            e.sC.element(n.add(1)).assign(m(f.mul(y), i(0))),
            e.sC.element(n.add(2)).assign(m(p.mul(y), i(0))));
          const h = r.add(o.mul(e.dt)),
            g = i(Xe),
            x = l(
              c(d(h.x, g), e.rx.sub(i(Ye))),
              c(d(h.y, g), e.ry.sub(i(Ye))),
              c(d(h.z, g), e.rz.sub(i(Ye)))
            );
          (r.assign(x), e.sPos.element(t).assign(m(x, i(0))));
          const v = e.dt.mul(e.extrapolationK),
            w = x.add(o.mul(v)),
            S = i(Qe),
            A = i(Ze),
            z = o.toVar();
          (b(w.x.lessThan(S), () => {
            z.x.addAssign(e.wallStiffness.mul(S.sub(w.x)));
          }),
            b(w.x.greaterThan(e.rx.sub(A)), () => {
              z.x.addAssign(e.wallStiffness.mul(e.rx.sub(A).sub(w.x)));
            }),
            b(w.y.lessThan(S), () => {
              z.y.addAssign(e.wallStiffness.mul(S.sub(w.y)));
            }),
            b(w.y.greaterThan(e.ry.sub(A)), () => {
              z.y.addAssign(e.wallStiffness.mul(e.ry.sub(A).sub(w.y)));
            }),
            b(w.z.lessThan(S), () => {
              z.z.addAssign(e.wallStiffness.mul(S.sub(w.z)));
            }),
            b(w.z.greaterThan(e.rz.sub(A)), () => {
              z.z.addAssign(e.wallStiffness.mul(e.rz.sub(A).sub(w.z)));
            }),
            b(e.uSphere.w.greaterThan(i(0)), () => {
              const t = r.sub(e.uSphere.xyz),
                s = P(t);
              b(s.greaterThan(e.uSphere.w), () => {
                const n = t.div(s);
                r.assign(e.uSphere.xyz.add(n.mul(e.uSphere.w)));
                const o = a(z, n);
                z.assign(z.sub(n.mul(o.mul(i(2)))));
              });
            }),
            b(e.uPointerPos.w.greaterThan(i(0)), () => {
              const t = r.sub(e.uPointerPos.xyz),
                s = P(t);
              b(s.lessThan(e.uPointerPos.w), () => {
                const t = i(1).sub(s.div(e.uPointerPos.w));
                z.addAssign(e.uPointerVel.mul(t));
              });
            }),
            e.sPos.element(t).assign(m(r, i(0))),
            e.sVel.element(t).assign(m(z, i(0))));
        });
      }))(O),
    $ = [],
    j = [],
    H = (e, t) => {
      ($.push(e), j.push(t));
    };
  for (let e = 0; e < 2; e++) {
    const t = `_${e + 1}`;
    (H(`clearGrid${t}`, C(D(), x)),
      H(`p2g1${t}`, C(k(), f)),
      H(`p2g2${t}`, C(W(), f)),
      H(`updateGrid${t}`, C(q(), x)),
      H(`g2p${t}`, C(G(), f)));
  }
  const Q = [V, B, I, R];
  return {
    computeNodes: j,
    passNames: $,
    passLayouts: $.map((e) =>
      ((e, t, r) => ({ name: e, storageBindings: t.length, uniformBindings: r.length }))(e, Q, [])
    ),
    buffers: w,
    gridCount: x,
    numParticles: f,
    uniforms: { boxWidthRatio: S, sphereDomain: A, pointerPos: z, pointerVel: F },
  };
}
var ft = 0.07,
  pt = 64,
  yt = {
    kernelRadius: ft,
    mass: 1,
    restDensity: 15e3,
    stiffness: 20,
    nearStiffness: 1,
    viscosity: 100,
    dt: 0.006,
    gravity: -9.8,
    sphereSize: 0.08,
    halfBoxSize: [1, 2, 1],
  },
  ht = 0.95,
  bt = (e = 0.07) => (4 * e * 1) / 2,
  gt = (e) => Math.ceil(Math.max(1, e) / pt),
  xt = (e) => 315 / (64 * Math.PI * e.pow9),
  vt = (e) => 15 / (Math.PI * e.pow6),
  wt = (e) => 45 / (Math.PI * e.pow6),
  Pt = (e) => 45 / (Math.PI * e.pow6);
function St(e, t, r) {
  const s = e?.kernelRadius ?? yt.kernelRadius,
    [n, i, o] = ((e = 0.07, t = 2) => {
      const r = 1 * e,
        s = Math.ceil((2 * t + 4 * r) / r);
      return [s, s, s];
    })(s, 2),
    a = ((e = 0.07) => ({
      pow2: Math.pow(e, 2),
      pow5: Math.pow(e, 5),
      pow6: Math.pow(e, 6),
      pow9: Math.pow(e, 9),
    }))(s),
    l = t;
  return {
    kernelRadius: s,
    mass: e?.mass ?? yt.mass,
    restDensity: e?.restDensity ?? yt.restDensity,
    stiffness: e?.stiffness ?? yt.stiffness,
    nearStiffness: e?.nearStiffness ?? yt.nearStiffness,
    viscosity: e?.viscosity ?? yt.viscosity,
    dt: e?.dt ?? yt.dt,
    gravity: e?.gravity ?? yt.gravity,
    sphereSize: e?.sphereSize ?? yt.sphereSize,
    halfBoxSize: [t[0], t[1], t[2]],
    realHalfBox: [l[0], l[1], l[2]],
    cellSize: 1 * s,
    offset: bt(s),
    gridDims: [n, i, o],
    powers: a,
    densityScale: xt(a),
    nearDensityScale: vt(a),
    gradientScale: wt(a),
    laplacianScale: Pt(a),
  };
}
var At = (e, t) =>
    o(
      e
        .add(l(t.halfX, t.halfY, t.halfZ))
        .add(t.offset)
        .mul(t.cellSizeInv)
    ),
  zt = (e, t) => e.x.add(e.y.mul(i(t.xGrids))).add(e.z.mul(i(t.xGrids * t.yGrids))),
  Mt = (e, t) =>
    e.x
      .greaterThanEqual(i(0))
      .and(e.y.greaterThanEqual(i(0)))
      .and(e.z.greaterThanEqual(i(0)))
      .and(e.x.lessThan(i(t.xGrids)))
      .and(e.y.lessThan(i(t.yGrids)))
      .and(e.z.lessThan(i(t.zGrids))),
  Tt = (e, t) => c(e, i(t).sub(e).sub(i(1))),
  Ct = (e, t) => i(U(e.sCells.element(t))),
  Et = (e, t, r, s, n) => {
    const o = i(n.xGrids),
      a = i(n.yGrids),
      l = o.mul(a);
    return {
      first: e.x.sub(t).add(e.y.sub(r).mul(o)).add(e.z.sub(s).mul(l)),
      last: e.x.add(t).add(e.y.add(r).mul(o)).add(e.z.add(s).mul(l)),
    };
  },
  Nt = (e, t, r, s, n, o) => {
    for (let a = 0; a < 3; a++)
      for (let l = 0; l < 3; l++)
        for (let u = 0; u < 3; u++) {
          const d = i(u),
            m = i(l),
            f = i(a),
            p = Et(e, c(d, t), c(m, r), c(f, s), n),
            y = d.lessThanEqual(t).and(m.lessThanEqual(r).and(f.lessThanEqual(s)));
          b(y, () => {
            o(n.sPrefix.element(p.first), n.sPrefix.element(p.last.add(1)));
          });
        }
  },
  Ft = (e, t) => {
    const r = E;
    b(i(r).lessThan(i(e.count)), () => {
      const s = At(e.sPos.element(r).xyz, e);
      b(Mt(s, e), () => {
        const n = e.sPrefix.element(zt(s, e).add(1)).sub(e.sOffsets.element(r)).sub(i(1));
        b(n.lessThan(i(e.count)), () => {
          t(n);
        });
      });
    });
  },
  Vt = (e, t, r) => {
    e.addAssign(t.mul(c(r, i(0))));
  },
  Bt = (e) => e.mul(e).mul(e);
function It(e, n, o, u) {
  const d = Math.max(1, Math.floor(e)),
    [f, p, h] = n.gridDims,
    g = f * p * h,
    x = gt(g + 1),
    v = ((w = x), Math.ceil(Math.max(1, w) / pt));
  var w;
  const S = o ?? n.realHalfBox,
    z = (function (e, t, s) {
      const n = Math.max(1, Math.floor(e)),
        i = Math.max(1, Math.floor(t)),
        o = gt(i + 1),
        a = () => new r(new Float32Array(4 * n), 4);
      return {
        position: s ? s.position : a(),
        velocity: s ? s.velocity : a(),
        forceDensity: a(),
        sortedPosition: a(),
        sortedVelocity: a(),
        sortedForceDensity: a(),
        cellCounts: new r(new Uint32Array(i), 1),
        prefixSums: new r(new Float32Array(i + 1), 1),
        particleCellOffsets: new r(new Uint32Array(n), 1),
        blockPartials: new r(new Float32Array(o), 1),
        blockInclusive: new r(new Float32Array(o), 1),
        blockOffsets: new r(new Float32Array(o), 1),
      };
    })(d, g, u),
    L = M(n.halfBoxSize[2] > 0 ? S[2] / n.halfBoxSize[2] : 1),
    U = M(new t(0, 0, 0, 0)),
    W = M(new t(0, 0, 0, 0)),
    q = M(new t(0, 0, 0, 0)),
    G = T(z.position, 'vec4', d),
    $ = T(z.velocity, 'vec4', d),
    j = T(z.forceDensity, 'vec4', d),
    H = T(z.sortedPosition, 'vec4', d),
    Q = T(z.sortedVelocity, 'vec4', d),
    Z = T(z.sortedForceDensity, 'vec4', d),
    K = T(z.cellCounts, 'uint', g).toAtomic(),
    _ = T(z.prefixSums, 'float', g + 1),
    X = T(z.particleCellOffsets, 'uint', d),
    Y = T(z.blockPartials, 'float', x),
    J = T(z.blockInclusive, 'float', x),
    ee = T(z.blockOffsets, 'float', x),
    te = {
      count: d,
      gridCount: g,
      xGrids: f,
      yGrids: p,
      zGrids: h,
      scanBlocks: x,
      scanSteps: v,
      sPos: G,
      sVel: $,
      sForce: j,
      sSortedPos: H,
      sSortedVel: Q,
      sSortedForce: Z,
      sCells: K,
      sPrefix: _,
      sOffsets: X,
      sPartials: Y,
      sInclusive: J,
      sBlockOffsets: ee,
      cellSizeInv: i(1 / n.cellSize),
      offset: i(n.offset),
      uSphere: U,
      uPointerPos: W,
      uPointerVel: q,
      halfX: i(S[0]),
      halfY: i(S[1]),
      halfZ: i(n.halfBoxSize[2]).mul(L),
      radius: i(n.kernelRadius),
      radiusPow2: i(n.powers.pow2),
      r2Epsilon: i(1e-64),
      mass: i(n.mass),
      stiffness: i(n.stiffness),
      nearStiffness: i(n.nearStiffness),
      restDensity: i(n.restDensity),
      viscosity: i(n.viscosity),
      dt: i(n.dt),
      gravity: i(n.gravity),
      densityScale: i(n.densityScale),
      nearDensityScale: i(n.nearDensityScale),
      gradientScale: i(n.gradientScale),
      laplacianScale: i(n.laplacianScale),
      pool: [G, $, j, H, Q, Z, K, _, X, Y, J, ee],
    },
    re = {
      gridClear: [K],
      gridBuild: [G, K, X],
      scanPartials: [K, Y],
      scanBlocks: [Y, J, ee],
      scanApply: [K, _, ee],
      reorderPosition: [G, $, H, Q, _, X],
      reorderForce: [G, j, Z, _, X],
      density: [G, j, H, _],
      force: [G, $, j, H, Q, Z, _],
      integrate: [G, $, j],
    },
    se = ((e) =>
      s(() => {
        const t = E;
        b(i(t).lessThan(i(e.gridCount)), () => {
          N(e.sCells.element(t), y(0));
        });
      }))(te),
    ne = ((e) =>
      s(() => {
        const t = E;
        b(i(t).lessThan(i(e.count)), () => {
          const r = At(e.sPos.element(t).xyz, e);
          b(Mt(r, e), () => {
            const s = F(e.sCells.element(zt(r, e)), y(1));
            e.sOffsets.element(t).assign(s);
          });
        });
      }))(te),
    ie = ((e) =>
      s(() => {
        const t = E;
        b(i(t).lessThan(i(e.scanBlocks)), () => {
          const r = i(0).toVar();
          for (let s = 0; s < pt; s++) {
            const n = i(t).mul(i(pt)).add(i(s));
            b(n.lessThan(i(e.gridCount)), () => {
              r.assign(r.add(Ct(e, n)));
            });
          }
          e.sPartials.element(t).assign(r);
        });
      }))(te),
    oe = ((e) =>
      s(() => {
        const t = V,
          r = i(e.scanSteps),
          s = i(0).toVar();
        for (let n = 0; n < e.scanSteps; n++) {
          const o = i(t).mul(r).add(i(n));
          b(o.lessThan(i(e.scanBlocks)), () => {
            (s.assign(s.add(e.sPartials.element(o))), e.sInclusive.element(o).assign(s));
          });
        }
        const n = B('float', pt),
          o = B('float', pt);
        (n.element(t).assign(s), I());
        let a = n,
          l = o;
        for (let e = 0; e < 6; e++) {
          const r = i(Math.pow(2, e));
          (b(i(t).greaterThanEqual(r), () => {
            l.element(t).assign(R(i(a.element(t)), i(a.element(i(t).sub(r)))));
          }),
            b(i(t).lessThan(r), () => {
              l.element(t).assign(a.element(t));
            }),
            I());
          const s = l;
          ((l = a), (a = s));
        }
        const u = i(0).toVar();
        u.assign(O(i(a.element(t)), s));
        for (let s = 0; s < e.scanSteps; s++) {
          const n = i(t).mul(r).add(i(s));
          b(n.lessThan(i(e.scanBlocks)), () => {
            e.sBlockOffsets
              .element(n)
              .assign(e.sInclusive.element(n).sub(e.sPartials.element(n)).add(u));
          });
        }
      }))(te),
    ae = ((e) =>
      s(() => {
        const t = E;
        b(i(t).lessThan(i(e.scanBlocks)), () => {
          const r = i(t).mul(i(pt)),
            s = e.sBlockOffsets.element(t),
            n = i(0).toVar();
          e.sPrefix.element(r).assign(s);
          for (let t = 0; t < pt; t++) {
            const o = r.add(i(t));
            b(o.lessThan(i(e.gridCount + 1)), () => {
              (b(o.lessThan(i(e.gridCount)), () => {
                n.assign(n.add(Ct(e, o)));
              }),
                e.sPrefix.element(o.add(1)).assign(s.add(n)));
            });
          }
        });
      }))(te),
    le = ((e) =>
      s(() => {
        Ft(e, (t) => {
          const r = E;
          (e.sSortedPos.element(t).assign(e.sPos.element(r)),
            e.sSortedVel.element(t).assign(e.sVel.element(r)));
        });
      }))(te),
    ue = ((e) =>
      s(() => {
        Ft(e, (t) => {
          e.sSortedForce.element(t).assign(e.sForce.element(E));
        });
      }))(te),
    ce = ((e) =>
      s(() => {
        const t = E;
        b(i(t).lessThan(i(e.count)), () => {
          const r = e.sPos.element(t).xyz,
            s = At(r, e);
          b(Mt(s, e), () => {
            const n = i(0).toVar(),
              o = i(0).toVar(),
              l = Tt(s.x, e.xGrids),
              u = Tt(s.y, e.yGrids),
              c = Tt(s.z, e.zGrids);
            Nt(s, l, u, c, e, (t, s) => {
              D(s.sub(t), ({ i: s }) => {
                const i = e.sSortedPos.element(t.add(s)).xyz,
                  l = r.sub(i),
                  u = a(l, l);
                b(u.lessThan(e.radiusPow2), () => {
                  const t = k(u),
                    r = e.radius.sub(t);
                  (n.assign(n.add(e.mass.mul(e.densityScale).mul(Bt(e.radiusPow2.sub(u))))),
                    o.assign(o.add(e.mass.mul(e.nearDensityScale).mul(Bt(r)))));
                });
              });
            });
            const d = e.sPos.element(t).toVar();
            (d.w.assign(o), e.sPos.element(t).assign(d));
            const m = e.sForce.element(t).toVar();
            (m.w.assign(n), e.sForce.element(t).assign(m));
          });
        });
      }))(te),
    de = ((e) =>
      s(() => {
        const t = E;
        b(i(t).lessThan(i(e.count)), () => {
          const r = e.sPos.element(t),
            s = r.xyz,
            n = e.sVel.element(t).xyz,
            o = e.sForce.element(t).w,
            u = r.w,
            c = At(s, e),
            d = l(i(0), i(0), i(0)).toVar(),
            f = l(i(0), i(0), i(0)).toVar();
          b(Mt(c, e), () => {
            const t = Tt(c.x, e.xGrids),
              r = Tt(c.y, e.yGrids),
              l = Tt(c.z, e.zGrids);
            Nt(c, t, r, l, e, (t, r) => {
              D(r.sub(t), ({ i: r }) => {
                const l = t.add(r),
                  c = e.sSortedForce.element(l).w,
                  m = e.sSortedPos.element(l).xyz,
                  p = e.sSortedPos.element(l).w,
                  y = e.sSortedVel.element(l).xyz,
                  h = s.sub(m),
                  g = a(h, h);
                b(c.greaterThan(i(0)).and(p.greaterThan(i(0))), () => {
                  b(g.greaterThan(e.r2Epsilon).and(g.lessThan(e.radiusPow2)), () => {
                    const t = k(g),
                      r = e.radius.sub(t),
                      a = e.stiffness.mul(o.sub(e.restDensity)),
                      l = e.stiffness.mul(c.sub(e.restDensity)),
                      h = e.nearStiffness.mul(u),
                      b = e.nearStiffness.mul(p),
                      x = A(m.sub(s)),
                      v = e.gradientScale.mul(r.mul(r)),
                      w = e.laplacianScale.mul(r),
                      P = i(0.5).mul(a.add(l)),
                      S = i(0.5).mul(h.add(b)),
                      z = x.mul(P.mul(v).mul(e.mass).div(c)).negate(),
                      M = x.mul(S.mul(v).mul(e.mass).div(p)).negate(),
                      T = y.sub(n).mul(w.mul(e.mass).div(c));
                    (d.assign(d.add(z).add(M)), f.assign(f.add(T)));
                  });
                });
              });
            });
          });
          const p = l(i(0), e.gravity.mul(o), i(0)),
            y = d.add(f.mul(e.viscosity)).add(p);
          e.sForce.element(t).assign(m(y.x, y.y, y.z, o));
        });
      }))(te),
    me = ((e) =>
      s(() => {
        const t = E;
        b(i(t).lessThan(i(e.count)), () => {
          const r = e.sPos.element(t).toVar(),
            s = e.sForce.element(t),
            n = s.w;
          b(n.notEqual(i(0)), () => {
            const o = m(s.x.div(n), s.y.div(n), s.z.div(n), i(0)).toVar(),
              a = i(8e3);
            (b(e.uSphere.w.greaterThan(i(0)), () => {
              const t = r.xyz.sub(e.uSphere.xyz),
                s = c(e.uSphere.w.sub(P(t)), i(0)),
                n = A(t);
              (o.x.addAssign(a.mul(s).mul(n.x)),
                o.y.addAssign(a.mul(s).mul(n.y)),
                o.z.addAssign(a.mul(s).mul(n.z)));
            }),
              b(e.uSphere.w.equal(i(0)), () => {
                (Vt(o.x, a, e.halfX.sub(r.x)),
                  Vt(o.x, a, e.halfX.add(r.x)),
                  Vt(o.y, a, e.halfY.sub(r.y)),
                  Vt(o.y, a, e.halfY.add(r.y)),
                  Vt(o.z, a, e.halfZ.sub(r.z)),
                  Vt(o.z, a, e.halfZ.add(r.z)));
              }));
            const l = e.sVel.element(t).toVar();
            (b(e.uPointerPos.w.greaterThan(i(0)), () => {
              const t = r.xyz.sub(e.uPointerPos.xyz),
                s = P(t);
              b(s.lessThan(e.uPointerPos.w), () => {
                const t = i(1).sub(s.div(e.uPointerPos.w));
                (l.x.addAssign(e.uPointerVel.x.mul(t)),
                  l.y.addAssign(e.uPointerVel.y.mul(t)),
                  l.z.addAssign(e.uPointerVel.z.mul(t)));
              });
            }),
              l.x.addAssign(o.x.mul(e.dt)),
              l.y.addAssign(o.y.mul(e.dt)),
              l.z.addAssign(o.z.mul(e.dt)),
              r.x.addAssign(l.x.mul(e.dt)),
              r.y.addAssign(l.y.mul(e.dt)),
              r.z.addAssign(l.z.mul(e.dt)),
              b(e.uSphere.w.greaterThan(i(0)), () => {
                const t = r.xyz.sub(e.uSphere.xyz),
                  s = P(t);
                b(s.greaterThan(e.uSphere.w), () => {
                  const n = t.div(s);
                  (r.x.assign(e.uSphere.x.add(n.mul(e.uSphere.w).x)),
                    r.y.assign(e.uSphere.y.add(n.mul(e.uSphere.w).y)),
                    r.z.assign(e.uSphere.z.add(n.mul(e.uSphere.w).z)));
                });
              }),
              e.sVel.element(t).assign(l),
              e.sPos.element(t).assign(r));
          });
        });
      }))(te),
    fe = [],
    pe = [],
    ye = [],
    he = (e, t, r) => {
      (fe.push(e),
        pe.push(t),
        ye.push(
          ((e, t, r) => ({ name: e, storageBindings: t.length, uniformBindings: r.length }))(
            e,
            'pool' === r ? te.pool : re[r],
            []
          )
        ));
    };
  for (let e = 0; e < 2; e++) {
    const t = `_${e + 1}`;
    (he(`gridClear${t}`, C(se(), g), 'gridClear'),
      he(`gridBuild${t}`, C(ne(), d), 'gridBuild'),
      he('scanPartials', C(ie(), x), 'scanPartials'),
      he('scanBlocks', C(oe(), pt), 'scanBlocks'),
      he('scanApply', C(ae(), x), 'scanApply'),
      he(`reorderPosition${t}`, C(le(), d), 'reorderPosition'),
      he(`reorderForce${t}`, C(ue(), d), 'reorderForce'),
      he(`density${t}`, C(ce(), d), 'density'),
      he(`reorderPositionB${t}`, C(le(), d), 'reorderPosition'),
      he(`reorderForceB${t}`, C(ue(), d), 'reorderForce'),
      he(`force${t}`, C(de(), d), 'force'),
      he(`integrate${t}`, C(me(), d), 'integrate'));
  }
  return {
    computeNodes: pe,
    passNames: fe,
    passLayouts: ye,
    buffers: z,
    gridCount: g,
    numParticles: d,
    uniforms: { boxWidthRatio: L, sphereDomain: U, pointerPos: W, pointerVel: q },
  };
}
(s(
  ({
    vLifetime: e,
    vStartLifetime: t,
    vStartFrame: r,
    uFps: s,
    uUseFPSForFrameIndex: n,
    uTiles: a,
  }) => {
    const l = a.x.mul(a.y),
      u = c(e.div(t), i(1)),
      m = d(e.div(1e3).mul(s), i(0)),
      f = d(c(o(u.mul(l)), l.sub(1)), i(0)),
      p = s.equal(0).select(i(0), m),
      y = n.greaterThan(0.5).select(p, f);
    return h(r).add(y);
  }
),
  s(({ baseUV: e, frameIndex: t, uTiles: r }) => {
    const s = o(n(t, r.x)),
      i = o(n(t.div(r.x), r.y));
    return f(e.x.div(r.x).add(s.div(r.x)), e.y.div(r.y).add(i.div(r.y)));
  }));
var Rt = s(({ depthSample: e, near: t, far: r }) => {
  const s = e.mul(2).sub(1);
  return t
    .mul(2)
    .mul(r)
    .div(r.add(t).sub(s.mul(r.sub(t))));
});
function Ot(e, t, r, s) {
  const n = s.renderer,
    i = 'SPH' === e,
    o = { position: t.position, velocity: t.velocity },
    a = n.fluid?.domain,
    l =
      a && 'sphere' === a.kind && a.radius > 0
        ? { center: a.center ?? [0, 0, 0], radius: a.radius }
        : void 0;
  if (i) {
    const e = n.sph,
      s = [...(e?.halfBoxSize ?? yt.halfBoxSize)],
      i =
        'number' == typeof e?.boxWidthRatio && Number.isFinite(e.boxWidthRatio)
          ? e.boxWidthRatio
          : 1,
      a = ((e, t, r = 0.07, s = Math.random, n) => {
        const i = Math.max(1, Math.floor(t)),
          o = new Float32Array(4 * i),
          a = new Float32Array(4 * i),
          l = new Float32Array(4 * i),
          u = 0.5 * r,
          c = ht * e[0],
          d = ht * e[1],
          m = ht * e[2],
          f = n ? n.radius * n.radius : 0;
        let p = 0;
        const y = (e, t, r) => {
          if (!n) return !0;
          const s = e - n.center[0],
            i = t - n.center[1],
            o = r - n.center[2];
          return s * s + i * i + o * o <= f;
        };
        for (let e = -d; p < i; e += u)
          for (let t = -c; t < c && p < i; t += u)
            for (let r = -m; r < 0 && p < i; r += u) {
              const n = 0.001 * s(),
                i = t + n,
                a = e + n,
                l = r + n;
              if (!y(i, a, l)) continue;
              const u = 4 * p;
              ((o[u] = i), (o[u + 1] = a), (o[u + 2] = l), p++);
            }
        return { count: p, position: o, velocity: a, forceDensity: l };
      })(s, Math.max(1, r), void 0, Math.random, l);
    (t.position.array.set(a.position), t.velocity.array.set(a.velocity));
    const u = It(a.count, St(e, s), [s[0], s[1], s[2] * i], o);
    return {
      computeNodes: u.computeNodes,
      passNames: u.passNames,
      passLayouts: u.passLayouts,
      buffers: u.buffers,
      uniforms: u.uniforms,
      gridCount: u.gridCount,
      numParticles: u.numParticles,
    };
  }
  const u = n.mlsMpm,
    c = [...(u?.boxSize ?? He.boxSize)],
    d =
      'number' == typeof u?.boxWidthRatio && Number.isFinite(u.boxWidthRatio) ? u.boxWidthRatio : 1,
    m = ((e, t, r = 0.65, s = Math.random, n) => {
      const i = Math.max(1, Math.floor(t)),
        o = new Float32Array(4 * i),
        a = new Float32Array(4 * i),
        l = new Float32Array(3 * i * 4),
        u = 0.8 * e[1],
        c = n ? n.radius * n.radius : 0;
      let d = 0;
      const m = (e, t, r) => {
        if (!n) return !0;
        const s = e - n.center[0],
          i = t - n.center[1],
          o = r - n.center[2];
        return s * s + i * i + o * o <= c;
      };
      for (let t = 0; t < u && d < i; t += r)
        for (let n = 3; n < e[0] - 4 && d < i; n += r)
          for (let u = 3; u < e[2] / 2 && d < i; u += r) {
            const e = 2 * s(),
              r = n + e,
              i = t + e,
              c = u + e;
            if (!m(r, i, c)) continue;
            const f = 4 * d;
            ((o[f] = r),
              (o[f + 1] = i),
              (o[f + 2] = c),
              (a[f] = 0),
              (a[f + 1] = 0),
              (a[f + 2] = 0));
            const p = 3 * d * 4;
            ((l[p] = 1), (l[p + 5] = 1), (l[p + 10] = 1), d++);
          }
      return { count: d, position: o, velocity: a, coefficients: l };
    })(c, Math.max(1, r), void 0, Math.random, l);
  (t.position.array.set(m.position), t.velocity.array.set(m.velocity));
  const f = mt(m.count, tt(u, c), [c[0], c[1], c[2] * d], o);
  return {
    computeNodes: f.computeNodes,
    passNames: f.passNames,
    passLayouts: f.passLayouts,
    buffers: f.buffers,
    uniforms: f.uniforms,
    gridCount: f.gridCount,
    numParticles: f.numParticles,
  };
}
function Lt(e) {
  switch (e) {
    case 'INSTANCED':
      return 'INSTANCED';
    case 'TRAIL':
      return 'TRAIL';
    case 'MESH':
      return 'MESH';
    case 'FLUID':
      return 'FLUID';
    default:
      return 'POINTS';
  }
}
(s(({ viewZ: e, uSoftEnabled: t, uSoftIntensity: r, uSceneDepthTex: s, uCameraNearFar: n }) => {
  const o = i(1).toVar();
  return (
    b(t.greaterThan(0.5), () => {
      const t = g(s, x).x,
        a = Rt({ depthSample: t, near: n.x, far: n.y }).sub(e);
      o.assign(v(i(0), r, a));
    }),
    o
  );
}),
  s(({ tangent: e, viewDir: t }) => {
    const r = w(e, t).toVar(),
      s = P(r),
      n = l(S.element(0).element(0), S.element(1).element(0), S.element(2).element(0)),
      o = a(n, e),
      u = A(n.sub(e.mul(o)));
    return A(s.lessThan(1e-4).select(u, A(z(u, A(r), v(i(0), i(0.7), s)))));
  }),
  s(({ v: e, q: t }) => {
    const r = w(t.xyz, e).mul(2);
    return e.add(r.mul(t.w)).add(w(t.xyz, r));
  }));
var Ut = 0,
  Dt = [],
  kt = null,
  Wt = !0,
  qt = !1,
  Gt = (e, t) =>
    !(t && 'renderer' in t && !Ce(t.renderer)) &&
    ((kt = e), (Wt = !t || !('renderer' in t) || !!t.renderer?.backend?.isWebGPUBackend), !0);
(new e.Vector3(), new e.Vector3(), new e.Euler(0, 0, 0, 'XYZ'));
var $t = new e.Vector3();
(new e.Vector3(), new e.Vector3(), new e.Quaternion());
var jt = (e, t) => {
    if (!e) throw new Error(`three-particles: ${t}`);
  },
  Ht = (t, r, s) => {
    if (null == t) return new e.Vector2(r[0], r[1]);
    if (t instanceof e.Vector2) return t;
    let n, i;
    if (Array.isArray(t)) ((n = Number(t[0])), (i = Number(t[1])));
    else if ('object' == typeof t) {
      const e = t;
      ((n = void 0 !== e.x ? Number(e.x) : void 0 !== e.u ? Number(e.u) : void 0),
        (i = void 0 !== e.y ? Number(e.y) : void 0 !== e.v ? Number(e.v) : void 0));
    }
    return (
      jt(
        void 0 !== n && void 0 !== i && Number.isFinite(n) && Number.isFinite(i),
        `${s} must be one of: Vector2, [x,y], [u,v], {x,y} or {u,v}`
      ),
      new e.Vector2(n, i)
    );
  },
  Qt = (e, t) =>
    null == e
      ? null
      : (jt(
          'object' == typeof e && 'image' in e,
          `${t} must be null or a texture object with .image (got ${String(e)})`
        ),
        e),
  Zt = (e, t) =>
    null == e
      ? null
      : (jt(
          'object' == typeof e && 'image' in e,
          `${t} must be a texture object with .image when set (got ${String(e)})`
        ),
        e),
  Kt = (t, r) => {
    if (null == t) return new e.Vector3(1, 1, 1);
    if ('number' == typeof t) {
      const r = new e.Color(t);
      return new e.Vector3(r.r, r.g, r.b);
    }
    if ('string' == typeof t) {
      const s = t.trim(),
        n = new e.Color(s.startsWith('#') ? s : `#${s}`);
      return (
        jt(
          Number.isFinite(n.r) && Number.isFinite(n.g) && Number.isFinite(n.b),
          `${r} is not a valid hex color string`
        ),
        new e.Vector3(n.r, n.g, n.b)
      );
    }
    if (Array.isArray(t)) {
      const [s, n, i] = t;
      return (
        jt(
          Number.isFinite(s) && Number.isFinite(n) && Number.isFinite(i),
          `${r} array must contain three finite numbers`
        ),
        new e.Vector3(s, n, i)
      );
    }
    const s = t;
    return (
      jt(
        Number.isFinite(Number(s.r)) &&
          Number.isFinite(Number(s.g)) &&
          Number.isFinite(Number(s.b)),
        `${r} object must provide finite r/g/b`
      ),
      new e.Vector3(Number(s.r), Number(s.g), Number(s.b))
    );
  };
(new e.Vector3(),
  new e.Vector3(),
  new e.Vector3(),
  new e.Vector3(),
  new e.Vector3(),
  new e.Vector2());
var _t = (t, r) => (t ? new e.Vector3(t.x ?? 0, t.y ?? 0, t.z ?? 0) : r.clone()),
  Xt = {
    'THREE.NoBlending': e.NoBlending,
    'THREE.NormalBlending': e.NormalBlending,
    'THREE.AdditiveBlending': e.AdditiveBlending,
    'THREE.SubtractiveBlending': e.SubtractiveBlending,
    'THREE.MultiplyBlending': e.MultiplyBlending,
  },
  Yt = (t) => {
    if ('number' == typeof t) return t;
    if ('string' == typeof t) {
      const e = t.startsWith('THREE.') ? t : `THREE.${t}`,
        r = Xt[e];
      if (void 0 !== r) return r;
    }
    return e.NormalBlending;
  },
  Jt = () => JSON.parse(JSON.stringify(er)),
  er = {
    transform: {
      position: new e.Vector3(),
      rotation: new e.Vector3(),
      scale: new e.Vector3(1, 1, 1),
    },
    duration: 5,
    looping: !0,
    startDelay: 0,
    startLifetime: 5,
    startSpeed: 1,
    startSize: 1,
    startOpacity: 1,
    startRotation: 0,
    startColor: { min: { r: 1, g: 1, b: 1 }, max: { r: 1, g: 1, b: 1 } },
    gravity: 0,
    simulationSpace: 'LOCAL',
    simulationBackend: 'AUTO',
    maxParticles: 100,
    emission: { rateOverTime: 10, rateOverDistance: 0, bursts: [] },
    shape: {
      shape: 'SPHERE',
      sphere: { radius: 1, radiusThickness: 1, arc: 360 },
      cone: { angle: 25, radius: 1, radiusThickness: 1, arc: 360 },
      circle: { radius: 1, radiusThickness: 1, arc: 360 },
      rectangle: { rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1 } },
      box: { scale: { x: 1, y: 1, z: 1 }, emitFrom: 'VOLUME' },
    },
    map: void 0,
    renderer: {
      blending: e.NormalBlending,
      discardBackgroundColor: !1,
      backgroundColorTolerance: 1,
      backgroundColor: { r: 1, g: 1, b: 1 },
      transparent: !0,
      depthTest: !0,
      depthWrite: !1,
      softParticles: { enabled: !1, intensity: 1 },
    },
    velocityOverLifetime: {
      isActive: !1,
      linear: { x: 0, y: 0, z: 0 },
      orbital: { x: 0, y: 0, z: 0 },
    },
    sizeOverLifetime: {
      isActive: !1,
      lifetimeCurve: {
        type: 'BEZIER',
        scale: 1,
        bezierPoints: [
          { x: 0, y: 0, percentage: 0 },
          { x: 1, y: 1, percentage: 1 },
        ],
      },
    },
    colorOverLifetime: {
      isActive: !1,
      r: {
        type: 'BEZIER',
        scale: 1,
        bezierPoints: [
          { x: 0, y: 1, percentage: 0 },
          { x: 1, y: 1, percentage: 1 },
        ],
      },
      g: {
        type: 'BEZIER',
        scale: 1,
        bezierPoints: [
          { x: 0, y: 1, percentage: 0 },
          { x: 1, y: 1, percentage: 1 },
        ],
      },
      b: {
        type: 'BEZIER',
        scale: 1,
        bezierPoints: [
          { x: 0, y: 1, percentage: 0 },
          { x: 1, y: 1, percentage: 1 },
        ],
      },
    },
    opacityOverLifetime: {
      isActive: !1,
      lifetimeCurve: {
        type: 'BEZIER',
        scale: 1,
        bezierPoints: [
          { x: 0, y: 0, percentage: 0 },
          { x: 1, y: 1, percentage: 1 },
        ],
      },
    },
    rotationOverLifetime: { isActive: !1, min: 0, max: 0 },
    noise: {
      isActive: !1,
      useRandomOffset: !1,
      strength: 1,
      frequency: 0.5,
      octaves: 1,
      positionAmount: 1,
      rotationAmount: 0,
      sizeAmount: 0,
    },
    textureSheetAnimation: {
      tiles: new e.Vector2(1, 1),
      timeMode: 'LIFETIME',
      fps: 30,
      startFrame: 0,
    },
    forceFields: [],
    collisionPlanes: [],
  },
  tr = null,
  rr = () => {
    if (tr) return tr;
    if ('undefined' == typeof document) return null;
    const t = document.createElement('canvas');
    ((t.width = 1), (t.height = 1));
    const r = t.getContext('2d');
    return (
      r && ((r.fillStyle = '#ffffff'), r.fillRect(0, 0, 1, 1)),
      ((tr = new e.Texture(t)).needsUpdate = !0),
      tr
    );
  },
  sr = (e, t, r) => {
    const s = (e, t) => {
        if ('number' == typeof e && Number.isFinite(e)) return [e, e];
        if (e && 'object' == typeof e) {
          const r = e.min,
            s = e.max;
          return [
            'number' == typeof r && Number.isFinite(r) ? r : t,
            'number' == typeof s && Number.isFinite(s) ? s : t,
          ];
        }
        return [t, t];
      },
      n = (e) => 0.5 * (e[0] + e[1]),
      i = 1e3 * n(s(r.startLifetime, 5)),
      o = n(s(r.startSize, 1)),
      a = n(s(r.startRotation, 0)),
      l = n(s(r.startOpacity, 1)),
      u = r.startColor?.min ?? { r: 1, g: 1, b: 1 },
      c = r.startColor?.max ?? { r: 1, g: 1, b: 1 },
      d = 0.5 * ((u.r ?? 1) + (c.r ?? 1)),
      m = 0.5 * ((u.g ?? 1) + (c.g ?? 1)),
      f = 0.5 * ((u.b ?? 1) + (c.b ?? 1)),
      p = (e) => e?.array ?? null,
      y = p(e.color),
      h = p(e.particleState),
      b = p(e.startValues),
      g = p(e.startColorsExt),
      x = p(e.orbitalIsActive);
    for (let e = 0; e < t; e++) {
      const t = 4 * e;
      (y && ((y[t] = d), (y[t + 1] = m), (y[t + 2] = f), (y[t + 3] = l)),
        h && ((h[t] = 0), (h[t + 1] = o), (h[t + 2] = a), (h[t + 3] = 0)),
        b && ((b[t] = i), (b[t + 1] = o), (b[t + 2] = l), (b[t + 3] = d)),
        g && ((g[t] = m), (g[t + 1] = f), (g[t + 2] = 0), (g[t + 3] = e)),
        x && (x[t] = 1));
    }
  },
  nr = (e, t) => {
    if (!t) return;
    const r = (e, t) => {
        const r = e?.value;
        r &&
          'function' == typeof r.set &&
          r.set(Number(t[0]) || 0, Number(t[1]) || 0, Number(t[2]) || 0, Number(t[3]) || 0);
      },
      s = t.domain;
    r(
      e.fluidSphereDomain,
      s && 'sphere' === s.kind
        ? [s.center?.[0] ?? 0, s.center?.[1] ?? 0, s.center?.[2] ?? 0, s.radius ?? 0]
        : [0, 0, 0, 0]
    );
    const n = t.pointer;
    (r(
      e.fluidPointerPos,
      n ? [n.position[0], n.position[1], n.position[2], n.radius] : [0, 0, 0, 0]
    ),
      r(e.fluidPointerVel, n ? [n.velocity[0], n.velocity[1], n.velocity[2], 0] : [0, 0, 0, 0]));
  },
  ir = (t = er, s) => {
    const n = s || Date.now();
    if (!(null !== kt))
      throw new Error(
        'three-particles: WebGPU TSL material factory not registered. Call enableWebGPU(renderer) immediately after creating a WebGPURenderer. @cyberluke/three-particles 4.0.0 is GPU-only - no CPU fallback path exists.'
      );
    if (!Wt)
      throw new Error(
        'three-particles: renderer is not a native WebGPU backend. This build has no WebGL2 fallback. Use a new THREE.WebGPURenderer().'
      );
    const i = kt;
    if (!i.createComputePipeline)
      throw new Error(
        'three-particles: active WebGPU renderer does not provide a complete TSL compute pipeline (createComputePipeline missing). No CPU fallback exists; install a WebGPU-capable backend.'
      );
    const o = t.maxParticles || er.maxParticles,
      a = K.deepMerge(er, t, { applyToFirstObject: !1, skippedProperties: [] });
    'CPU' === a.simulationBackend && (qt || (qt = !0), (a.simulationBackend = 'GPU'));
    const l = a.renderer.rendererType || 'POINTS',
      u = Lt(l),
      c = u,
      d = 'INSTANCED' === u || 'MESH' === u || 'FLUID' === u,
      m = a.renderer.trail,
      f = Math.max(2, Math.round(m?.length ?? 20)),
      p = 'TRAIL' === c ? new r(new Float32Array(o * (f + 1) * 4), 4) : null,
      y = p
        ? {
            attribute: p,
            meta: null,
            length: f,
            minVertexDistance: m?.minVertexDistance ?? 0,
            maxTime: 1e3 * (m?.maxTime ?? 0),
          }
        : null,
      h = a.subEmitters ?? [],
      b = h.map((e) => {
        const t = Math.max(1, Math.round(e.maxInstances ?? 32)),
          r = i.createSubEmitterFifoAttribute(t);
        return ((r.trigger = 'BIRTH' === e.trigger ? 0 : 1), r);
      }),
      g = b.reduce((e, t) => Math.max(e, t.windowSize), 0),
      x = (a.forceFields ?? []).map((t) => ({
        isActive: t.isActive ?? !0,
        type: t.type ?? 'POINT',
        position: _t(t.position, new e.Vector3(0, 0, 0)),
        direction: _t(t.direction, new e.Vector3(0, 1, 0)).normalize(),
        strength: t.strength ?? 1,
        range: Math.max(0, t.range ?? 1 / 0),
        falloff: t.falloff ?? 'LINEAR',
      }));
    const v = (a.collisionPlanes ?? []).map((t) => ({
      isActive: t.isActive ?? !0,
      position: _t(t.position, new e.Vector3(0, 0, 0)),
      normal: _t(t.normal, new e.Vector3(0, 1, 0)).normalize(),
      mode: t.mode ?? 'KILL',
      dampen: Math.max(0, Math.min(1, t.dampen ?? 0.5)),
      lifetimeLoss: Math.max(0, Math.min(1, t.lifetimeLoss ?? 0)),
    }));
    const w = i.createComputePipeline(o, d, a, Ut, x.length, v.length, b, y ?? void 0);
    let P = 0,
      S = null,
      A = 1,
      z = 0,
      M = [],
      T = 0;
    if ('FLUID' === c) {
      const e = w.buffers.position,
        t = w.buffers.velocity,
        r = w.buffers,
        s =
          'SPH' ===
          String(a.renderer.fluid?.solver ?? '')
            .trim()
            .toUpperCase(),
        n = s ? 'SPH' : 'MLS-MPM',
        i = s ? 'sph' : 'mlsmpm',
        l = Ot(n, { position: e, velocity: t }, o, a);
      (s
        ? ((r.fluidForceDensity = l.buffers.forceDensity),
          (r.fluidSortedPosition = l.buffers.sortedPosition),
          (r.fluidSortedVelocity = l.buffers.sortedVelocity),
          (r.fluidSortedForceDensity = l.buffers.sortedForceDensity),
          (r.fluidCellCounts = l.buffers.cellCounts),
          (r.fluidPrefixSums = l.buffers.prefixSums),
          (r.fluidParticleCellOffsets = l.buffers.particleCellOffsets),
          (r.fluidBlockPartials = l.buffers.blockPartials),
          (r.fluidBlockInclusive = l.buffers.blockInclusive),
          (r.fluidBlockOffsets = l.buffers.blockOffsets))
        : ((r.fluidCoefficients = l.buffers.coefficients), (r.fluidCells = l.buffers.cells)),
        (P = l.numParticles),
        (S = n),
        (z = l.gridCount),
        (A = s ? (a.renderer.sph?.boxWidthRatio ?? 1) : (a.renderer.mlsMpm?.boxWidthRatio ?? 1)),
        sr(w.buffers, l.numParticles, a),
        w.uniforms.emitCount && (w.uniforms.emitCount.value = 0),
        (w.uniforms.fluidBoxWidthRatio = l.uniforms.boxWidthRatio),
        (w.uniforms.fluidSphereDomain = l.uniforms.sphereDomain),
        (w.uniforms.fluidPointerPos = l.uniforms.pointerPos),
        (w.uniforms.fluidPointerVel = l.uniforms.pointerVel),
        nr(w.uniforms, a.renderer.fluid));
      const u = w;
      ((u.computeNodes = [
        ...(u.computeNodes ?? (w.emitNode && w.simNode ? [w.emitNode, w.simNode] : [])),
        ...l.computeNodes,
      ]),
        (u.passNames = [
          ...(u.passNames ?? ['emit', 'simulate']),
          ...l.passNames.map((e) => `${i}:${e}`),
        ]),
        (M = u.passNames),
        (u.passLayouts = [
          ...(u.passLayouts ?? []),
          ...l.passLayouts.map((e) => ({ ...e, name: `${i}:${e.name}` })),
        ]));
    }
    const C = y
        ? i.createTrailRibbonUpdate({
            position: new r(new Float32Array(o * f * 2 * 4), 4),
            next: new r(new Float32Array(o * f * 2 * 4), 4),
            uvColorA: new r(new Float32Array(o * f * 2 * 4), 4),
            colorB: new r(new Float32Array(o * f * 2 * 4), 4),
            history: y.attribute,
            meta: y.meta,
            particleColor: w.buffers.color,
            curveFns: {
              width: m?.widthOverTrail ? Ue(Ut, m.widthOverTrail) : void 0,
              opacity: m?.opacityOverTrail ? Ue(Ut, m.opacityOverTrail) : void 0,
              colorR: m?.colorOverTrail?.isActive ? Ue(Ut, m.colorOverTrail.r) : void 0,
              colorG: m?.colorOverTrail?.isActive ? Ue(Ut, m.colorOverTrail.g) : void 0,
              colorB: m?.colorOverTrail?.isActive ? Ue(Ut, m.colorOverTrail.b) : void 0,
            },
            width: m?.width ?? 1,
            length: f,
            maxTime: y.maxTime,
            maxParticles: o,
          })
        : null,
      E = [];
    for (let e = 0; e < h.length; e++) {
      const t = h[e],
        r = b[e],
        s = K.deepMerge(Jt(), t.config ?? {}, { applyToFirstObject: !1, skippedProperties: [] }),
        n = s.emission?.bursts?.[0],
        a = n ? Math.max(1, Math.ceil(De(Ut + 1 + e, n.count, 0) * (n.cycles ?? 1))) : 1,
        l = Math.min(a, r.capacity),
        u = Math.max(2, Math.min(l * r.capacity, 65536)),
        c = s.renderer?.rendererType,
        d = Lt(c),
        m = 'INSTANCED' === d || 'MESH' === d,
        f = i.createComputePipeline(u, m, s, Ut + 1 + e, 0, 0, [], void 0),
        p = i.encodeShapeEmitParams(s, Ut + 1 + e),
        y = s.velocityOverLifetime,
        g = i.createSubEmitterInitUpdate(
          f.buffers,
          u,
          p,
          w.buffers,
          o,
          r,
          t.inheritVelocity ?? 0,
          l,
          {
            linear: [y?.linear?.x, y?.linear?.y, y?.linear?.z],
            orbital: [y?.orbital?.x, y?.orbital?.y, y?.orbital?.z],
          }
        );
      E.push({
        fifo: r,
        pipeline: f,
        init: g,
        instanced: m,
        requestedRendererType: c,
        effectiveRendererType: d,
        cfg: s,
        object: null,
        perEvent: l,
        gravity: s.gravity,
        noise: s.noise?.isActive
          ? {
              isActive: !0,
              strength: s.noise.strength,
              noisePower: 0.15 * s.noise.strength,
              frequency: s.noise.frequency,
              positionAmount: s.noise.positionAmount,
              rotationAmount: s.noise.rotationAmount,
              sizeAmount: s.noise.sizeAmount,
              fbmMax: 2 - Math.pow(2, -s.noise.octaves),
            }
          : null,
        rate: s.emission?.rateOverTime ? De(Ut + 1 + e, s.emission.rateOverTime, 0) : 0,
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
          isWorld: 'WORLD' === s.simulationSpace ? 1 : 0,
        },
      });
    }
    const N = a.renderer.cameraNearFar,
      F = a.textureSheetAnimation?.tiles,
      V = { value: 0 },
      B = {
        elapsed: V,
        viewportHeight: { value: 720 },
        cameraNearFar: { value: Ht(N, [0.1, 1e3], 'renderer.cameraNearFar') },
        useInstancing: { value: d },
        softParticlesEnabled: { value: !!a.renderer.softParticles?.enabled },
        softParticlesIntensity: {
          value: Math.max(a.renderer.softParticles?.intensity ?? 1, 0.001),
        },
        sceneDepthTexture: {
          value: Zt(a.renderer.softParticles?.depthTexture, 'renderer.softParticles.depthTexture'),
        },
        discardBackgroundColor: { value: !!a.renderer.discardBackgroundColor },
        backgroundColor: { value: new e.Color(16777215) },
        backgroundColorTolerance: { value: a.renderer.backgroundColorTolerance ?? 0 },
        map: { value: Qt(a.map ?? rr(), 'map') },
        startLifetime: { value: 0 },
        startSize: { value: 1 },
        startRotation: { value: 0 },
        startOpacity: { value: 1 },
        startColor: { value: new e.Color(1, 1, 1) },
        lifetime: { value: 0 },
        color: { value: new e.Color(1, 1, 1) },
        fps: { value: a.textureSheetAnimation?.fps || 30 },
        useFPSForFrameIndex: { value: 'FPS' === a.textureSheetAnimation?.timeMode },
        tiles: { value: Ht(F, [1, 1], 'textureSheetAnimation.tiles') },
        fluidStretch: {
          value:
            'number' == typeof a.renderer.fluid?.stretch &&
            Number.isFinite(a.renderer.fluid.stretch)
              ? a.renderer.fluid.stretch
              : 1,
        },
        fluidAbsorption: {
          value:
            'number' == typeof a.renderer.fluid?.absorption &&
            Number.isFinite(a.renderer.fluid.absorption)
              ? a.renderer.fluid.absorption
              : 1.44,
        },
        fluidIor: {
          value:
            'number' == typeof a.renderer.fluid?.ior && Number.isFinite(a.renderer.fluid.ior)
              ? a.renderer.fluid.ior
              : 1.33,
        },
        fluidSphereSize: {
          value:
            'number' == typeof a.renderer.fluid?.sphereSize &&
            Number.isFinite(a.renderer.fluid.sphereSize)
              ? a.renderer.fluid.sphereSize
              : 1.2,
        },
        fluidDensity: {
          value:
            'number' == typeof a.renderer.fluid?.density &&
            Number.isFinite(a.renderer.fluid.density)
              ? a.renderer.fluid.density
              : 0.7,
        },
        fluidWaterColor: {
          value:
            Array.isArray(a.renderer.fluid?.waterColor) && 3 === a.renderer.fluid.waterColor.length
              ? [
                  Number(a.renderer.fluid.waterColor[0]) || 0,
                  Number(a.renderer.fluid.waterColor[1]) || 0,
                  Number(a.renderer.fluid.waterColor[2]) || 0,
                ]
              : [0, 0.7375, 0.95],
        },
        fluidSphereRender: { value: !!a.renderer.fluid?.sphereRender },
      },
      I = Kt(a.renderer.backgroundColor, 'renderer.backgroundColor');
    B.backgroundColor.value.setRGB(I.x, I.y, I.z);
    const R = {
        transparent: !!a.renderer.transparent,
        blending: Yt(a.renderer.blending),
        depthTest: !1 !== a.renderer.depthTest,
        depthWrite: !1 !== a.renderer.depthWrite,
      },
      O = w.buffers;
    let L;
    if (d) {
      const t = new e.InstancedBufferGeometry(),
        r = a.renderer.mesh?.geometry,
        s = 'MESH' === c && r ? r : new e.BufferGeometry();
      if ('MESH' !== c || !r) {
        const t = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]),
          r = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
          n = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
          i = new Uint16Array([0, 1, 2, 0, 2, 3]);
        (s.setAttribute('position', new e.BufferAttribute(t, 3)),
          s.setAttribute('uv', new e.BufferAttribute(r, 2)),
          s.setAttribute('normal', new e.BufferAttribute(n, 3)),
          s.setIndex(new e.BufferAttribute(i, 1)));
      }
      (t.setAttribute('position', s.getAttribute('position')),
        null !== s.index && t.setIndex(s.index),
        (t.instanceCount = o),
        t.setAttribute('instanceOffset', O.position),
        t.setAttribute('instanceColor', O.color),
        t.setAttribute('instanceParticleState', O.particleState),
        t.setAttribute('instanceStartValues', O.startValues),
        'FLUID' === c && t.setAttribute('instanceVelocity', O.velocity),
        (L = t));
    } else {
      const t = new e.BufferGeometry();
      (t.setAttribute('position', O.position),
        t.setAttribute('color', O.color),
        t.setAttribute('particleState', O.particleState),
        t.setAttribute('startValues', O.startValues),
        t.setDrawRange(0, o),
        (L = t),
        (t.instanceCount = o));
    }
    const U = i.createTSLParticleMaterial(c, B, R, !0, L);
    'FLUID' === c && (T = U.__fluidPassNodes?.length ?? 0);
    let D = null;
    if (C && y) {
      const t = C.buffers,
        r = new e.BufferGeometry();
      (r.setAttribute('position', t.position),
        r.setAttribute('trailNext', t.next),
        r.setAttribute('trailUVColor', t.uvColorA),
        r.setAttribute('trailColorBA', t.colorB));
      const s = new Uint32Array(o * (f - 1) * 6);
      let n = 0;
      for (let e = 0; e < o; e++)
        for (let t = 0; t < f - 1; t++) {
          const r = e * f * 2 + 2 * t;
          ((s[n++] = r),
            (s[n++] = r + 1),
            (s[n++] = r + 2),
            (s[n++] = r + 1),
            (s[n++] = r + 3),
            (s[n++] = r + 2));
        }
      (r.setIndex(new e.BufferAttribute(s, 1)), r.setDrawRange(0, o * f * 2), (D = r));
    }
    const k = D
        ? i.createTSLTrailMaterial(
            {
              map: { value: a.map ?? rr() },
              useMap: { value: !!a.map },
              discardBackgroundColor: { value: !!a.renderer.discardBackgroundColor },
              backgroundColor: { value: a.renderer.backgroundColor ?? { r: 1, g: 1, b: 1 } },
              backgroundColorTolerance: { value: a.renderer.backgroundColorTolerance ?? 0 },
              softParticlesEnabled: { value: !!a.renderer.softParticles?.enabled },
              softParticlesIntensity: {
                value: Math.max(a.renderer.softParticles?.intensity ?? 1, 0.001),
              },
              sceneDepthTexture: { value: a.renderer.softParticles?.depthTexture ?? null },
              cameraNearFar: { value: new e.Vector2(0.1, 1e3) },
            },
            {
              transparent: !!a.renderer.transparent,
              blending: Yt(a.renderer.blending),
              depthTest: !1 !== a.renderer.depthTest,
              depthWrite: !1 !== a.renderer.depthWrite,
            }
          )
        : null,
      W = U.__fluidPassGeometry,
      q = D ? new e.Mesh(D, k) : d ? new e.Mesh(W ?? L, U) : new e.Points(L, U);
    q.frustumCulled = !1;
    for (const t of E) {
      const r = t.pipeline.buffers,
        s = t.pipeline.allocatorCount - 1,
        n = t.instanced
          ? (() => {
              const n = new e.InstancedBufferGeometry(),
                i = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]),
                o = new Uint16Array([0, 1, 2, 0, 2, 3]);
              return (
                n.setAttribute('position', new e.BufferAttribute(i, 3)),
                n.setIndex(new e.BufferAttribute(o, 1)),
                (n.instanceCount = s),
                n.setAttribute('instanceOffset', r.position),
                n.setAttribute('instanceColor', r.color),
                n.setAttribute('instanceParticleState', r.particleState),
                n.setAttribute('instanceStartValues', r.startValues),
                'FLUID' === t.effectiveRendererType &&
                  n.setAttribute('instanceVelocity', r.velocity),
                n
              );
            })()
          : (() => {
              const t = new e.BufferGeometry();
              return (
                t.setAttribute('position', r.position),
                t.setAttribute('color', r.color),
                t.setAttribute('particleState', r.particleState),
                t.setAttribute('startValues', r.startValues),
                t.setDrawRange(0, s),
                t
              );
            })(),
        o = { ...B, useInstancing: { value: t.instanced } },
        a = i.createTSLParticleMaterial(t.effectiveRendererType, o, R, !0),
        l = t.instanced ? new e.Mesh(n, a) : new e.Points(n, a);
      ((l.frustumCulled = !1), q.add(l), (t.object = l));
    }
    if (!1 !== import.meta.env?.DEV) {
      const e = d
        ? [
            'position',
            'instanceOffset',
            'instanceColor',
            'instanceParticleState',
            'instanceStartValues',
          ]
        : ['position', 'color', 'particleState', 'startValues'];
      for (const t of e)
        if (!L.getAttribute(t))
          throw new Error(
            'three-particles: ' +
              (d ? 'instanced' : 'POINTS') +
              ' geometry ' +
              t +
              ' is missing its required contract attribute.'
          );
      const t = d
        ? [
            ['instanceOffset', O.position],
            ['instanceColor', O.color],
            ['instanceParticleState', O.particleState],
            ['instanceStartValues', O.startValues],
          ]
        : [
            ['position', O.position],
            ['color', O.color],
            ['particleState', O.particleState],
            ['startValues', O.startValues],
          ];
      for (const [e, r] of t)
        if (L.getAttribute(e) !== r)
          throw new Error(
            `three-particles: attribute "${e}" is not the compute-owned storage buffer.`
          );
      const r = w.shapeUniforms.shapeKind.value;
      if (!(r >= 0 && r <= 4))
        throw new Error(`three-particles: gpuShapeKind ${r} outside 0..4 (SPHERE..BOX).`);
      if (!(o > 0)) throw new Error('three-particles: maxParticles must be > 0.');
      if (w.allocatorCount !== o + 1)
        throw new Error('three-particles: allocator capacity must equal maxParticles + 1.');
      const s = [
        ...(w.passLayouts ?? []),
        ...(C?.passLayouts ?? []),
        ...E.flatMap((e) => [
          ...(e.init.passLayouts ?? []),
          ...(e.pipeline.passLayouts ?? []).map((e) => ({ ...e, name: `child:${e.name}` })),
        ]),
      ];
      for (const e of s)
        if (e.storageBindings > 8)
          throw new Error(`${e.name}: ${e.storageBindings} storage buffers > guaranteed limit 8`);
      if (y && y.meta !== w.trailMeta)
        throw new Error('three-particles: trail ring meta buffer mismatch.');
      for (const e of b) {
        if (2 !== e.counter.array.length)
          throw new Error(
            'three-particles: sub-emitter FIFO must expose exactly 2 ping-pong counter slots.'
          );
        if (e.payload.array.length !== 12 * e.capacity)
          throw new Error(
            'three-particles: sub-emitter FIFO payload length must be 2 * 6 * capacity.'
          );
      }
    }
    const G = (e, t) => ('number' == typeof e && Number.isFinite(e) ? e : t),
      $ = a.transform;
    ($?.position && q.position.set(G($.position.x, 0), G($.position.y, 0), G($.position.z, 0)),
      $?.rotation &&
        q.rotation.set(
          e.MathUtils.degToRad(G($.rotation.x, 0)),
          e.MathUtils.degToRad(G($.rotation.y, 0)),
          e.MathUtils.degToRad(G($.rotation.z, 0))
        ),
      $?.scale && q.scale.set(G($.scale.x, 1), G($.scale.y, 1), G($.scale.z, 1)),
      q.updateMatrix(),
      q.updateMatrixWorld(!0),
      'WORLD' === a.simulationSpace && ((q.matrixWorldAutoUpdate = !1), q.matrixWorld.identity()));
    const j = {
        particleSystemId: Ut++,
        normalizedLifetimePercentage: 0,
        distanceFromLastEmitByDistance: 0,
        lastWorldPosition: new e.Vector3(-99999),
        currentWorldPosition: new e.Vector3(-99999),
        worldPositionChange: new e.Vector3(),
        sourceWorldMatrix: new e.Matrix4(),
        worldQuaternion: new e.Quaternion(),
        wrapperQuaternion: new e.Quaternion(),
        worldScale: new e.Vector3(1, 1, 1),
        worldEuler: new e.Euler(),
        gravityVelocity: new e.Vector3(0, 0, 0),
        startValues: {},
        linearVelocityData: void 0,
        orbitalVelocityData: void 0,
        lifetimeValues: {},
        creationTimes: new Float32Array(0),
        cpuDirtyParticleWatermark: -1,
        highWaterIndex: P,
        fluidSolver: S,
        fluidBoxWidthRatio: A,
        noise: {
          isActive: a.noise.isActive,
          strength: a.noise.strength,
          noisePower: 0.15 * a.noise.strength,
          frequency: a.noise.frequency,
          positionAmount: a.noise.positionAmount,
          rotationAmount: a.noise.rotationAmount,
          sizeAmount: a.noise.sizeAmount,
          fbmMax: 2 - Math.pow(2, -a.noise.octaves),
        },
        isEnabled: !0,
        burstStates: a.emission.bursts?.length
          ? a.emission.bursts.map(() => ({
              cyclesExecuted: 0,
              lastCycleTime: 0,
              probabilityPassed: !1,
            }))
          : void 0,
      },
      H = {
        particleSystem: q,
        mappedAttributes: {
          position: O.position,
          isActive: O.orbitalIsActive,
          lifetime: O.particleState,
          startLifetime: O.startValues,
          startFrame: O.particleState,
          size: O.particleState,
          rotation: O.particleState,
          color: O.color,
        },
        scalarArray: new Float32Array(0),
        scalarInterleavedBuffer: new e.InterleavedBuffer(new Float32Array(0), oe),
        elapsedUniform: V,
        generalData: j,
        onUpdate: () => {},
        onComplete: () => {},
        creationTime: n + (a.startDelay || 0),
        lastEmissionTime: n,
        emissionAccumulator: 0,
        duration: a.duration,
        looping: a.looping,
        simulationSpace: a.simulationSpace,
        gravity: a.gravity,
        normalizedForceFields: x,
        normalizedCollisionPlanes: v,
        emission: a.emission,
        normalizedConfig: a,
        iterationCount: 0,
        velocities: [],
        freeList: [],
        deactivateParticle: () => {},
        killParticle: () => {},
        activateParticle: () => {},
        computePipeline: w,
        useGPUCompute: !0,
        computeDispatchReady: !1,
        maxParticles: o,
        material: U,
        geometry: L,
        rrType: c,
        requestedRendererType: l,
        effectiveRendererType: c,
        sharedUniforms: B,
        allComputeNodes: [
          ...(w.computeNodes ?? []),
          ...(C ? [C.ribbonNode] : []),
          ...E.flatMap((e) => [
            e.init.commandBuildNode,
            e.init.childInitNode,
            ...(null !== e.init.counterClearNode && void 0 !== e.init.counterClearNode
              ? [e.init.counterClearNode]
              : []),
            ...(e.pipeline.computeNodes ?? []),
          ]),
        ],
        passNames: [
          ...(w.passNames ?? ['emit', 'simulate']),
          ...(C ? ['trail-ribbon'] : []),
          ...E.flatMap((e, t) => [
            `sub${t}:command-build`,
            `sub${t}:child-init`,
            `sub${t}:counter-clear`,
            `sub${t}:child-emit`,
            `sub${t}:child-sim`,
          ]),
        ],
        fifoBaseStride: g,
        ribbonUniforms: C ? C.uniforms : void 0,
        ribbonBuffers: C ? C.buffers : void 0,
        frameParity: 0,
        subEntries: E.map((e) => ({
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
            G(e.cfg.transform?.position?.x, 0),
            G(e.cfg.transform?.position?.y, 0),
            G(e.cfg.transform?.position?.z, 0),
          ],
        })),
      };
    for (const t of E) {
      if (!t.object) continue;
      const r = t.cfg.transform;
      (r?.position &&
        t.object.position.set(G(r.position.x, 0), G(r.position.y, 0), G(r.position.z, 0)),
        r?.rotation &&
          t.object.rotation.set(
            e.MathUtils.degToRad(G(r.rotation.x, 0)),
            e.MathUtils.degToRad(G(r.rotation.y, 0)),
            e.MathUtils.degToRad(G(r.rotation.z, 0))
          ),
        r?.scale && t.object.scale.set(G(r.scale.x, 1), G(r.scale.y, 1), G(r.scale.z, 1)),
        t.object.updateMatrix());
      const s = new e.Quaternion().setFromEuler(
          new e.Euler(
            e.MathUtils.degToRad(G(r?.rotation?.x, 0)),
            e.MathUtils.degToRad(G(r?.rotation?.y, 0)),
            e.MathUtils.degToRad(G(r?.rotation?.z, 0)),
            'XYZ'
          )
        ),
        n = H.subEntries?.[E.indexOf(t)];
      n &&
        ((n.quat = [s.x, s.y, s.z, s.w]),
        (n.scale = [G(r?.scale?.x, 1), G(r?.scale?.y, 1), G(r?.scale?.z, 1)]));
    }
    Dt.push(H);
    const Q = [
        ...(w.passLayouts ?? []).map((e) => [e.name, e.storageBindings]),
        ...(C?.passLayouts ?? []).map((e) => [e.name, e.storageBindings]),
        ...E.flatMap((e, t) => [
          ...(e.init.passLayouts ?? []).map((e) => [`sub${t}:${e.name}`, e.storageBindings]),
          ...(e.pipeline.passLayouts ?? []).map((e) => [`sub${t}:${e.name}`, e.storageBindings]),
        ]),
      ],
      Z = Q.reduce((e, t) => Math.max(e, t[1]), 0);
    if ('undefined' != typeof console && console.log) {
      const e = a;
      (w.shapeUniforms, e.startValues, w.uniforms);
    }
    return {
      instance: q,
      resumeEmitter: () => {
        j.isEnabled = !0;
      },
      pauseEmitter: () => {
        j.isEnabled = !1;
      },
      dispose: () => {
        ((e) => {
          Dt = Dt.filter(
            ({ particleSystem: t, trailMesh: r, generalData: { particleSystemId: s } }) =>
              t !== e ||
              (ne(s),
              r &&
                (r.geometry.dispose(),
                Array.isArray(r.material)
                  ? r.material.forEach((e) => e.dispose())
                  : r.material.dispose(),
                r.parent && r.parent.remove(r)),
              t.geometry.dispose(),
              Array.isArray(t.material)
                ? t.material.forEach((e) => e.dispose())
                : t.material.dispose(),
              t.parent && t.parent.remove(t),
              !1)
          );
        })(q);
      },
      update: (e) => {
        lr(H, e);
      },
      updateConfig: (e) => {
        K.deepMerge(a, e, { applyToFirstObject: !0, skippedProperties: [] });
      },
      getActiveParticleCount: () => -1,
      computeNode:
        H.allComputeNodes && H.allComputeNodes.length > 0
          ? H.allComputeNodes
          : (w.computeNodes ?? w.computeNode),
      bindCamera: (e) => {
        if (!e) return;
        const t = [U, k];
        for (const r of t) {
          const t = r?.__fluidPassNodes;
          if (t) for (const r of t) r && null == r.camera && (r.camera = e);
        }
      },
      getFluidTelemetry: () =>
        S
          ? {
              solver: S,
              filledParticles: P,
              maxParticles: o,
              gridCount: z,
              passNames: [...M],
              passCount: M.length,
              boxWidthRatio: Number(w.uniforms.fluidBoxWidthRatio?.value ?? A),
              screenSpacePasses: T,
            }
          : null,
      gpuDebug: {
        maxParticles: o,
        allocatorCount: w.allocatorCount,
        requestedRendererType: l,
        effectiveRendererType: c,
        systemSeed: w.uniforms.seed.value,
        buffers: w.buffers,
        emitNode: w.emitNode,
        simNode: w.simNode,
        passNames: w.passNames ?? ['emit', 'simulate'],
        allPassNames: H.passNames ?? [],
        storageBindingCount: Z,
        passBindingCounts: Q,
        lastEmitCount: () => w.uniforms.emitCount.value,
        subEmitters: (E ?? []).map((e) => ({
          requestedRendererType: e.requestedRendererType ?? null,
          effectiveRendererType: e.effectiveRendererType,
          perEvent: e.perEvent,
        })),
        snapshot: () => {
          const e = a.shape,
            r = 'CONE' === e.shape ? e.cone : 'CIRCLE' === e.shape ? e.circle : e.sphere,
            s = a.map;
          return {
            systemId: j.particleSystemId,
            effectiveRendererType: c,
            requestedRendererType: l,
            rendererType: c,
            simulationSpace: a.simulationSpace,
            maxParticles: o,
            shape: {
              publicShape: e.shape,
              gpuShapeKind: w.shapeUniforms?.shapeKind?.value ?? 0,
              radius: r?.radius ?? null,
              radiusThickness: r?.radiusThickness ?? null,
              arcDeg: r?.arc ?? null,
              coneAngleDeg: 'CONE' === e.shape ? (e.cone?.angle ?? null) : null,
              rectScale: e.rectangle?.scale ?? null,
              rectRotation: e.rectangle?.rotation ?? null,
              boxScale: e.box?.scale ?? null,
              boxEmitFrom: e.box?.emitFrom ?? null,
            },
            textureId: t.textureId ?? t._editorData?.textureId ?? null,
            textureResolved: !!a.map,
            textureDimensions: s?.image ? [s.image.width ?? 0, s.image.height ?? 0] : null,
            forceFieldCount: (a.forceFields ?? []).length,
            collisionPlaneCount: (a.collisionPlanes ?? []).length,
            subEmitterCount: (a.subEmitters ?? []).length,
            trailEnabled: !!a.renderer.trail,
          };
        },
      },
    };
  },
  or = new WeakMap(),
  ar = new WeakSet(),
  lr = (e, { now: t, delta: r, elapsed: s }) => {
    const {
      generalData: n,
      normalizedConfig: i,
      particleSystem: o,
      elapsedUniform: a,
      creationTime: l,
      normalizedForceFields: u,
      normalizedCollisionPlanes: c,
      emission: d,
      computePipeline: m,
      maxParticles: f = 0,
      allComputeNodes: p,
      subEntries: y,
      fifoBaseStride: h = 0,
      ribbonUniforms: b,
    } = e;
    if (!m) return;
    const g = m.uniforms,
      x = i.duration,
      v = t - l,
      w = i.looping,
      P = w ? v % (1e3 * x) : v;
    ((n.normalizedLifetimePercentage = Math.max(Math.min(P / 1e3 / x, 1), 0)), (a.value = s));
    const S = n.gravityVelocity;
    (S.set(0, i.gravity, 0),
      'WORLD' === i.simulationSpace
        ? (o.updateMatrix(),
          mr.copy(o.matrix),
          o.parent && (o.parent.updateMatrixWorld(), mr.premultiply(o.parent.matrixWorld)),
          mr.decompose(n.currentWorldPosition, n.worldQuaternion, n.worldScale))
        : (o.updateMatrixWorld(),
          o.getWorldPosition(n.currentWorldPosition),
          o.getWorldQuaternion(n.worldQuaternion),
          o.getWorldScale(n.worldScale),
          ur.copy(n.worldQuaternion).invert(),
          S.applyQuaternion(ur),
          (S.x /= n.worldScale.x || 1),
          (S.y /= n.worldScale.y || 1),
          (S.z /= n.worldScale.z || 1)),
      -99999 !== n.lastWorldPosition.x &&
        ($t.copy(n.lastWorldPosition),
        (n.distanceFromLastEmitByDistance += $t.distanceTo(n.currentWorldPosition))),
      n.lastWorldPosition.copy(n.currentWorldPosition));
    let A = 0;
    if (n.isEnabled && (w || P < 1e3 * x)) {
      const r = t - e.lastEmissionTime;
      if (
        (r > 0 &&
          ((e.lastEmissionTime = t),
          d.rateOverTime &&
            (e.emissionAccumulator +=
              De(n.particleSystemId, d.rateOverTime, n.normalizedLifetimePercentage) * (r / 1e3))),
        (A += Math.floor(e.emissionAccumulator)),
        A > 0 && (e.emissionAccumulator -= A),
        d.rateOverDistance && n.distanceFromLastEmitByDistance > 0)
      ) {
        const e = De(n.particleSystemId, d.rateOverDistance, n.normalizedLifetimePercentage);
        if (e > 0) {
          const t = Math.floor(n.distanceFromLastEmitByDistance * e);
          ((A += t),
            (n.distanceFromLastEmitByDistance = Math.max(
              n.distanceFromLastEmitByDistance - t / e,
              0
            )));
        }
      }
      if (d.bursts && n.burstStates) {
        const e = d.bursts,
          t = n.burstStates,
          r = P / 1e3;
        for (let s = 0; s < e.length; s++) {
          const i = e[s],
            o = t[s],
            a = i.cycles ?? 1,
            l = i.interval ?? 0,
            u = i.probability ?? 1;
          if (
            (w &&
              r < (i.time ?? 0) &&
              o.cyclesExecuted > 0 &&
              ((o.cyclesExecuted = 0), (o.lastCycleTime = 0), (o.probabilityPassed = !1)),
            o.cyclesExecuted >= a)
          )
            continue;
          r >= (i.time ?? 0) + o.cyclesExecuted * l &&
            (0 === o.cyclesExecuted && (o.probabilityPassed = Math.random() < u),
            o.probabilityPassed &&
              (A += Math.floor(De(n.particleSystemId, i.count, n.normalizedLifetimePercentage))),
            o.cyclesExecuted++,
            (o.lastCycleTime = r));
        }
      }
      A > f && (A = f);
    }
    ((g.delta.value = r),
      (g.deltaMs.value = 1e3 * r),
      g.gravityVelocity.value.copy(S),
      (g.emitCount.value = A),
      (m.emitNode.count = Math.max(1, A)),
      m.subBirthEventsNode && (m.subBirthEventsNode.count = Math.max(1, A)));
    const z = n.noise;
    if (
      (g.noiseStrength && (g.noiseStrength.value = z.strength),
      g.noisePower && (g.noisePower.value = z.noisePower),
      g.noiseFrequency && (g.noiseFrequency.value = z.frequency),
      g.noisePositionAmount && (g.noisePositionAmount.value = z.positionAmount),
      g.noiseRotationAmount && (g.noiseRotationAmount.value = z.rotationAmount),
      g.noiseSizeAmount && (g.noiseSizeAmount.value = z.sizeAmount),
      n.fluidSolver)
    ) {
      if (((g.emitCount.value = 0), (m.emitNode.count = 1), g.fluidBoxWidthRatio)) {
        const e =
          'SPH' ===
          String(i.renderer.fluid?.solver ?? '')
            .trim()
            .toUpperCase()
            ? i.renderer.sph?.boxWidthRatio
            : i.renderer.mlsMpm?.boxWidthRatio;
        g.fluidBoxWidthRatio.value =
          ('number' == typeof e && Number.isFinite(e) ? e : n.fluidBoxWidthRatio) ?? 1;
      }
      nr(g, i.renderer.fluid);
    }
    const M = m.emitterPose;
    M &&
      ('WORLD' === i.simulationSpace
        ? (o.updateMatrix(),
          mr.copy(o.matrix),
          o.parent && (o.parent.updateMatrixWorld(), mr.premultiply(o.parent.matrixWorld)),
          mr.decompose(cr, ur, dr),
          M.positionW.value.set(cr.x, cr.y, cr.z, 1),
          M.wrapperQuat.value.set(ur.x, ur.y, ur.z, ur.w),
          M.worldScale.value.set(dr.x || 1, dr.y || 1, dr.z || 1))
        : (M.positionW.value.set(0, 0, 0, 0),
          M.wrapperQuat.value.set(0, 0, 0, 1),
          M.worldScale.value.set(1, 1, 1)));
    const T = (e.frameParity ?? 0) % 2;
    (g.fifoBase && (g.fifoBase.value = T),
      g.nowMs && (g.nowMs.value = t),
      b?.nowMs && (b.nowMs.value = t));
    for (const e of y ?? []) {
      const s = e.pipeline;
      if (!s) continue;
      const n = s.uniforms;
      (n.delta && (n.delta.value = r),
        n.deltaMs && (n.deltaMs.value = 1e3 * r),
        n.nowMs && (n.nowMs.value = t),
        n.gravityVelocity && n.gravityVelocity.value.set(0, e.gravity, 0),
        e.noise &&
          (n.noiseStrength && (n.noiseStrength.value = e.noise.strength),
          n.noisePower && (n.noisePower.value = e.noise.noisePower),
          n.noiseFrequency && (n.noiseFrequency.value = e.noise.frequency),
          n.noisePositionAmount && (n.noisePositionAmount.value = e.noise.positionAmount),
          n.noiseRotationAmount && (n.noiseRotationAmount.value = e.noise.rotationAmount),
          n.noiseSizeAmount && (n.noiseSizeAmount.value = e.noise.sizeAmount)),
        n.fifoBase && (n.fifoBase.value = T),
        e.init.uniforms.fifoBase && (e.init.uniforms.fifoBase.value = T));
      let i = 0;
      e.rate > 0 && ((e.acc += (e.rate * r) / 1), (i = Math.floor(e.acc)), i > 0 && (e.acc -= i));
      const o = Math.max(2, (s.allocatorCount ?? 2) - 1);
      (i > o && (i = o),
        s.emitNode && (s.emitNode.count = Math.max(1, i)),
        n.emitCount && (n.emitCount.value = i));
      const a = s.emitterPose;
      a &&
        (1 === e.isWorld
          ? (a.positionW.value.set(e.position[0], e.position[1], e.position[2], 1),
            a.wrapperQuat.value.set(e.quat[0], e.quat[1], e.quat[2], e.quat[3]),
            a.worldScale.value.set(e.scale[0], e.scale[1], e.scale[2]))
          : (a.positionW.value.set(0, 0, 0, 0),
            a.wrapperQuat.value.set(0, 0, 0, 1),
            a.worldScale.value.set(1, 1, 1)));
      const l = e.init.uniforms;
      l.positionW &&
        l.wrapperQuat &&
        (1 === e.isWorld
          ? (l.positionW.value.set(e.position[0], e.position[1], e.position[2], 1),
            l.wrapperQuat.value.set(e.quat[0], e.quat[1], e.quat[2], e.quat[3]))
          : (l.positionW.value.set(0, 0, 0, 0), l.wrapperQuat.value.set(0, 0, 0, 1)));
    }
    const C = m.forceFieldInfo,
      E = m.collisionPlaneInfo ?? null;
    if ((C || E) && kt) {
      const e = m.buffers.packedData,
        t = m.packedDataNode;
      if (C && u.length > 0) {
        const r = kt.encodeForceFieldsForGPU(u, n.particleSystemId, n.normalizedLifetimePercentage);
        let s = !1;
        for (let t = 0; t < r.length; t++)
          if (e[C.offset + t] !== r[t]) {
            s = !0;
            break;
          }
        (s && (e.set(r, C.offset), t.addUpdateRange(C.offset, r.length), (t.needsUpdate = !0)),
          (C.countUniform.value = u.length));
      }
      if (E && c.length > 0) {
        const r = kt.encodeCollisionPlanesForGPU(c);
        let s = !1;
        for (let t = 0; t < r.length; t++)
          if (e[E.offset + t] !== r[t]) {
            s = !0;
            break;
          }
        (s && (e.set(r, E.offset), t.addUpdateRange(E.offset, r.length), (t.needsUpdate = !0)),
          (E.countUniform.value = c.length));
      }
    }
    const N = m.buffers;
    let F = or.get(N);
    if (void 0 === F || 0 === F) {
      for (const e of Object.keys(N)) {
        const t = N[e];
        t && 'needsUpdate' in t && (t.needsUpdate = !0);
      }
      or.set(N, 1);
    } else or.set(N, F + 1);
    for (const e of y ?? []) {
      const t = e.pipeline?.buffers;
      if (t && !or.has(t)) {
        for (const e of Object.keys(t)) {
          const r = t[e];
          r && 'needsUpdate' in r && (r.needsUpdate = !0);
        }
        or.set(t, 1);
      }
      const r = e.init.commandBuffer;
      r && 'needsUpdate' in r && !ar.has(r) && ((r.needsUpdate = !0), ar.add(r));
    }
    const V = e.ribbonBuffers;
    if (V && !or.has(V)) {
      for (const e of Object.keys(V)) {
        const t = V[e];
        t && 'needsUpdate' in t && (t.needsUpdate = !0);
      }
      or.set(V, 1);
    }
    ((e.computeDispatchReady = !0),
      e.iterationCount++,
      (e.frameParity = 1 ^ (e.frameParity ?? 0)),
      e.trailMesh && Sr(e, t));
  },
  ur = new e.Quaternion(),
  cr = new e.Vector3(),
  dr = new e.Vector3(),
  mr = new e.Matrix4(),
  fr = (e, t, r, s, n, i, o, a, l, u, c, d, m, f, p) => {
    const y = p * p,
      h = y * p;
    ((e[t] =
      0.5 * (2 * i + (-r + l) * p + (2 * r - 5 * i + 4 * l - d) * y + (3 * i - r - 3 * l + d) * h)),
      (e[t + 1] =
        0.5 *
        (2 * o + (-s + u) * p + (2 * s - 5 * o + 4 * u - m) * y + (3 * o - s - 3 * u + m) * h)),
      (e[t + 2] =
        0.5 *
        (2 * a + (-n + c) * p + (2 * n - 5 * a + 4 * c - f) * y + (3 * a - n - 3 * c + f) * h)));
  },
  pr = (e, t, r, s, n, i, o, a, l, u, c, d, m) => {
    ((n[e] = c),
      (n[e + 1] = d),
      (n[e + 2] = m),
      (n[e + 3] = c),
      (n[e + 4] = d),
      (n[e + 5] = m),
      (i[e] = c),
      (i[e + 1] = d),
      (i[e + 2] = m),
      (i[e + 3] = c),
      (i[e + 4] = d),
      (i[e + 5] = m),
      (o[r] = 0),
      (o[r + 1] = 0),
      (a[s] = 0),
      (a[s + 1] = 0),
      (a[s + 2] = 0),
      (a[s + 3] = 0),
      (l[r] = 0),
      (l[r + 1] = 0),
      (u[t] = 0),
      (u[t + 1] = 0),
      (u[t + 2] = 0),
      (u[t + 3] = 0),
      (u[t + 4] = 0),
      (u[t + 5] = 0),
      (u[t + 6] = 0),
      (u[t + 7] = 0));
  },
  yr = (e, t, r, s, n, i, o, a, l, u, c, d, m, f, p, y, h, b, g, x, v, w, P) => {
    ((b[e] = n),
      (b[e + 1] = i),
      (b[e + 2] = o),
      (b[e + 3] = n),
      (b[e + 4] = i),
      (b[e + 5] = o),
      (g[e] = a),
      (g[e + 1] = l),
      (g[e + 2] = u),
      (g[e + 3] = a),
      (g[e + 4] = l),
      (g[e + 5] = u),
      (x[r] = c),
      (x[r + 1] = c),
      (v[s] = 0),
      (v[s + 1] = d),
      (v[s + 2] = 1),
      (v[s + 3] = d),
      (w[r] = m),
      (w[r + 1] = m),
      (P[t] = f),
      (P[t + 1] = p),
      (P[t + 2] = y),
      (P[t + 3] = h),
      (P[t + 4] = f),
      (P[t + 5] = p),
      (P[t + 6] = y),
      (P[t + 7] = h));
  },
  hr = null,
  br = 0,
  gr = null,
  xr = 0,
  vr = null,
  wr = 0,
  Pr = 0,
  Sr = (e, t) => {
    const {
      generalData: r,
      trailPositionAttr: s,
      trailAlphaAttr: n,
      trailColorAttr: i,
      trailNextAttr: o,
      trailHalfWidthAttr: a,
      trailUVAttr: l,
      trailWidthCurveFn: u,
      trailOpacityCurveFn: c,
      trailColorOverTrailFns: d,
      trailConfig: m,
      mappedAttributes: f,
    } = e;
    if (!(
      s &&
      n &&
      i &&
      o &&
      a &&
      l &&
      u &&
      c &&
      m &&
      r.positionHistory &&
      r.positionHistoryIndex &&
      r.positionHistoryCount
    ))
      return;
    const p = m.length,
      y = r.positionHistory,
      h = r.positionHistoryIndex,
      b = r.positionHistoryCount,
      g = r.trailSampleTimes,
      x = r.trailLastSampledPosition,
      v = r.trailPrevNormal,
      w = m.minVertexDistance,
      P = w * w,
      S = m.maxTime,
      A = 1e3 * S,
      z = m.smoothing,
      M = m.smoothingSubdivisions,
      T = m.twistPrevention,
      C = m.ribbonId,
      E = e.scalarArray,
      N = f.position.array,
      F = r.trailPrevFilledCount,
      V = s.array,
      B = n.array,
      I = i.array,
      R = o.array,
      O = l.array,
      L = a.array,
      U = 2 * p,
      D = r.highWaterIndex,
      k = D > 0 ? D : r.creationTimes.length;
    let W = !1;
    const q = void 0 !== C;
    let G = -1;
    if (q) {
      ((!vr || wr < k) && ((vr = new Uint32Array(k)), (wr = k)), (Pr = 0));
      for (let e = 0; e < k; e++) E[e * oe + 0] && (vr[Pr++] = e);
      for (let e = 1; e < Pr; e++) {
        const t = vr[e],
          s = r.creationTimes[t];
        let n = e - 1;
        for (; n >= 0 && r.creationTimes[vr[n]] > s;) ((vr[n + 1] = vr[n]), n--);
        vr[n + 1] = t;
      }
      Pr > 0 && (G = vr[0]);
    }
    for (let e = 0; e < k; e++) {
      const r = e * U;
      if (E[e * oe + 0]) {
        if (q && Pr >= 2 && e !== G) {
          const r = 3 * e,
            s = N[r],
            n = N[r + 1],
            i = N[r + 2],
            o = 3 * (e * p + h[e]);
          ((y[o] = s),
            (y[o + 1] = n),
            (y[o + 2] = i),
            g && (g[e * p + h[e]] = t),
            (h[e] = (h[e] + 1) % p),
            b[e] < p && b[e]++);
          continue;
        }
        W = !0;
        const s = 3 * e,
          n = N[s],
          i = N[s + 1],
          o = N[s + 2];
        let a = !0;
        if (w > 0 && x && b[e] > 0) {
          const t = 3 * e,
            r = n - x[t],
            s = i - x[t + 1],
            l = o - x[t + 2];
          r * r + s * s + l * l < P && (a = !1);
        }
        if (a) {
          const r = 3 * (e * p + h[e]);
          if (
            ((y[r] = n),
            (y[r + 1] = i),
            (y[r + 2] = o),
            g && (g[e * p + h[e]] = t),
            (h[e] = (h[e] + 1) % p),
            b[e] < p && b[e]++,
            x)
          ) {
            const t = 3 * e;
            ((x[t] = n), (x[t + 1] = i), (x[t + 2] = o));
          }
        }
        let l = b[e],
          f = l;
        if (S > 0 && g && l > 0) {
          const r = e * p;
          f = 0;
          for (let s = 0; s < l; s++) {
            if (!(t - g[r + ((h[e] - 1 - s + 2 * p) % p)] <= A)) break;
            f++;
          }
        }
        const C = f,
          U = m.width,
          D = e * oe,
          k = E[D + 6],
          $ = E[D + 7],
          j = E[D + 8],
          H = E[D + 9],
          Q = e * p * 3,
          Z = 3 * C;
        (!hr || br < Z) && ((hr = new Float32Array(Z)), (br = Z));
        const K = hr;
        for (let t = 0; t < C; t++) {
          const r = ((h[e] - 1 - t + 2 * p) % p) * 3 + Q;
          ((K[3 * t] = y[r]), (K[3 * t + 1] = y[r + 1]), (K[3 * t + 2] = y[r + 2]));
        }
        let _, X;
        if (z && C >= 3) {
          const e = C - 1;
          X = e * M + 1;
          const t = 3 * X;
          ((!gr || xr < t) && ((gr = new Float32Array(t)), (xr = t)), (_ = gr));
          for (let t = 0; t < e; t++) {
            const e = Math.max(0, t - 1),
              r = t,
              s = Math.min(C - 1, t + 1),
              n = Math.min(C - 1, t + 2),
              i = K[3 * e],
              o = K[3 * e + 1],
              a = K[3 * e + 2],
              l = K[3 * r],
              u = K[3 * r + 1],
              c = K[3 * r + 2],
              d = K[3 * s],
              m = K[3 * s + 1],
              f = K[3 * s + 2],
              p = K[3 * n],
              y = K[3 * n + 1],
              h = K[3 * n + 2];
            for (let e = 0; e < M; e++) {
              fr(_, 3 * (t * M + e), i, o, a, l, u, c, d, m, f, p, y, h, e / M);
            }
          }
          const r = 3 * (X - 1);
          ((_[r] = K[3 * (C - 1)]),
            (_[r + 1] = K[3 * (C - 1) + 1]),
            (_[r + 2] = K[3 * (C - 1) + 2]));
        } else ((_ = K), (X = C));
        if ((X > p && (X = p), z && X >= 2)) {
          const e = 1e-8;
          for (let t = 1; t < X; t++) {
            const r = 3 * (t - 1),
              s = 3 * t,
              n = _[s] - _[r],
              i = _[s + 1] - _[r + 1],
              o = _[s + 2] - _[r + 2];
            n * n + i * i + o * o < e &&
              ((_[s] = _[r]), (_[s + 1] = _[r + 1]), (_[s + 2] = _[r + 2]));
          }
        }
        const Y = F ? F[e] : p;
        F && (F[e] = X);
        for (let s = 0; s < p; s++) {
          const a = 3 * (r + 2 * s),
            m = 4 * (r + 2 * s),
            y = r + 2 * s,
            b = 2 * (r + 2 * s);
          if (s >= X) {
            if (s >= Y) break;
            pr(a, m, y, b, V, R, L, O, B, I, n, i, o);
            continue;
          }
          const x = _[3 * s],
            v = _[3 * s + 1],
            w = _[3 * s + 2];
          let P, M, T;
          if (s > 0 && s < X - 1) {
            const e = _[3 * (s - 1)],
              t = _[3 * (s - 1) + 1],
              r = _[3 * (s - 1) + 2],
              n = _[3 * (s + 1)] - e,
              i = _[3 * (s + 1) + 1] - t,
              o = _[3 * (s + 1) + 2] - r,
              a = Math.sqrt(n * n + i * i + o * o);
            a > 1e-4
              ? ((P = x + n / a), (M = v + i / a), (T = w + o / a))
              : ((P = _[3 * (s + 1)]), (M = _[3 * (s + 1) + 1]), (T = _[3 * (s + 1) + 2]));
          } else if (s < X - 1)
            ((P = _[3 * (s + 1)]), (M = _[3 * (s + 1) + 1]), (T = _[3 * (s + 1) + 2]));
          else if (X >= 2) {
            ((P = x + (x - _[3 * (s - 1)])),
              (M = v + (v - _[3 * (s - 1) + 1])),
              (T = w + (w - _[3 * (s - 1) + 2])));
          } else ((P = x), (M = v + 0.001), (T = w));
          const C = X > 1 ? s / (X - 1) : 0;
          let E = 1;
          if (S > 0 && g && f > 0) {
            const r = e * p;
            if (z && l >= 2) {
              const n = (s / Math.max(X - 1, 1)) * (l - 1),
                i = Math.min(Math.floor(n), l - 1),
                o = Math.min(i + 1, l - 1),
                a = n - i,
                u = (h[e] - 1 - i + 2 * p) % p,
                c = (h[e] - 1 - o + 2 * p) % p,
                d = t - g[r + u],
                m = d + (t - g[r + c] - d) * a;
              E = 1 - Math.min(m / A, 1);
            } else {
              const n = Math.min(s, l - 1),
                i = t - g[r + ((h[e] - 1 - n + 2 * p) % p)];
              E = 1 - Math.min(i / A, 1);
            }
          }
          const N = U * u(C) * 0.5,
            F = H * c(C) * E,
            D = d ? k * d.r(C) : k,
            W = d ? $ * d.g(C) : $,
            q = d ? j * d.b(C) : j;
          yr(a, m, y, b, x, v, w, P, M, T, N, C, F, D, W, q, H, V, R, L, O, B, I);
        }
        if (T && v && X >= 2) {
          const t = 3 * e,
            s = _[3] - _[0],
            n = _[4] - _[1],
            i = _[5] - _[2],
            o = Math.sqrt(s * s + n * n + i * i);
          if (o > 1e-4) {
            const e = s / o,
              a = n / o,
              l = i / o;
            let u = 0,
              c = 1,
              d = 0;
            const m = e * u + a * c + l * d;
            Math.abs(m) > 0.999 && ((u = 1), (c = 0), (d = 0));
            let f = a * d - l * c,
              y = l * u - e * d,
              h = e * c - a * u;
            const b = Math.sqrt(f * f + y * y + h * h);
            b > 1e-4 && ((f /= b), (y /= b), (h /= b));
            const g = v[t],
              x = v[t + 1],
              w = v[t + 2];
            if (0 !== g || 0 !== x || 0 !== w) {
              if (f * g + y * x + h * w < 0) {
                for (let e = 0; e < Math.min(X, p); e++) {
                  const t = r + 2 * e,
                    s = L[t];
                  ((L[t] = -s), (L[t + 1] = -s));
                }
                ((f = -f), (y = -y), (h = -h));
              }
            }
            ((v[t] = f), (v[t + 1] = y), (v[t + 2] = h));
          }
        }
      } else if (b[e] > 0 || (F && F[e] > 0)) {
        ((W = !0), (b[e] = 0), (h[e] = 0));
        const t = F ? F[e] : p;
        F && (F[e] = 0);
        for (let e = 0; e < t; e++) {
          pr(
            3 * (r + 2 * e),
            4 * (r + 2 * e),
            r + 2 * e,
            2 * (r + 2 * e),
            V,
            R,
            L,
            O,
            B,
            I,
            0,
            0,
            0
          );
        }
      }
    }
    if (q && Pr >= 2 && vr) {
      W = !0;
      const e = vr[0],
        s = e * U,
        n = Pr,
        i = Math.min(p, Math.max(4 * n, n)),
        o = 3 * i;
      if (((!hr || br < o) && ((hr = new Float32Array(o)), (br = o)), 2 === n)) {
        const e = 3 * vr[0],
          t = 3 * vr[1];
        for (let r = 0; r < i; r++) {
          const s = r / (i - 1);
          ((hr[3 * r] = N[e] + s * (N[t] - N[e])),
            (hr[3 * r + 1] = N[e + 1] + s * (N[t + 1] - N[e + 1])),
            (hr[3 * r + 2] = N[e + 2] + s * (N[t + 2] - N[e + 2])));
        }
      } else {
        const e = n - 1,
          t = Math.max(1, Math.floor((i - 1) / e));
        let r = 0;
        for (let s = 0; s < e && r < i; s++) {
          const o = Math.max(0, s - 1),
            a = s,
            l = Math.min(n - 1, s + 1),
            u = Math.min(n - 1, s + 2),
            c = 3 * vr[o],
            d = 3 * vr[a],
            m = 3 * vr[l],
            f = 3 * vr[u],
            p = s === e - 1 ? i - r : t;
          for (let e = 0; e < p && r < i; e++) {
            const t = e / p;
            (fr(
              hr,
              3 * r,
              N[c],
              N[c + 1],
              N[c + 2],
              N[d],
              N[d + 1],
              N[d + 2],
              N[m],
              N[m + 1],
              N[m + 2],
              N[f],
              N[f + 1],
              N[f + 2],
              t
            ),
              r++);
          }
        }
        if (r > 0) {
          const e = 3 * vr[n - 1];
          ((hr[3 * (r - 1)] = N[e]),
            (hr[3 * (r - 1) + 1] = N[e + 1]),
            (hr[3 * (r - 1) + 2] = N[e + 2]));
        }
      }
      const a = e * oe,
        l = E[a + 6],
        f = E[a + 7],
        y = E[a + 8],
        h = E[a + 9],
        b = F ? F[e] : p;
      F && (F[e] = i);
      for (let e = 0; e < p; e++) {
        const o = 3 * (s + 2 * e),
          a = 4 * (s + 2 * e),
          p = s + 2 * e,
          g = 2 * (s + 2 * e);
        if (e >= i) {
          if (e >= b) break;
          pr(o, a, p, g, V, R, L, O, B, I, 0, 0, 0);
          continue;
        }
        const x = 3 * e,
          v = hr[x],
          w = hr[x + 1],
          P = hr[x + 2];
        let z, M, T;
        if (e > 0 && e < i - 1) {
          const t = hr[3 * (e - 1)],
            r = hr[3 * (e - 1) + 1],
            s = hr[3 * (e - 1) + 2],
            n = hr[3 * (e + 1)] - t,
            i = hr[3 * (e + 1) + 1] - r,
            o = hr[3 * (e + 1) + 2] - s,
            a = Math.sqrt(n * n + i * i + o * o);
          a > 1e-4
            ? ((z = v + n / a), (M = w + i / a), (T = P + o / a))
            : ((z = hr[3 * (e + 1)]), (M = hr[3 * (e + 1) + 1]), (T = hr[3 * (e + 1) + 2]));
        } else if (e < i - 1)
          ((z = hr[3 * (e + 1)]), (M = hr[3 * (e + 1) + 1]), (T = hr[3 * (e + 1) + 2]));
        else if (i >= 2) {
          ((z = v + (v - hr[3 * (e - 1)])),
            (M = w + (w - hr[3 * (e - 1) + 1])),
            (T = P + (P - hr[3 * (e - 1) + 2])));
        } else ((z = v), (M = w + 0.001), (T = P));
        const C = i > 1 ? e / (i - 1) : 0;
        let E = 1;
        if (S > 0 && n >= 2) {
          const e = C * (n - 1),
            s = Math.min(Math.floor(e), n - 1),
            i = Math.min(s + 1, n - 1),
            o = e - s,
            a = t - r.creationTimes[vr[s]],
            l = a + (t - r.creationTimes[vr[i]] - a) * o;
          E = 1 - Math.min(l / A, 1);
        }
        const N = u(C),
          F = c(C),
          U = m.width * N * 0.5,
          D = h * F * E,
          k = d ? l * d.r(C) : l,
          W = d ? f * d.g(C) : f,
          q = d ? y * d.b(C) : y;
        yr(o, a, p, g, v, w, P, z, M, T, U, C, D, k, W, q, h, V, R, L, O, B, I);
      }
      if (T && v && i >= 2) {
        const t = 3 * e,
          r = hr[3] - hr[0],
          n = hr[4] - hr[1],
          o = hr[5] - hr[2],
          a = Math.sqrt(r * r + n * n + o * o);
        if (a > 1e-4) {
          const e = r / a,
            l = n / a,
            u = o / a;
          let c = 0,
            d = 1,
            m = 0;
          const f = e * c + l * d + u * m;
          Math.abs(f) > 0.999 && ((c = 1), (d = 0), (m = 0));
          let y = l * m - u * d,
            h = u * c - e * m,
            b = e * d - l * c;
          const g = Math.sqrt(y * y + h * h + b * b);
          g > 1e-4 && ((y /= g), (h /= g), (b /= g));
          const x = v[t],
            w = v[t + 1],
            P = v[t + 2];
          if (0 !== x || 0 !== w || 0 !== P) {
            if (y * x + h * w + b * P < 0) {
              for (let e = 0; e < Math.min(i, p); e++) {
                const t = s + 2 * e,
                  r = L[t];
                ((L[t] = -r), (L[t + 1] = -r));
              }
              ((y = -y), (h = -h), (b = -b));
            }
          }
          ((v[t] = y), (v[t + 1] = h), (v[t + 2] = b));
        }
      }
      for (let e = 1; e < Pr; e++) {
        const t = vr[e],
          r = t * U,
          s = F ? F[t] : p;
        F && (F[t] = 0);
        for (let e = 0; e < s; e++) {
          pr(
            3 * (r + 2 * e),
            4 * (r + 2 * e),
            r + 2 * e,
            2 * (r + 2 * e),
            V,
            R,
            L,
            O,
            B,
            I,
            0,
            0,
            0
          );
        }
      }
    }
    W &&
      ((s.needsUpdate = !0),
      (n.needsUpdate = !0),
      (i.needsUpdate = !0),
      (o.needsUpdate = !0),
      (a.needsUpdate = !0),
      (l.needsUpdate = !0));
  },
  Ar = (e) => {
    Dt.forEach((t) => lr(t, e));
  };
export {
  Me as CollisionPlaneMode,
  xe as EmitFrom,
  ze as ForceFieldFalloff,
  Se as ForceFieldType,
  we as LifeTimeCurve,
  Ae as RendererType,
  oe as SCALAR_STRIDE,
  he as S_COLOR_A,
  ye as S_COLOR_B,
  pe as S_COLOR_G,
  fe as S_COLOR_R,
  ae as S_IS_ACTIVE,
  le as S_LIFETIME,
  me as S_ROTATION,
  de as S_SIZE,
  ce as S_START_FRAME,
  ue as S_START_LIFETIME,
  ge as Shape,
  Te as SimulationBackend,
  be as SimulationSpace,
  Pe as SubEmitterTrigger,
  ve as TimeMode,
  Q as __commonJS,
  Z as __toESM,
  jt as assertNamed,
  Xt as blendingMap,
  Ve as calculateRandomPositionAndVelocityOnBox,
  Be as calculateRandomPositionAndVelocityOnCircle,
  Fe as calculateRandomPositionAndVelocityOnCone,
  Ie as calculateRandomPositionAndVelocityOnRectangle,
  Ne as calculateRandomPositionAndVelocityOnSphere,
  De as calculateValue,
  se as createBezierCurveFunction,
  Re as createDefaultMeshTexture,
  Oe as createDefaultParticleTexture,
  ir as createParticleSystem,
  ie as getBezierCacheSize,
  Ue as getCurveFunctionFromConfig,
  Jt as getDefaultParticleSystemConfig,
  Ce as isComputeCapableRenderer,
  Le as isLifeTimeCurve,
  We as linearToSRGB,
  Kt as normalizeBackgroundToVector3,
  Zt as normalizeDepthTextureValue,
  Qt as normalizeTextureValue,
  Ht as normalizeVector2Value,
  sr as prefillFluidState,
  Gt as registerTSLMaterialFactory,
  ne as removeBezierCurveFunction,
  Ee as resolveSimulationBackend,
  Lt as resolveWebGPUEffectiveRendererType,
  qe as rgbSRGBToLinear,
  ke as sRGBToLinear,
  Ar as updateParticleSystems,
  nr as writeFluidDomainUniforms,
}; //# sourceMappingURL=chunk-544SV2RI.js.map
