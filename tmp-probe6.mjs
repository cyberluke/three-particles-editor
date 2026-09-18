import * as THREE from "three";
import { WGSLNodeBuilder, StorageInstancedBufferAttribute } from "three/webgpu";
import { context } from "three/tsl";
import { createTSLParticleMaterial } from "./public/lib/three-particles-webgpu.esm.js";
const stub = { isNodeManager: true, contextNode: context(), library: { fromMaterial: (m) => m }, constants: [], debug: { diagnostics: { keywords: [] }, onNodeBuilderCreated: null }, backend: { isBackend: true, utils: { getTextureSampleData: () => ({ primarySamples: 1, imageSampleCount: 1 }) } }, hasFeature: () => true, getRenderTargetTarget: () => ({}), getRenderTarget: () => null, xr: { enabled: false }, lighting: { enabled: false }, info: { render: {} } };
const tex = new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1); tex.needsUpdate = true;
function base() { return { elapsed:{value:0}, viewportHeight:{value:720}, cameraNearFar:{value:new THREE.Vector2(0.1,1000)}, map:{value:tex}, fps:{value:30}, useFPSForFrameIndex:{value:true}, tiles:{value:new THREE.Vector2(4,4)}, discardBackgroundColor:{value:true}, backgroundColor:{value:new THREE.Color(0,0,0)}, backgroundColorTolerance:{value:0.1}, softParticlesEnabled:{value:false}, softParticlesIntensity:{value:1}, sceneDepthTexture:{value:null} }; }
const oe = console.error;
function run(label, type, over) {
  const N=8;
  const shared = Object.assign(base(), over || {});
  let gi;
  if (type === "POINTS") { gi = new THREE.BufferGeometry(); gi.setAttribute('position', new (await0()) ); }
  return null;
}
// sequential builder per variant
const variants = [
  ["default", "INSTANCED", {}],
  ["soft on", "INSTANCED", { softParticlesEnabled: { value: true } }],
  ["no bg discard", "INSTANCED", { discardBackgroundColor: { value: false } }],
  ["no map (null)", "INSTANCED", { map: { value: null } }],
  ["tiles 1x1", "INSTANCED", { tiles: { value: new THREE.Vector2(1,1) } }],
];
for (const [label, type, over] of variants) {
  const N = 8;
  const shared = Object.assign(base(), over);
  const gi = new THREE.InstancedBufferGeometry();
  gi.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),3));
  gi.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2,0,2,3]),1));
  gi.instanceCount = N;
  ["instanceOffset","instanceColor","instanceParticleState","instanceStartValues"].forEach(n=>gi.setAttribute(n,new StorageInstancedBufferAttribute(new Float32Array(N*4).fill(1),4)));
  const material = createTSLParticleMaterial(type, shared, { transparent:true, blending:2, depthTest:true, depthWrite:false }, true);
  const obj = new THREE.Mesh(gi, material);
  let nErr = 0; console.error = () => { nErr++; };
  const b = new WGSLNodeBuilder(obj, stub); b.object=obj; b.material=material; b.geometry=gi; b.scene=new THREE.Scene(); b.camera=new THREE.PerspectiveCamera(60,1,.1,1000);
  b.build();
  console.error = oe;
  oe(`${label.padEnd(16)} errors=${nErr} v=${String(b.vertexShader||"").length} f=${String(b.fragmentShader||"").length}`);
}