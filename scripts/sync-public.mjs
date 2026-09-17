/* eslint-disable no-console */
// Regenerate the offline `public/lib` mirror from `packages/three-particles/dist`
// after each engine build. Bare specifiers used by the browser importmap are
// preserved verbatim (see `keep` list) so that `examples.js` and the
// WebGPU factory both resolve to the SAME browser module instance.
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

// Bare specifiers rewritten to `./?` file paths for file:// usage:
const rewrite = {
  'easing-functions': './easing-functions.js',
  three: './three.module.js',
  'three/tsl': './three.tsl.js',
  'three/webgpu': './three.webgpu.js',
  'three-noise/build/three-noise.module.js': './three-noise.module.js',
  '@newkrok/three-utils': './three-utils/index.js',
};
// Bare specifiers preserved (importmap owns them ? same module identity):
const keep = new Set(['@cyberluke/three-particles']);

let written = 0;
for (const [src, dst] of files) {
  const from = resolve(dist, src);
  if (!existsSync(from)) {
    console.warn(`[mirror] missing ${src}, skipping`);
    continue;
  }
  let code = readFileSync(from, 'utf8');
  for (const bare of Object.keys(rewrite)) {
    if (keep.has(bare)) continue;
    code = code.split(`from '${bare}'`).join(`from '${rewrite[bare]}'`);
    code = code.split(`from "${bare}"`).join(`from "${rewrite[bare]}"`);
  }
  writeFileSync(resolve(lib, dst), code, 'utf8');
  written++;
  console.log(`[mirror] ${src} -> public/lib/${dst} (${code.length} B)`);
}
if (written === 0) {
  console.error('[mirror] nothing copied; engine build failed?');
  process.exit(1);
}
