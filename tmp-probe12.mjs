import { register } from 'node:module';
register('./tmp-loader.mjs', import.meta.url);
const THREE = await import('three/webgpu');
const TSL = await import('three/tsl');
const { WGSLNodeBuilder, StorageInstancedBufferAttribute } = THREE;
const lib = await import('@cyberluke/three-particles/webgpu');
const eng = await import('@cyberluke/three-particles');
console.log("identity: TSL.Fn vs three/webgpu TSL:", TSL.Fn === THREE.TSL?.Fn, "| lib material fn ok:", typeof lib.createTSLParticleMaterial);
const stub = { isNodeManager: true, contextNode: TSL.context(), library: { fromMaterial: (m) => m }, constants: [], debug: { diagnostics: { keywords: [] }, onNodeBuilderCreated: null }, backend: { isBackend: true, utils: { getTextureSampleData: () => ({ primarySamples: 1, imageSampleCount: 1 }) } }, hasFeature: () => true, getRenderTargetTarget: () => ({}), getRenderTarget: () => null, xr: { enabled: false }, lighting: { enabled: false }, info: { render: {} } };
const tex = new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1); tex.needsUpdate = true;
const shared = { elapsed:{value:0}, viewportHeight:{value:720}, cameraNearFar:{value:new THREE.Vector2(0.1,1000)}, map:{value:tex}, fps:{value:30}, useFPSForFrameIndex:{value:true}, tiles:{value:new THREE.Vector2(4,4)}, discardBackgroundColor:{value:true}, backgroundColor:{value:new THREE.Color(0,0,0)}, backgroundColorTolerance:{value:0.1}, softParticlesEnabled:{value:false}, softParticlesIntensity:{value:1}, sceneDepthTexture:{value:null} };
const oe = console.error;
for (const type of ["INSTANCED","MESH","POINTS"]) {
  const N = 8;
  const gi = type === "POINTS" ? new THREE.BufferGeometry() : new THREE.InstancedBufferGeometry();
  gi.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),3));
  if (type === "MESH") { gi.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,0,1,0,1,1,0,1]),2)); gi.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0,0,1,0,0,1,0,0,1,0,0,1]),3)); }
  let n;
  if (type === "POINTS") { gi.setDrawRange(0, 8); n = 8;
    gi.setAttribute('position', new THREE.StorageBufferAttribute(new Float32Array(32).fill(0.5), 4));
    ["color","particleState","startValues"].forEach(k=>gi.setAttribute(k,new THREE.StorageBufferAttribute(new Float32Array(N*4).fill(1),4)));
  } else {
    gi.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2,0,2,3]),1)); gi.instanceCount = 8;
    ["instanceOffset","instanceColor","instanceParticleState","instanceStartValues"].forEach(k=>gi.setAttribute(k,new StorageInstancedBufferAttribute(new Float32Array(N*4).fill(1),4)));
  }
  const material = lib.createTSLParticleMaterial(type, shared, { transparent:true, blending:2, depthTest:true, depthWrite:false }, true);
  const obj = type === "POINTS" ? new THREE.Points(gi, material) : new THREE.Mesh(gi, material);
  const msgs = []; let nErr = 0; console.error = (...a)=>{ nErr++; msgs.push(String(a[0]).split("\n")[0]); };
  const b = new WGSLNodeBuilder(obj, stub); b.object=obj; b.material=material; b.geometry=gi; b.scene=new THREE.Scene(); b.camera=new THREE.PerspectiveCamera(60,1,.1,1000);
  b.build();
  console.error = oe;
  oe(`${type}: errors=${nErr} v=${String(b.vertexShader||"").length} f=${String(b.fragmentShader||"").length}`);
  msgs.slice(0,3).forEach(m=>oe("   ",m));
}