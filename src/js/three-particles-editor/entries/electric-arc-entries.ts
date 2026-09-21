/**
 * Dedicated lil-gui panel for the Electric Arc subsystem config (§34 flat
 * form: `{ kind:'electric-arc', start, end, color, coreColor, thickness,
 * chaos, speed, segments, seed, intensity, flickerHz, endpointPinning,
 * glow, contact, lighting, sparks, branches }`).
 *
 * Mirrors the engine's live-update contract
 * (`electric-arc-config.ts`: merge + `updateLive` for non-structural keys,
 * internal rebuild for structural ones), so small drags keep the GPU
 * pipeline while section-structural edits rebuild through the harness.
 *
 * @module
 */

type ArcEntriesParams = {
  parentFolder: any;
  particleSystemConfig: any;
  /** Live subsystem instance (may be re-created between frames). */
  getParticleSystem: () => any;
  /** Full harness recreate (structural edits). */
  recreate: () => void;
};

const DEFAULTS = {
  glow: { enabled: true, width: 6, intensity: 1.2 },
  contact: { enabled: true, radius: 0.07, intensity: 15 },
  lighting: {
    enabled: false,
    endpointIntensity: 1,
    midpointIntensity: 0.45,
    distance: 3,
    decay: 2,
  },
  sparks: {
    enabled: false,
    rate: 6,
    lifetime: [0.08, 0.25],
    speed: [0.6, 2.8],
    size: [0.05, 0.3],
  },
  branches: {
    enabled: false,
    maxCount: 3,
    probability: 0.04,
    length: [0.08, 0.28],
    thicknessScale: [0.18, 0.42],
  },
};

type NumPair = [number, number];

/** 2-field min/max controller row over an existing numeric pair. */
const addPair = (
  folder: any,
  arr: NumPair,
  label: string,
  min: number,
  max: number,
  step: number,
  onChange: () => void
): void => {
  const lo = { v: arr[0] };
  const hi = { v: arr[1] };
  folder
    .add(lo, 'v', min, max, step)
    .name(`${label} min`)
    .onChange((v: number) => {
      arr[0] = v;
      if (arr[1] < v) arr[1] = v;
      hi.v = arr[1];
      onChange();
    })
    .listen();
  folder
    .add(hi, 'v', min, max, step)
    .name(`${label} max`)
    .onChange((v: number) => {
      arr[1] = v;
      if (arr[0] > v) arr[0] = v;
      lo.v = arr[0];
      onChange();
    })
    .listen();
};

