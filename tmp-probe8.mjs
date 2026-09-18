import * as THREE from "three";
import { WGSLNodeBuilder, StorageInstancedBufferAttribute, MeshBasicNodeMaterial } from "three/webgpu";
import { context, Fn, If, Discard, attribute, uniform, vec2, vec3, vec4, float, texture, abs, length, min, max, floor, mod, round, smoothstep, cos, sin, screenUV, varyingProperty, getCurrentStack } from "three/tsl";
const stub = { isNodeManager: true, contextNode: context(), library: { fromMaterial: (m) => m }, constants: [], debug: { diagnostics: { keywords: [] }, onNodeBuilderCreated: null }, backend: { isBackend: true, utils: { getTextureSampleData: () => ({ primarySamples: 1, imageSampleCount: 1 }) } }, hasFeature: () => true, getRenderTargetTarget: () => ({}), getRenderTarget: () => null, xr: { enabled: false }, lighting: { enabled: false }, info: { render: {} } };
const tex = new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1); tex.needsUpdate = true;
// module-level shared Fns (like the library)
const uFps = uniform(float(30)), uUseFPS = uniform(float(1)), uTiles = uniform(new THREE.Vector2(4,4));
const uDiscardBg = uniform(float(1)), uBgColor = uniform(new THREE.Vector3(0,0,0)), uBgTol = uniform(float(0.1));
const uSoftEnabled = uniform(float(0)), uSoftIntensity = uniform(float(1)), uNearFar = uniform(new THREE.Vector2(0.1,1000));
const aInstanceOffset = attribute("instanceOffset");
const aColor = attribute("instanceColor");
const aParticleState = attribute("instanceParticleState");
const aStartValues = attribute("instanceStartValues");
const vColor = varyingProperty("vec4","vColor"), vUv = varyingProperty("vec2","vUv"), vViewZ = varyingProperty("float","vViewZ"), vLifetime = varyingProperty("float","vLifetime"), vStartLifetime = varyingProperty("float","vStartLifetime"), vRotation = varyingProperty("float","vRotation"), vStartFrame = varyingProperty("float","vStartFrame");
const computeFrameIndex = Fn(({ vLifetime, vStartLifetime, vStartFrame }) => {
  const totalFrames = uTiles.x.mul(uTiles.y);
  const lifePercent = min(vLifetime.div(vStartLifetime), float(1.0));
  const fpsBased = max(vLifetime.div(1000.0).mul(uFps), float(0.0));
  const lifetimeBased = max(min(floor(lifePercent.mul(totalFrames)), totalFrames.sub(1.0)), float(0.0));
  const fpsResult = uFps.equal(0.0).select(float(0.0), fpsBased);
  const frameOffset = uUseFPS.greaterThan(0.5).select(fpsResult, lifetimeBased);
  return round(vStartFrame).add(frameOffset);
});
const computeSpriteSheetUV = Fn(({ baseUV, frameIndex }) => {
  const spriteX = floor(mod(frameIndex, uTiles.x));
  const spriteY = floor(mod(frameIndex.div(uTiles.x), uTiles.y));
  return vec2(baseUV.x.div(uTiles.x).add(spriteX.div(uTiles.x)), baseUV.y.div(uTiles.y).add(spriteY.div(uTiles.y)));
});
const linearizeDepth = Fn(({ depthSample, near, far }) => {
  const zNdc = depthSample.mul(2.0).sub(1.0);
  return near.mul(2.0).mul(far).div(far.add(near).sub(zNdc.mul(far.sub(near))));
});
const softFadeFn = Fn(({ viewZ }) => {
  const softFade = float(1.0).toVar();
  If(uSoftEnabled.greaterThan(0.5), () => {
    const depthSample = texture(tex, screenUV).x;
    const sceneDepthLinear = linearizeDepth({ depthSample, near: uNearFar.x, far: uNearFar.y });
    softFade.assign(smoothstep(float(0.0), uSoftIntensity, sceneDepthLinear.sub(viewZ)));
  });
  return softFade;
});
const oe = console.error;
for (let k = 1; k <= 3; k++) {
  const N = 8;
  const gi = new THREE.InstancedBufferGeometry();
  gi.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),3));
  gi.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2,0,2,3]),1));
  gi.instanceCount = N;
  ["instanceOffset","instanceColor","instanceParticleState","instanceStartValues"].forEach(n=>gi.setAttribute(n,new StorageInstancedBufferAttribute(new Float32Array(N*4).fill(1),4)));
  const vertex = Fn(() => {
    const clipPos = vec4(0,0,0,-1).toVar();
    If(aColor.w.greaterThan(0.0), () => {
      vColor.assign(aColor.toVar());
      vLifetime.assign(aParticleState.x);
      vStartLifetime.assign(aStartValues.x);
      vRotation.assign(aParticleState.z);
      vStartFrame.assign(aParticleState.w);
      vUv.assign(vec2(attribute("position", 3).x.mul(0.0).add(0.5), float(0.5)));
      vViewZ.assign(float(1.0));
      clipPos.assign(vec4(0,0,0,1));
    });
    return clipPos;
  })();
  const fragment = Fn(() => {
    const outColor = vColor.toVar();
    const center = vec2(0.5, 0.5);
    const centered = vUv.sub(center);
    const cosR = cos(vRotation), sinR = sin(vRotation);
    const rotated = vec2(centered.x.mul(cosR).add(centered.y.mul(sinR)), centered.x.mul(sinR).negate().add(centered.y.mul(cosR)));
    const rotatedUV = rotated.add(center);
    const dist = length(rotatedUV.sub(center));
    If(dist.greaterThan(0.5), () => { Discard(); });
    const frameIndex = computeFrameIndex({ vLifetime, vStartLifetime, vStartFrame });
    const uvPoint = computeSpriteSheetUV({ baseUV: rotatedUV, frameIndex });
    const texColor = texture(tex, uvPoint);
    outColor.assign(outColor.mul(texColor));
    const diff = vec3(texColor.x.sub(uBgColor.x), texColor.y.sub(uBgColor.y), texColor.z.sub(uBgColor.z));
    Discard(uDiscardBg.greaterThan(0.5).and(abs(length(diff)).lessThan(uBgTol)));
    const softFade = softFadeFn({ viewZ: vViewZ });
    outColor.assign(vec4(outColor.xyz, outColor.w.mul(softFade)));
    Discard(outColor.w.lessThan(0.001));
    return outColor;
  })();
  const mat = new MeshBasicNodeMaterial();
  mat.transparent = true; mat.blending = THREE.AdditiveBlending; mat.depthTest = true; mat.depthWrite = false; mat.toneMapped = false; mat.fog = false;
  mat.vertexNode = vertex; mat.colorNode = fragment;
  const obj = new THREE.Mesh(gi, mat);
  let nErr = 0; console.error = () => { nErr++; };
  const b = new WGSLNodeBuilder(obj, stub); b.object=obj; b.material=mat; b.geometry=gi; b.scene=new THREE.Scene(); b.camera=new THREE.PerspectiveCamera(60,1,.1,1000);
  b.build();
  console.error = oe;
  oe(`build #${k}: errors=${nErr} v=${String(b.vertexShader||"").length} f=${String(b.fragmentShader||"").length}`);
}