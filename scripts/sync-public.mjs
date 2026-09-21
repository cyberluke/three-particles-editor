/* eslint-disable no-console */
// Regenerate the offline `public/lib` mirror from `packages/three-particles/dist`.
//
// The rewrite map is DERIVED from the importmap in `public/examples.html` so every
// specifier in the mirror resolves to the byte-identical module URL (query included).
// Different URLs mean different module instances, and the node/TSL module keeps its
// stack in a module-scope variable -> a second copy breaks `assign()` inside `Fn()`.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'packages/three-particles/dist');
const lib = resolve(root, 'public/lib');
if (!existsSync(lib)) mkdirSync(lib, { recursive: true });
// `public/*.js` are the *root-level* mirrors consumed by `public/examples.html`
// (its importmap + the version switcher point at `./three-particles*.js`).
// No specifier rewriting: the bare `@cyberluke/three-particles*` names in the
// dist output are exactly what the page importmap maps to these root URLs.
const rootPublic = resolve(root, 'public');

// name-in <- name-out
const files = [
  ['index.js', 'three-particles.esm.js'],
  ['webgpu.js', 'three-particles-webgpu.esm.js'],
  ['three-particles.min.js', 'three-particles.min.js'],
];

// Chunk + shim files produced by the tsup treeshake pipeline keep a
// content-derived hash in their name; they are sibling-imports of
// `index.js` / `three-particles.min.js` / the ESM output and MUST live
// alongside the mirrors under the SAME hash-named file. Regenerate the set
// every run because they change whenever a source file changes.
const chunkFiles = existsSync(dist)
  ? readdirSync(dist).filter(
      (n) =>
        /^chunk-[\w-]+\.js$/.test(n) || /^three-particles-[\w-]+\.js$/.test(n)
    )
  : [];
for (const chunk of chunkFiles) {
  const src = resolve(dist, chunk);
  const dst = resolve(lib, chunk);
  writeFileSync(dst, readFileSync(src, 'utf8'), 'utf8');
  console.log(
    `[mirror] ${chunk} -> public/lib/${chunk} (${readFileSync(src, 'utf8').length} B)`
  );
}

// Bare specifiers the importmap owns -> copied verbatim, still one instance.
const keep = new Set(['@cyberluke/three-particles']);

// Build `bare -> ./sibling-in-lib` from the page importmap.
const html = readFileSync(resolve(root, 'public/examples.html'), 'utf8');
const importMapMatch = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
if (!importMapMatch) {
  console.error('[mirror] no importmap found in public/examples.html');
  process.exit(1);
}
const imports = JSON.parse(importMapMatch[1]).imports;
const LIB_PREFIX = './lib/';
const rewrite = {};
for (const [bare, value] of Object.entries(imports)) {
  if (keep.has(bare) || bare.endsWith('/')) continue; // folder prefixes are separate
  if (typeof value !== 'string' || !value.startsWith(LIB_PREFIX)) continue;
  // mirror files live in ./lib too, so drop that first segment
  rewrite[bare] = `./${value.slice(LIB_PREFIX.length)}`;
}

let written = 0;
for (const [src, dst] of files) {
  const from = resolve(dist, src);
  if (!existsSync(from)) {
    console.warn(`[mirror] missing ${src}, skipping`);
    continue;
  }
  let code = readFileSync(from, 'utf8');
  for (const bare of Object.keys(rewrite)) {
    const target = rewrite[bare];
    for (const q of ["'", '"']) {
      // spaced (`from 'x'`) and minified (`from'x'`) forms
      code = code.split(`from ${q}${bare}${q}`).join(`from ${q}${target}${q}`);
      code = code.split(`from${q}${bare}${q}`).join(`from${q}${target}${q}`);
    }
  }
  writeFileSync(resolve(lib, dst), code, 'utf8');
  written++;
  console.log(`[mirror] ${src} -> public/lib/${dst} (${code.length} B)`);
}
if (written === 0) {
  console.error('[mirror] nothing copied; engine build failed?');
  process.exit(1);
}

// Post-check: each relative specifier in a mirror must be one of the generated
// lib-sibling URLs -> identical to what the importmap hands out (same query).
// Chunk files are also siblings; include them by their `./<hash>` form.
const wanted = new Set([
  ...Object.values(rewrite),
  ...chunkFiles.map((n) => `./${n}`),
]);
for (const [, dst] of files) {
  const p = resolve(lib, dst);
  if (!existsSync(p)) continue;
  const code = readFileSync(p, 'utf8');
  const specs = [...new Set([...code.matchAll(/from\s*['"](\.[^'"]+?)['"]/g)].map((m) => m[1]))];
  const bad = specs.filter((s) => !wanted.has(s));
  console.log(
    `[mirror] ${dst}: ${specs.length} relative specifier(s)${bad.length ? ', MISALIGNED: ' + bad.join(', ') : ', all importmap-aligned'}`
  );
  if (bad.length) process.exitCode = 1;
}

// ─── Root-level mirror (`public/*.js`, consumed by the examples page) ────────
// The importmap in `public/examples.html` and the local-version branch of
// `public/version-switcher.js` resolve the library as root-relative URLs
// (`./three-particles.esm.js`, `./three-particles-webgpu.esm.js`), so those
// files must be refreshed with the *same* bytes as `public/lib/`. No
// specifier rewriting is needed: the bare importmap entries own those names and
// the `./<chunk>` siblings live next to these files as well.
let rootWritten = 0;
for (const [src, dst] of files) {
  const from = resolve(dist, src);
  if (!existsSync(from)) {
    console.warn(`[mirror] root mirror: missing ${src}, skipping`);
    continue;
  }
  writeFileSync(resolve(rootPublic, dst), readFileSync(from, 'utf8'), 'utf8');
  rootWritten++;
  console.log(`[mirror] ${src} -> public/${dst} (${readFileSync(from, 'utf8').length} B)`);
}
for (const chunk of chunkFiles) {
  writeFileSync(resolve(rootPublic, chunk), readFileSync(resolve(dist, chunk), 'utf8'), 'utf8');
}
if (rootWritten === 0) {
  console.error('[mirror] nothing copied to the root mirror; engine build failed?');
  process.exit(1);
}
console.log(`[mirror] root mirror: ${rootWritten} entry file(s) + ${chunkFiles.length} sibling chunk(s) refreshed`);
