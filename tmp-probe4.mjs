import * as THREE from "three";
import { WGSLNodeBuilder, StorageInstancedBufferAttribute, StorageBufferAttribute } from "three/webgpu";
import { context } from "three/tsl";
import { createTSLParticleMaterial } from "./public/lib/three-particles-webgpu.esm.js";
const stub = { isNodeManager: true, contextNode: context(), library: { fromMaterial: (m) => m }, constants: [], debug: { diagnostics: { keywords: [] }, onNodeBuilderCreated: null }, backend: { isBackend: true, utils: { getTextureSampleData: () => ({ primarySamples: 1, imageSampleCount: 1 }) } }, hasFeature: () => true, getRenderTargetTarget: () => ({}), getRenderTarget: () => null, xr: { enabled: false }, lighting: { enabled: false }, info: { render: {} } };
const tex = new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1); tex.needsUpdate = true;
const shared = { elapsed:{value:0}, viewportHeight:{value:720}, cameraNearFar:{value:new THREE.Vector2(0.1,1000)}, map:{value:tex}, fps:{value:30}, useFPSForFrameIndex:{value:true}, tiles:{value:new THREE.Vector2(4,4)}, discardBackgroundColor:{value:true}, backgroundColor:{value:new THREE.Color(0,0,0)}, backgroundColorTolerance:{value:0.1}, softParticlesEnabled:{value:false}, softParticlesIntensity:{value:1}, sceneDepthTexture:{value:null} };
function mk(type) {
  const N = 8;
  const gi = type === "POINTS" ? new THREE.BufferGeometry() : new THREE.InstancedBufferGeometry();
  gi.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),3));
  if (type === "MESH") { gi.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,0,1,0,1,1,0,1]),2)); gi.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0,0,1,0,0,1,0,0,1,0,0,1]),3)); }
  if (type === "POINTS") gi.setDrawRange(0, 8); else { gi.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2,0,2,3]),1)); gi.instanceCount = N; }

  return { gi, type };
}

function attrs(gi, type, N) {
  if (type === "POINTS") {
    gi.setAttribute('position', new StorageBufferAttribute(new Float32Array(32).fill(0.5), 4));
    ["color","particleState","startValues"].forEach(n => gi.setAttribute(n, new StorageBufferAttribute(new Float32Array(N*4).fill(1),4)));
  } else {
    ["instanceOffset","instanceColor","instanceParticleState","instanceStartValues"].forEach(n => gi.setAttribute(n, new StorageInstancedBufferAttribute(new Float32Array(N*4).fill(1),4)));
  }
}
const oe = console.error;
let msgs = [];
function cap(){ msgs=[]; console.error=(...a)=>msgs.push(String(a[0])); }
function stop(){ console.error=oe; return msgs.length; }
for (const type of ["POINTS","INSTANCED","MESH"]) {
  const N = 8; const { gi } = mk(type); attrs(gi, type, N);
  const material = createTSLParticleMaterial(type, shared, { transparent:true, blending:2, depthTest:true, depthWrite:false }, true);
  const obj = type === "POINTS" ? new THREE.Points(gi, material) : new THREE.Mesh(gi, material);
  const b = new WGSLNodeBuilder(obj, stub); b.object=obj; b.material=material; b.geometry=gi; b.scene=new THREE.Scene(); b.camera=new THREE.PerspectiveCamera(60,1,.1,1000);
  cap(); b.prebuild(); const nPre = stop();
  cap(); b.build(); const nBuild = stop();
  oe(`${type}: prebuild=${nPre} build=${nBuild}`);
}