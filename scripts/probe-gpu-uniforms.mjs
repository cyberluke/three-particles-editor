/* eslint-disable no-console */
// TSL uniform-type boundary probe (§25-§28), pure JS.
//
//   node scripts/probe-gpu-uniforms.mjs
//
// For every shipped example config (the same 53 the browser constructs) it
// passes the merged config through `createParticleSystem` and then through
// `lib.createTSLParticleMaterial(effective, sharedUniforms...)`, i.e. exactly
// the boundary the live path uses. It prints:
//   * version, renderer (effective + requested), material class name
//   * tiles value + instanceof THREE.Vector2 (or null when no sheet)
//   * cameraNearFar Vector2, map/sceneDepthTexture identity, background
//     color Vector3 (serialized `{r,g,b}` / `#hex` / number all accepted).
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
register('./probe-importmap-loader.mjs', import.meta.url);

const THREE = await import('three/webgpu');
const lib = await import('@cyberluke/three-particles/webgpu');
const core = await import('@cyberluke/three-particles');
const { REVISION } = core;

lib.enableWebGPU({
  isWebGPURenderer: true,
  backend: { isBackend: true, isWebGPUBackend: true },
  compute: () => {},
  hasFeature: () => true,
});

const isVec2 = (v) => v instanceof THREE.Vector2;
const isVec3 = (v) => v instanceof THREE.Vector3;
const isTextureLike = (v) => !!v && typeof v === 'object' && 'image' in v;

function sharedUniformsFor(cfg) {
  // The engine's own merge step is internal; these values already come from
  // the merged config produced by `createParticleSystem` (see snapshot).
  const t = cfg.textureSheetAnimation;
  const tex = (v) => (isTextureLike(v) ? v : null);
  return {
    version: REVISION,
    tiles: lib.normalizeVector2Value(t?.tiles, [1, 1], 'textureSheetAnimation.tiles'),
    cameraNearFar: lib.normalizeVector2Value(
      cfg.renderer?.cameraNearFar,
      [0.1, 1000],
      'renderer.cameraNearFar'
    ),
    map: tex(cfg.map),
    sceneDepthTexture: lib.normalizeDepthTextureValue(
      cfg.renderer?.softParticles?.depthTexture,
      'renderer.softParticles.depthTexture'
    ),
    backgroundColor: lib.normalizeBackgroundToVector3(
      cfg.renderer?.backgroundColor,
      'renderer.backgroundColor'
    ),
  };
}

let fails = 0;
const src = readFileSync('./packages/three-particles/examples/examples-data.js', 'utf8');
const examples = new Function(`return ${src.match(/\[[\s\S]*\]/)[0]}`)();
for (const ex of examples) {
  const cfg = JSON.parse(JSON.stringify(ex.config));
  cfg.simulationBackend = 'GPU';
  const sys = core.createParticleSystem(cfg);
  const dbg = sys.gpuDebug;
  // Rebuild the same uniform boundary the engine material uses.
  const su = sharedUniformsFor(cfg);
  const shared = {
    map: { value: su.map },
    elapsed: { value: 0 },
    fps: { value: Number(cfg.textureSheetAnimation?.fps ?? 30) || 30 },
    useFPSForFrameIndex: { value: cfg.textureSheetAnimation?.timeMode === 'FPS' },
    tiles: { value: su.tiles },
    discardBackgroundColor: { value: !!cfg.renderer?.discardBackgroundColor },
    backgroundColor: { value: su.backgroundColor },
    backgroundColorTolerance: { value: Number(cfg.renderer?.backgroundColorTolerance ?? 0) },
    softParticlesEnabled: { value: !!cfg.renderer?.softParticles?.enabled },
    softParticlesIntensity: { value: Number(cfg.renderer?.softParticles?.intensity ?? 1) || 1 },
    sceneDepthTexture: { value: su.sceneDepthTexture },
    cameraNearFar: { value: su.cameraNearFar },
    viewportHeight: { value: 720 },
  };
  const material = lib.createTSLParticleMaterial(
    dbg?.effectiveRendererType ?? 'POINTS',
    shared,
    {
      transparent: !!cfg.renderer?.transparent,
      blending: 2,
      depthTest: cfg.renderer?.depthTest !== false,
      depthWrite: cfg.renderer?.depthWrite !== false,
    },
    true
  );
  const tiles = shared.tiles.value;
  const cnf = shared.cameraNearFar.value;
  const bg = shared.backgroundColor.value;
  console.log(
    `${ex.id}: v=${REVISION} renderer: requested=${dbg?.requestedRendererType} effective=${dbg?.effectiveRendererType} ` +
      `material=${material?.constructor?.name} ` +
      `tiles=${isVec2(tiles) ? `[${tiles.x},${tiles.y}]` : String(tiles)}(Vector2=${isVec2(tiles)}) ` +
      `cameraNearFar=${isVec2(cnf) ? `[${cnf.x},${cnf.y}]` : String(cnf)} ` +
      `bg=${isVec3(bg) ? `[${bg.x},${bg.y},${bg.z}]` : JSON.stringify(su.backgroundColor)} ` +
      `map=${isTextureLike(shared.map.value)} depthTex=${shared.sceneDepthTexture.value === null ? 'null' : 'set'}`
  );
  if (cfg.textureSheetAnimation && !isVec2(tiles)) { fails++; console.log(`   FAIL ${ex.id}: tiles not normalized to Vector2`); }
}

// ─── editor config-converter static check (Editor A, §26) ──────────────────
// The converter output must be a THREE.Vector2 for `tiles` even when the
// legacy config already carries a plain-object `textureSheetAnimation`.
const convSrc = readFileSync('./src/js/three-particles-editor/config-converter.ts', 'utf8');
const tilesLines = convSrc.split('\n').findIndex((l) => l.includes('newConfig.textureSheetAnimation.tiles = new THREE.Vector2('));
const guardOpen = convSrc.split('\n').findIndex((l) => l.trim() === 'if (!newConfig.textureSheetAnimation) {');
const guardCloseIdx = (() => {
  const lines = convSrc.split('\n');
  let depth = 0;
  for (let i = guardOpen; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0 && i > guardOpen) return i; }
    }
  }
  return -1;
})();
const vector2OutsideGuard = tilesLines > guardCloseIdx;
const jsonRoundTripBefore = convSrc.split('\n').findIndex((l) => l.includes('JSON.parse(')) < tilesLines;
const isVector2Usage = /isVector2\(/.test(convSrc);
console.log(`config-converter: Vector2-rebuild-outside-if=${vector2OutsideGuard} json-roundtrip-first=${jsonRoundTripBefore} isVector2=${isVector2Usage}`);
if (!vector2OutsideGuard || !jsonRoundTripBefore || !isVector2Usage) { fails++; console.log('   FAIL config-converter static shape'); }

console.log(`GPU_UNIFORM_STATIC_GATE_PASS=${fails === 0 ? 1 : 0}`);
process.exit(fails === 0 ? 0 : 1);
