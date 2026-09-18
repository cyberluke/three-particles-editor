/* eslint-disable no-console */
import { pathToFileURL } from 'node:url';
const ROOT = import.meta.url;
const map = {
  three: './public/lib/three.module.js?v=5',
  'three/webgpu': './public/lib/three.webgpu.js?v=5',
  'three/tsl': './public/lib/three.tsl.js?v=5',
  THREE: './public/lib/three.webgpu.js?v=5',
  '@cyberluke/three-particles': './public/lib/three-particles.esm.js?v=5',
  '@cyberluke/three-particles/webgpu': './public/lib/three-particles-webgpu.esm.js?v=5',
  '@newkrok/three-utils': './public/lib/three-utils/index.js?v=5',
  'easing-functions': './public/lib/easing-functions.js?v=5',
  'three-noise/build/three-noise.module.js': './public/lib/three-noise.module.js?v=5',
};
export async function resolve(specifier, context, next) {
  if (map[specifier]) {
    return { url: new URL(map[specifier], ROOT).href, shortCircuit: true };
  }
  if (specifier.startsWith('three/')) {
    const rest = specifier.slice('three/'.length);
    const asUrl = new URL(`./public/lib/three/${rest}`, ROOT);
    return { url: pathToFileURL(asUrl.pathname.replace(/^\//, '')).href, shortCircuit: true };
  }
  return next(specifier, context);
}