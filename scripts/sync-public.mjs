/* eslint-disable no-console */
// Sync the freshly built engine dist into the offline `public/lib` mirror used
// by `examples.html`. Rewrites bare specifiers to the relative file paths that
// exist under `public/lib/`, so the file:// + importmap path works without a
// bundler. Always call after `engine:build`, or use the composed script
// `build` which already wires them together.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'packages/three-particles/dist');
const lib = resolve(root, 'public/lib');

// name-in ? name-out
const files = [
  ['index.js', 'three-particles.esm.js'],
  ['webgpu.js', 'three-particles-webgpu.esm.js'],
  ['three-particles.min.js', 'three-particles.min.js'],
];

// Bare ? relative mapping used by the offline mirror.
const map = {
  'easing-functions': './easing-functions.js',
  three: './three.module.js',
  'three/tsl': './three.tsl.js',
  'three/webgpu': './three.webgpu.js',
  'three-noise/build/three-noise.module.js': './three-noise.module.js',
  '@newkrok/three-utils': './three-utils/index.js',
  '@cyberluke/three-particles': './three-particles.esm.js',
};

let written = 0;
for (const [src, dst] of files) {
  const from = resolve(dist, src);
  if (!existsSync(from)) {
    console.warn(`[mirror] missing ${src}, skipping`);
    continue;
  }
  let code = readFileSync(from, 'utf8');
  for (const bare of Object.keys(map)) {
    const a = `from '${bare}'`;
    const b = `from "${bare}"`;
    code = code.split(a).join(`from '${map[bare]}'`);
    code = code.split(b).join(`from "${map[bare]}"`);
  }
  writeFileSync(resolve(lib, dst), code, 'utf8');
  written++;
  console.log(`[mirror] ${src} ? public/lib/${dst} (${code.length} B)`);
}
if (written === 0) {
  console.error('[mirror] nothing copied; engine build failed?');
  process.exit(1);
}