export const createElectricArcEntries = ({
  parentFolder,
  particleSystemConfig,
  getParticleSystem,
  recreate,
}: ArcEntriesParams): Record<string, unknown> => {
  const cfg = particleSystemConfig;

  // Make sure every section object exists (matches engine normalization of
  // a missing section), so controllers always have a stable parent object.
  cfg.glow = cfg.glow ?? { ...DEFAULTS.glow };
  cfg.contact = cfg.contact ?? { ...DEFAULTS.contact };
  cfg.lighting = cfg.lighting ?? { ...DEFAULTS.lighting };
  cfg.sparks = cfg.sparks ?? {
    ...DEFAULTS.sparks,
    lifetime: [...DEFAULTS.sparks.lifetime],
    speed: [...DEFAULTS.sparks.speed],
    size: [...DEFAULTS.sparks.size],
  };
  cfg.branches = cfg.branches ?? {
    ...DEFAULTS.branches,
    length: [...DEFAULTS.branches.length],
    thicknessScale: [...DEFAULTS.branches.thicknessScale],
  };
  cfg.start.x = cfg.start.x ?? 0;
  cfg.start.y = cfg.start.y ?? 0;
  cfg.start.z = cfg.start.z ?? 0;
  cfg.end.x = cfg.end.x ?? 0;
  cfg.end.y = cfg.end.y ?? 0;
  cfg.end.z = cfg.end.z ?? 0;

  /** Non-structural edits: patch the live subsystem, no harness recreate. */
  const applyLive = (patch: Record<string, unknown>): void => {
    const ps = getParticleSystem();
    if (ps?.updateConfig) ps.updateConfig(patch);
  };
  const endpoint = () => {
    const ps = getParticleSystem();
    if (ps?.setEndpoints) ps.setEndpoints(cfg.start, cfg.end);
    applyLive({ start: { ...cfg.start }, end: { ...cfg.end } });
  };

  // ── Arc ────────────────────────────────────────────────────────────────────
  const arc = parentFolder.addFolder('Arc');
  ['x', 'y', 'z'].forEach((axis) => {
    arc.add(cfg.start, axis, -10, 10, 0.01).name(`start.${axis}`).onChange(endpoint).listen();
    arc.add(cfg.end, axis, -10, 10, 0.01).name(`end.${axis}`).onChange(endpoint).listen();
  });
  arc
    .add(cfg, 'color')
    .name('color')
    .onChange(() => applyLive({ color: cfg.color }))
    .listen();
  arc
    .add(cfg, 'coreColor')
    .name('coreColor')
    .onChange(() => applyLive({ coreColor: cfg.coreColor }))
    .listen();
  arc
    .add(cfg, 'thickness', 0.005, 0.2, 0.001)
    .onChange(() => applyLive({ thickness: cfg.thickness }))
    .listen();
  arc
    .add(cfg, 'speed', 0, 4, 0.01)
    .onChange(() => applyLive({ speed: cfg.speed }))
    .listen();
  arc
    .add(cfg, 'intensity', 0.5, 30, 0.1)
    .onChange(() => applyLive({ intensity: cfg.intensity }))
    .listen();
  arc
    .add(cfg, 'flickerHz', 0, 60, 0.5)
    .onChange(() => applyLive({ flickerHz: cfg.flickerHz }))
    .listen();
  arc
    .add(cfg, 'rotationZ', -180, 180, 0.5)
    .name('rotation Z (deg)')
    .onChange(() => applyLive({ rotationZ: cfg.rotationZ }))
    .listen();
  arc.close();

  // ── Chaos (single macro §11 + identity) ───────────────────────────────────
  const chaos = parentFolder.addFolder('Chaos');
  chaos
    .add(cfg, 'chaos', 0, 1, 0.01)
    .onChange(() => applyLive({ chaos: cfg.chaos }))
    .listen();
  // chaos model selection (kernel topology -> rebuild)
  cfg.chaosAlgorithm = cfg.chaosAlgorithm ?? 'linear';
  chaos
    .add(cfg, 'chaosAlgorithm', ['linear', 'pulse', 'organic'] as const)
    .name('algorithm')
    .onChange(recreate)
    .listen();
  chaos.add(cfg, 'seed', 0, 0x00ffffff, 1).onChange(recreate).listen();
  chaos
    .add(cfg, 'endpointPinning', 0, 4, 0.01)
    .onChange(() => applyLive({ endpointPinning: cfg.endpointPinning }))
    .listen();
  chaos.add(cfg, 'segments', 8, 512, 1).name('segments (rebuild)').onChange(recreate).listen();
  chaos.close();

  // ── Glow / Contact ────────────────────────────────────────────────────────
  const glow = parentFolder.addFolder('Glow');
  glow
    .add(cfg.glow, 'enabled')
    .name('enabled')
    .onChange(() => applyLive({ glow: { ...cfg.glow } }))
    .listen();
  // `width` = outer bloom-like halo span only; the core keeps `thickness`
  glow
    .add(cfg.glow, 'width', 2, 30, 0.5)
    .name('width (halo span)')
    .onChange(() => applyLive({ glow: { ...cfg.glow } }))
    .listen();
  glow
    .add(cfg.glow, 'intensity', 0, 10, 0.1)
    .onChange(() => applyLive({ glow: { ...cfg.glow } }))
    .listen();
  // cross-section shape: smooth gaussian vs sharp triangle tent
  cfg.glow.profile = cfg.glow.profile ?? 'gaussian';
  glow
    .add(cfg.glow, 'profile', ['gaussian', 'triangle'] as const)
    .name('profile (shape)')
    .onChange(() => applyLive({ glow: { ...cfg.glow } }))
    .listen();
  glow.close();

  const contact = parentFolder.addFolder('Contact');
  contact
    .add(cfg.contact, 'enabled')
    .onChange(() => applyLive({ contact: { ...cfg.contact } }))
    .listen();
  contact
    .add(cfg.contact, 'radius', 0.01, 0.5, 0.005)
    .onChange(() => applyLive({ contact: { ...cfg.contact } }))
    .listen();
  contact
    .add(cfg.contact, 'intensity', 0, 50, 0.5)
    .onChange(() => applyLive({ contact: { ...cfg.contact } }))
    .listen();
  contact.close();

  // ── Lighting (3D point lights; creation is structural) ────────────────────
  const lighting = parentFolder.addFolder('Lighting');
  lighting.add(cfg.lighting, 'enabled').onChange(recreate).listen();
  lighting
    .add(cfg.lighting, 'endpointIntensity', 0, 50, 0.5)
    .onChange(() => applyLive({ lighting: { ...cfg.lighting } }))
    .listen();
  lighting
    .add(cfg.lighting, 'midpointIntensity', 0, 50, 0.5)
    .onChange(() => applyLive({ lighting: { ...cfg.lighting } }))
    .listen();
  lighting
    .add(cfg.lighting, 'distance', 0.1, 20, 0.1)
    .onChange(() => applyLive({ lighting: { ...cfg.lighting } }))
    .listen();
  lighting
    .add(cfg.lighting, 'decay', 1, 4, 0.1)
    .onChange(() => applyLive({ lighting: { ...cfg.lighting } }))
    .listen();
  lighting.close();

  // ── Sparks (group creation is structural → recreate) ──────────────────────
  const sparks = parentFolder.addFolder('Sparks');
  sparks.add(cfg.sparks, 'enabled').onChange(recreate).listen();
  sparks.add(cfg.sparks, 'rate', 0, 200, 1).onChange(recreate).listen();
  addPair(sparks, cfg.sparks.lifetime as NumPair, 'lifetime', 0.01, 1, 0.01, recreate);
  addPair(sparks, cfg.sparks.speed as NumPair, 'speed', 0, 10, 0.1, recreate);
  addPair(sparks, cfg.sparks.size as NumPair, 'size', 0.001, 1, 0.001, recreate);
  sparks.close();

  // ── Branches (createBranches inside backend → recreate) ───────────────────
  const branches = parentFolder.addFolder('Branches');
  branches.add(cfg.branches, 'enabled').onChange(recreate).listen();
  branches.add(cfg.branches, 'maxCount', 0, 8, 1).onChange(recreate).listen();
  branches.add(cfg.branches, 'probability', 0, 1, 0.005).onChange(recreate).listen();
  addPair(branches, cfg.branches.length as NumPair, 'length', 0.01, 1, 0.01, recreate);
  addPair(branches, cfg.branches.thicknessScale as NumPair, 'thickness', 0.01, 1, 0.01, recreate);
  branches.close();

  return {};
};
