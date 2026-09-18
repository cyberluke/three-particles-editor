import * as THREE from "three";
import { WGSLNodeBuilder, StorageBufferAttribute, StorageInstancedBufferAttribute } from "three/webgpu";
import { context } from "three/tsl";
import { createTSLParticleMaterial, createComputePipeline } from "./public/lib/three-particles-webgpu.esm.js";
import { getDefaultParticleSystemConfig } from "./public/lib/three-particles.esm.js";

const issues = [];
const origErr = console.error, origWarn = console.warn;
const cap = (dst) => (...a) => { dst.push(a.map((x) => (x && x.isStackTrace ? JSON.stringify(x) : String(x))).join(" ")); };

const stub = { isNodeManager: true, contextNode: context(), library: { fromMaterial: (m) => m }, constants: [], debug: { diagnostics: { keywords: [] }, onNodeBuilderCreated: null }, backend: { isBackend: true, utils: { getTextureSampleData: () => ({ primarySamples: 1, imageSampleCount: 1 }) } }, hasFeature: () => true, getRenderTargetTarget: () => ({}), getRenderTarget: () => null, xr: { enabled: false }, lighting: { enabled: false }, info: { render: {} } };
const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); tex.needsUpdate = true;
const shared = () => ({ elapsed: { value: 0 }, viewportHeight: { value: 720 }, cameraNearFar: { value: new THREE.Vector2(0.1, 1000) }, map: { value: tex }, fps: { value: 30 }, useFPSForFrameIndex: { value: true }, tiles: { value: new THREE.Vector2(4, 4) }, discardBackgroundColor: { value: true }, backgroundColor: { value: new THREE.Color(0, 0, 0) }, backgroundColorTolerance: { value: 0.1 }, softParticlesEnabled: { value: false }, softParticlesIntensity: { value: 1 }, sceneDepthTexture: { value: null } });
const N = 8, f4 = () => new Float32Array(N * 4).fill(1);

function quad(uvN) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-.5,-.5,0, .5,-.5,0, .5,.5,0, -.5,.5,0]),3)); if (uvN) { g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0,0,1,0,1,1,0,1]),2)); g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array([0,0,1,0,0,1,0,0,1,0,0,1]),3)); } g.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2,0,2,3]),1)); return g; }

function mat(label, type, geom, cfgExtra) {
  const errs = [], warns = []; console.error = cap(errs); console.warn = cap(warns);
  const material = createTSLParticleMaterial(type, { ...shared(), ...(cfgExtra || {}) }, { transparent: true, blending: 2, depthTest: true, depthWrite: false }, true);
  const obj = type === "POINTS" ? new THREE.Points(geom, material) : new THREE.Mesh(geom, material);
  const b = new WGSLNodeBuilder(obj, stub); b.object = obj; b.material = material; b.geometry = geom; b.scene = new THREE.Scene(); b.camera = new THREE.PerspectiveCamera(60, 1, .1, 1000);
  b.build();
  console.error = origErr; console.warn = origWarn;
  origLog(`${label}: v=${String(b.vertexShader || "").length} f=${String(b.fragmentShader || "").length} errors=${errs.length} warns=${warns.length}`);
  errs.forEach((e, k) => origLog(`   E${k}: ${e}`)); warns.forEach((e, k) => origLog(`   W${k}: ${e}`));
}
const origLog = (...a) => origErr.call(console, ...a);
// use plain log ordering
const L = (...a) => origErr.apply(console, a);

const gi = new THREE.InstancedBufferGeometry(); const q1 = quad(false);
gi.setAttribute("position", q1.getAttribute("position")); gi.setIndex(q1.getIndex()); gi.instanceCount = N;
["instanceOffset","instanceColor","instanceParticleState","instanceStartValues"].forEach((n) => gi.setAttribute(n, new StorageInstancedBufferAttribute(f4(), 4)));

const gm = new THREE.InstancedBufferGeometry(); const q2 = quad(true);
gm.setAttribute("position", q2.getAttribute("position")); gm.setAttribute("uv", q2.getAttribute("uv")); gm.setAttribute("normal", q2.getAttribute("normal")); gm.setIndex(q2.getIndex()); gm.instanceCount = N;
["instanceOffset","instanceColor","instanceParticleState","instanceStartValues"].forEach((n) => gm.setAttribute(n, new StorageInstancedBufferAttribute(f4(), 4)));

const gp = new THREE.BufferGeometry();
gp.setAttribute("position", new StorageBufferAttribute(new Float32Array(8 * 4).fill(0.5), 4));
["color","particleState","startValues"].forEach((n) => gp.setAttribute(n, new StorageBufferAttribute(f4(), 4)));
gp.setDrawRange(0, 8);
const ns = await import("./public/lib/three-particles.esm.js");
L("engine exports:", Object.keys(ns).join(","));
const getCfg = ns.getDefaultParticleSystemConfig;

const errsA = [], warnsA = []; console.error = cap(errsA); console.warn = cap(warnsA);
const cfg = getCfg(); cfg.noise.isActive = true; cfg.noise.useRandomOffset = true;
const p = createComputePipeline(65536, true, cfg, 3, 0, 0);
const build = (n) => { const b = new WGSLNodeBuilder(null, stub); b.compute = n; b.build(); return String(b.computeShader); };
const emit = build(p.computeNodes ? p.computeNodes[0] : p.computeNode);
const sim = build(p.computeNodes ? p.computeNodes[1] : p.computeNode);
console.error = origErr; console.warn = origWarn;
L(`compute: emit=${emit.length}B sim=${sim.length}B errors=${errsA.length} warns=${warnsA.length}`);
errsA.forEach((e,k)=>L(`   CE${k}: ${e}`)); warnsA.forEach((e,k)=>L(`   CW${k}: ${e}`));

mat("INSTANCED", "INSTANCED", gi, { softParticlesEnabled: false });
mat("MESH", "MESH", gm, {});
await new Promise(r => setTimeout(r, 0)).then(()=>{});
mat("POINTS", "POINTS", gp, {});

import { inspect } from "node:util";
const raw = console.error;
console.error = (...a) => { raw("FULL:", inspect(a, { depth: 8, compact: false })); };
const errsB = []; 
// rebuild INSTANCED with full capture
const gi2 = new THREE.InstancedBufferGeometry(); const q3 = quad(false);
gi2.setAttribute("position", q3.getAttribute("position")); gi2.setIndex(q3.getIndex()); gi2.instanceCount = 8;
["instanceOffset","instanceColor","instanceParticleState","instanceStartValues"].forEach((n) => gi2.setAttribute(n, new StorageInstancedBufferAttribute(new Float32Array(32).fill(1), 4)));
const m2 = createTSLParticleMaterial("INSTANCED", shared(), { transparent: true, blending: 2, depthTest: true, depthWrite: false }, true);
const o2 = new THREE.Mesh(gi2, m2);
const b2 = new WGSLNodeBuilder(o2, stub); b2.object = o2; b2.material = m2; b2.geometry = gi2; b2.scene = new THREE.Scene(); b2.camera = new THREE.PerspectiveCamera(60,1,.1,1000);
console.error = (...a) => { raw("FULL:", inspect(a, { depth: 8, compact: false })); };
b2.build();
console.error = raw;
