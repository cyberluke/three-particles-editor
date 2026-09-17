import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { TextureId } from './texture-config';
import { getTexture } from './assets';

let scene: THREE.Scene;
let renderer: WebGPURenderer;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let stats: Stats;
let mesh: THREE.Mesh;
let depthRenderTarget: THREE.RenderTarget | null = null;
let computeDispatchCount = 0;

export const createWorld = async (targetQuery: string): Promise<THREE.Scene> => {
  const container = document.querySelector(targetQuery);
  if (!container) {
    throw new Error(`Container not found: ${targetQuery}`);
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  mesh = new THREE.Mesh(new THREE.PlaneGeometry(50, 50, 50, 50));
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);
  setTerrain();

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = 0;
  renderer.toneMappingExposure = 1;
  await renderer.init();
  container.appendChild(renderer.domElement);

  // Create depth render target for soft particles
  depthRenderTarget = new THREE.RenderTarget(window.innerWidth, window.innerHeight, {
    depthTexture: new THREE.DepthTexture(window.innerWidth, window.innerHeight),
  });

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100);
  camera.position.set(0, 0, 6);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.target.set(0, 0, 0);
  controls.update();

  const statsContainer = document.querySelector('.stats');
  if (!statsContainer) {
    throw new Error('Stats container not found');
  }

  stats = new Stats();
  statsContainer.appendChild(stats.dom);

  window.addEventListener('resize', onWindowResize);

  return scene;
};

const onWindowResize = (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (depthRenderTarget) {
    depthRenderTarget.setSize(window.innerWidth, window.innerHeight);
  }
};

export const updateWorld = (
  softParticlesEnabled = false,
  particleContainer?: THREE.Object3D,
  computeNode?: unknown
): void => {
  // Dispatch GPU compute for WebGPU particle simulation. The three-particles
  // GPU-only kernel returns an ordered [emitNode, simNode] pair; Three.js
  // natively expands `Node[]` into the same `computeList` order as variadic
  // `renderer.compute(a, b)`, so one call already covers both kernels.
  if (computeNode) {
    (renderer as any).compute(computeNode);
    computeDispatchCount += Array.isArray(computeNode) ? (computeNode as unknown[]).length : 1;
  }

  if (softParticlesEnabled && depthRenderTarget) {
    // Hide particle system during depth pass to avoid feedback loop
    // (the particle shader reads the depth texture that would be written to)
    if (particleContainer) particleContainer.visible = false;
    renderer.setRenderTarget(depthRenderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    if (particleContainer) particleContainer.visible = true;
  }
  renderer.render(scene, camera);
  stats.update();
};

export const getComputeDispatchCount = (): number => computeDispatchCount;

export const setTerrain = (textureId?: string): void => {
  if (!textureId || textureId === TextureId.WIREFRAME) {
    const material = new THREE.MeshBasicMaterial({
      wireframe: true,
      depthWrite: false,
      color: 0x111111,
    });
    mesh.material = material;
  } else {
    const { map } = getTexture(textureId);
    map.wrapS = THREE.MirroredRepeatWrapping;
    map.wrapT = THREE.MirroredRepeatWrapping;
    map.repeat.x = 50;
    map.repeat.y = 50;
    map.colorSpace = THREE.SRGBColorSpace;
    mesh.material = new THREE.MeshBasicMaterial({
      map,
    });
  }
};

export const getCamera = (): THREE.PerspectiveCamera => camera;
export const getRenderer = (): WebGPURenderer => renderer;
export const getRendererDomElement = (): HTMLCanvasElement => renderer.domElement;
export const getOrbitControls = (): OrbitControls => controls;
export const getDepthTexture = (): THREE.DepthTexture | null =>
  depthRenderTarget?.depthTexture ?? null;

// Two independent capabilities reported by the *actual* live renderer.
// They are intentionally NOT one-and-the-same; each drives a different config field:
//  - `isUsingNodeMaterials()` ??? drives the **material** path (TSL `NodeMaterial`
//    vs legacy `ShaderMaterial`). True for both the WebGPU backend AND its
//    WebGL2 fallback, because both process TSL `NodeMaterial`s (via WGSL /
//    GLSL node builders).
//  - `isWebGPUBackend()` ??? drives the **compute** path. `true` only for
//    `WebGPUBackend` (native WebGPU) ??? `WebGLBackend` (fallback) does not set
//    `isWebGPUBackend` on itself.
export const isUsingNodeMaterials = (): boolean =>
  (renderer as unknown as { isWebGPURenderer?: boolean } | undefined)?.isWebGPURenderer === true;

export const isWebGPUBackend = (): boolean =>
  (renderer as unknown as { backend?: { isWebGPUBackend?: boolean } } | undefined)?.backend
    ?.isWebGPUBackend === true;

export const captureScreenshot = (): void => {
  // Render the current frame
  renderer.render(scene, camera);

  // Create a temporary canvas with 640x480 resolution
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const context = canvas.getContext('2d');

  if (!context) {
    console.error('Failed to get 2D context for screenshot');
    return;
  }

  // Draw the renderer's canvas to our temporary canvas (this will resize it)
  context.drawImage(renderer.domElement, 0, 0, 640, 480);

  // Convert to WebP and download
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        console.error('Failed to create screenshot blob');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `particle-effect-${timestamp}.webp`;
      link.href = url;
      link.click();

      // Clean up
      URL.revokeObjectURL(url);
    },
    'image/webp',
    0.95
  );
};
