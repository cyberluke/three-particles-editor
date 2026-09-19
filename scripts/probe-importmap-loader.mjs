/* eslint-disable no-console */
// Resolve-hook copy of the importmap in public/examples.html, so `node` reproduces
// the browser module graph (same URLs, same query -> same module instance).
const ROOT = new URL('../', import.meta.url); // scripts/ -> repo root
const map = {
  three: './public/lib/three.module.js?v=9',
  'three/webgpu': './public/lib/three.webgpu.js?v=9',
  'three/tsl': './public/lib/three.tsl.js?v=9',
  THREE: './public/lib/three.webgpu.js?v=9',
  '@cyberluke/three-particles': './public/lib/three-particles.esm.js?v=9',
  '@cyberluke/three-particles/webgpu': './public/lib/three-particles-webgpu.esm.js?v=9',
  '@newkrok/three-utils': './public/lib/three-utils/index.js?v=9',
  '@newkrok/three-utils/assets': './public/lib/three-utils/assets/index.js?v=9',
  '@newkrok/three-utils/audio': './public/lib/three-utils/audio/index.js?v=9',
  'easing-functions': './public/lib/easing-functions.js?v=9',
  'three-noise/build/three-noise.module.js': './public/lib/three-noise.module.js?v=9',
};
export async function resolve(specifier, context, next) {
  if (map[specifier]) return { url: new URL(map[specifier], ROOT).href, shortCircuit: true };
  if (specifier.startsWith('three/')) {
    return { url: new URL(`./public/lib/three/${specifier.slice(6)}`, ROOT).href, shortCircuit: true };
  }
  return next(specifier, context);
}