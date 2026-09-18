import * as THREE from "three";
import { WGSLNodeBuilder, StorageInstancedBufferAttribute, MeshBasicNodeMaterial } from "three/webgpu";
import { context } from "three/tsl";
import { createTSLParticleMaterial } from "./public/lib/three-particles-webgpu.esm.js";
const stub = { isNodeManager: true, contextNode: context(), library: { fromMaterial: (m) => m }, constants: [], debug: { diagnostics: { keywords: [] }, onNodeBuilderCreated: null }, backend: { isBackend: true, utils: { getTextureSampleData: () => ({ primarySamples: 1, imageSampleCount: 1 }) } }, hasFeature: () => true, getRenderTargetTarget: () => ({}), getRenderTarget: () => null, xr: { enabled: false }, lighting: { enabled: false }, info: { render: {} } };
const tex = new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1); tex.needsUpdate = true;
const shared = { elapsed:{value:0}, viewportHeight:{value:720}, cameraNearFar:{value:new THREE.Vector2(0.1,1000)}, map:{value:tex}, fps:{value:30}, useFPSForFrameIndex:{value:true}, tiles:{value:new THREE.Vector2(4,4)}, discardBackgroundColor:{value:true}, backgroundColor:{value:new THREE.Color(0,0,0)}, backgroundColorTolerance:{value:0.1}, softParticlesEnabled:{value:false}, softParticlesIntensity:{value:1}, sceneDepthTexture:{value:null} };
const N=8;
const gi = new THREE.InstancedBufferGeometry();
gi.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),3));
gi.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2,0,2,3]),1));
gi.instanceCount = N;
["instanceOffset","instanceColor","instanceParticleState","instanceStartValues"].forEach(n=>gi.setAttribute(n,new StorageInstancedBufferAttribute(new Float32Array(N*4).fill(1),4)));
const material = createTSLParticleMaterial("INSTANCED", shared, { transparent:true, blending:2, depthTest:true, depthWrite:false }, true);
const oe = console.error;
const seen = new Set();
function dump(n, d = 0, tag = "") {
  if (n === null || n === undefined || typeof n !== "object" || seen.has(n) || d > 4) return `${"  ".repeat(d)}${tag}=${JSON.stringify(n)}`;
  seen.add(n);
  const cn = n.constructor?.name || "?";
  const extra = n.isStackNode ? "(stack)" : n.isFn ? "(fn)" : n.isCallNode ? "(call)" : n.isPropertyNode ? "(prop:"+n.name+")" : "";
  const props = ["node","callNode","fnNode","targetNode","sourceNode","ifNode","elseNode","condNode","outputNode","jsFunc","shaderNode"]
    .filter(k => n[k] !== undefined);
  let s = `${"  ".repeat(d)}${tag}${cn}${extra}\n`;
  for (const k of props) s += dump(n[k], d + 1, k + ": ");
  return s;
}
oe("colorNode: \n" + dump(material.colorNode, 0, ""));
oe("vertexNode: \n" + dump(material.vertexNode, 0, ""));
const obj = new THREE.Mesh(gi, material);
let nErr = 0; console.error = () => { nErr++; };
const b = new WGSLNodeBuilder(obj, stub); b.object=obj; b.material=material; b.geometry=gi; b.scene=new THREE.Scene(); b.camera=new THREE.PerspectiveCamera(60,1,.1,1000);
b.build();
console.error = oe;
oe("errors:", nErr, "stacks:", b.stacks?.length, "activeStacks:", b.activeStacks?.length);
oe("props(colorNode):", JSON.stringify(Object.keys(b.getNodeProperties(material.colorNode) || {})));
oe("props(material):", JSON.stringify(Object.keys(b.getNodeProperties(material) || {})));