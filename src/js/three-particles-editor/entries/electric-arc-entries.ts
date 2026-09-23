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
 * Endpoint widget (§34 + §24, engine >= 4.1.2): the host (e.g. the VIVERRA
 * ribbon scene) recomputes the BASE start/end anchors each frame via
 * `setEndpoints`/`bindEndpoints`. Persistent user transforms live ONLY in the
 * normalized config and are consumed by `mergeLiveConfig`: `startOffset` /
 * `endOffset` (endpoint-frame-local x/y/z), `startRotation` / `endRotation`
 * (Euler pitch/yaw/roll, degrees) and the whole-arc `rotationZ`. The panel
 * shows the derived runtime read-back (base + effective anchors) read-only
 * via `getRuntimeEndpoints()` and never writes it back.
 *
 * @module
 */

type Vec3 = { x: number; y: number; z: number };

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

const asVec = (v: unknown): Vec3 => {
  const p = (v ?? {}) as Partial<Vec3>;
  return { x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0 };
};

/**
 * Euler read/normalize with a legacy shim: old saved configs used
 * `{x,y,z}` triplets, new ones use `{pitch,yaw,roll}`.
 */
const asEuler = (v: unknown): { pitch: number; yaw: number; roll: number } => {
  const r = (v ?? {}) as Record<string, unknown>;
  const num = (...c: unknown[]): number => {
    for (const cand of c) if (Number.isFinite(cand)) return Number(cand);
    return 0;
  };
  return {
    pitch: num(r.pitch, r.x),
    yaw: num(r.yaw, r.y),
    roll: num(r.roll, r.z),
  };
};

const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Tangent (start->end) orientation in degrees: pitch = X, yaw = Y. */
const tangentAngles = (start: Vec3, end: Vec3) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const horiz = Math.hypot(dx, dz);
  return {
    pitchX: toDeg(Math.atan2(dy, horiz)),
    yawY: toDeg(Math.atan2(dx, dz)),
  };
};

export const createElectricArcEntries = ({
  parentFolder,
  particleSystemConfig,
  getParticleSystem,
  recreate,
}: ArcEntriesParams): Record<string, unknown> => {
  const cfg = particleSystemConfig;

  // Make sure every section object exists (matches engine normalization of
  // a missing section) AND every known key inside it is defined, so lil-gui
  // `add()` always gets a primitive value and returns a controller. A loaded
  // config can carry a PARTIAL section (e.g. lighting without `distance` /
  // `decay`); without seeding, `add()` returns `undefined` for the missing
  // key and the chained `.onChange(...)` throws.
  const fillSection = (
    section: Record<string, unknown>,
    defaults: Record<string, unknown>
  ): void => {
    for (const key of Object.keys(defaults)) {
      if (section[key] === undefined) {
        const dv = defaults[key];
        section[key] = Array.isArray(dv) ? [...dv] : dv;
      }
    }
  };

  cfg.glow = cfg.glow ?? { ...DEFAULTS.glow };
  fillSection(cfg.glow, DEFAULTS.glow);
  cfg.contact = cfg.contact ?? { ...DEFAULTS.contact };
  fillSection(cfg.contact, DEFAULTS.contact);
  cfg.lighting = cfg.lighting ?? { ...DEFAULTS.lighting };
  fillSection(cfg.lighting, DEFAULTS.lighting);
  cfg.sparks = cfg.sparks ?? {
    ...DEFAULTS.sparks,
    lifetime: [...DEFAULTS.sparks.lifetime],
    speed: [...DEFAULTS.sparks.speed],
    size: [...DEFAULTS.sparks.size],
  };
  fillSection(cfg.sparks, DEFAULTS.sparks);
  cfg.branches = cfg.branches ?? {
    ...DEFAULTS.branches,
    length: [...DEFAULTS.branches.length],
    thicknessScale: [...DEFAULTS.branches.thicknessScale],
  };
  fillSection(cfg.branches, DEFAULTS.branches);
  cfg.start.x = cfg.start.x ?? 0;
  cfg.start.y = cfg.start.y ?? 0;
  cfg.start.z = cfg.start.z ?? 0;
  cfg.end.x = cfg.end.x ?? 0;
  cfg.end.y = cfg.end.y ?? 0;
  cfg.end.z = cfg.end.z ?? 0;

  // ── Persistent endpoint transforms (engine contract since 4.1.2) ─────────
  // `startOffset` / `endOffset` are ENDPOINT_FRAME_LOCAL: x = chord U axis,
  // y = chord V axis, z = chord tangent N (docs/electric-arc-endpoint-
  // transform.md). `startRotation` / `endRotation` are endpoint-frame Euler
  // angles in degrees (pitch/yaw/roll). All four persist through
  // `setEndpoints()` runtime anchor updates and serialize with the config.
  // legacy `offset` (end - start) seeds the persistent START offset
  if (cfg.startOffset === undefined && cfg.offset !== undefined) cfg.startOffset = cfg.offset;
  cfg.startOffset = asVec(cfg.startOffset);
  cfg.endOffset = asVec(cfg.endOffset);
  cfg.startRotation = asEuler(cfg.startRotation);
  cfg.endRotation = asEuler(cfg.endRotation);
  const startOffset = cfg.startOffset as Vec3;
  const endOffset = cfg.endOffset as Vec3;
  const startRotation = cfg.startRotation as {
    pitch: number;
    yaw: number;
    roll: number;
  };
  const endRotation = cfg.endRotation as {
    pitch: number;
    yaw: number;
    roll: number;
  };

  // Relative chord (end - start): read-only derived display value.
  const computeOffset = (): Vec3 => ({
    x: cfg.end.x - cfg.start.x,
    y: cfg.end.y - cfg.start.y,
    z: cfg.end.z - cfg.start.z,
  });
  cfg.offset = cfg.offset ?? computeOffset();
  const offset = cfg.offset as Vec3;

  // Read-only runtime diagnostics (§ Phase 10 engine readback API).
  const rt = {
    mode: 'standalone' as 'standalone' | 'bound',
    sourceId: '' as string,
    baseStart: asVec(cfg.start),
    baseEnd: asVec(cfg.end),
    effectiveStart: asVec(cfg.start),
    effectiveEnd: asVec(cfg.end),
    startFrameSource: 'chord' as 'object' | 'chord',
    endFrameSource: 'chord' as 'object' | 'chord',
    tangentPitchDeg: 0,
    tangentYawDeg: 0,
  };

  const refreshDerived = (): void => {
    offset.x = cfg.end.x - cfg.start.x;
    offset.y = cfg.end.y - cfg.start.y;
    offset.z = cfg.end.z - cfg.start.z;
    const ps = getParticleSystem();
    const live =
      typeof ps?.getRuntimeEndpoints === 'function'
        ? (ps.getRuntimeEndpoints() as Record<string, unknown>)
        : null;
    if (live) {
      rt.mode = (live.mode as 'standalone' | 'bound') ?? 'standalone';
      rt.sourceId = (live.sourceId as string) ?? '';
      Object.assign(rt.baseStart, asVec(live.baseStart as Vec3));
      Object.assign(rt.baseEnd, asVec(live.baseEnd as Vec3));
      Object.assign(rt.effectiveStart, asVec(live.effectiveStart as Vec3));
      Object.assign(rt.effectiveEnd, asVec(live.effectiveEnd as Vec3));
      const sf = (live.startFrame ?? {}) as Record<string, unknown>;
      const ef = (live.endFrame ?? {}) as Record<string, unknown>;
      rt.startFrameSource = (sf.frameSource as 'object' | 'chord') ?? 'chord';
      rt.endFrameSource = (ef.frameSource as 'object' | 'chord') ?? 'chord';
      const t = asVec(sf.tangent as Vec3);
      const horiz = Math.hypot(t.x, t.z);
      rt.tangentPitchDeg = toDeg(Math.atan2(t.y, horiz));
      rt.tangentYawDeg = toDeg(Math.atan2(t.x, t.z));
    } else {
      rt.mode = 'standalone';
      rt.sourceId = '';
      Object.assign(rt.baseStart, asVec(cfg.start));
      Object.assign(rt.baseEnd, asVec(cfg.end));
      rt.startFrameSource = 'chord';
      rt.endFrameSource = 'chord';
      const { pitchX, yawY } = tangentAngles(cfg.start, cfg.end);
      rt.tangentPitchDeg = pitchX;
      rt.tangentYawDeg = yawY;
    }
    // bound mode: base anchors are host-driven and overwritten each frame
    const bound = rt.mode === 'bound';
    for (const c of anchorControllers) {
      if (bound) {
        c.disable();
      } else {
        c.enable();
      }
    }
  };
  const anchorControllers: any[] = [];
  refreshDerived();

  /** Non-structural edits: patch the live subsystem, no harness recreate. */
  const applyLive = (patch: Record<string, unknown>): void => {
    const ps = getParticleSystem();
    if (ps?.updateConfig) ps.updateConfig(patch);
  };
  const endpoint = (): void => {
    refreshDerived();
    const ps = getParticleSystem();
    if (ps?.setEndpoints) ps.setEndpoints(cfg.start, cfg.end);
    applyLive({ start: { ...cfg.start }, end: { ...cfg.end } });
  };
  const applyPersistentOffset = (): void =>
    applyLive({ startOffset: { ...startOffset }, endOffset: { ...endOffset } });
  const applyPersistentRotation = (): void =>
    applyLive({
      startRotation: { ...startRotation },
      endRotation: { ...endRotation },
    });

  // ── Binding (mode + host identity, read-only) ────────────────────────────
  const bind = parentFolder.addFolder('Binding');
  bind.add(rt, 'mode').name('Mode').listen().disable();
  bind.add(rt, 'sourceId').name('Source').listen().disable();
  bind.close();

  // ── Arc (absolute endpoints + material scalars) ──────────────────────────
  const arc = parentFolder.addFolder('Arc');
  ['x', 'y', 'z'].forEach((axis) => {
    anchorControllers.push(
      arc.add(cfg.start, axis, -10, 10, 0.01).name(`start.${axis}`).onChange(endpoint).listen()
    );
    anchorControllers.push(
      arc.add(cfg.end, axis, -10, 10, 0.01).name(`end.${axis}`).onChange(endpoint).listen()
    );
  });
  // start/end editable only in standalone mode (bound anchors are host-driven)
  if (rt.mode === 'bound') for (const c of anchorControllers) c.disable();
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
  arc.close();

  // ── Persistent endpoint transforms (startOffset / endOffset) ─────────────
  const off = parentFolder.addFolder('Endpoint offsets (local frame)');
  (['x', 'y', 'z'] as const).forEach((axis) => {
    off
      .add(startOffset, axis, -20, 20, 0.01)
      .name(`startOffset.${axis}`)
      .onChange(() => applyPersistentOffset())
      .listen();
    off
      .add(endOffset, axis, -20, 20, 0.01)
      .name(`endOffset.${axis}`)
      .onChange(() => applyPersistentOffset())
      .listen();
  });
  // chord (end - start) as a live read-only diagnostic
  (['x', 'y', 'z'] as const).forEach((axis) => {
    off.add(offset, axis, -40, 40, 0.01).name(`chord.${axis} (derived)`).listen().disable();
  });
  off.close();

  // ── Rotation (whole-arc Z + persistent per-endpoint Euler) ───────────────
  const rot = parentFolder.addFolder('Rotation');
  rot
    .add(cfg, 'rotationZ', -180, 180, 0.5)
    .name('arc rotation Z (deg, global)')
    .onChange(() => {
      refreshDerived();
      applyLive({ rotationZ: cfg.rotationZ });
    })
    .listen();
  // Per-endpoint Euler angles ARE consumed by the engine since 4.1.2
  // (mergeLiveConfig + endpoint composition in the local endpoint frame).
  (['pitch', 'yaw', 'roll'] as const).forEach((axis) => {
    rot
      .add(startRotation, axis, -360, 360, 0.5)
      .name(`start.rot.${axis} (deg)`)
      .onChange(() => applyPersistentRotation())
      .listen();
    rot
      .add(endRotation, axis, -360, 360, 0.5)
      .name(`end.rot.${axis} (deg)`)
      .onChange(() => applyPersistentRotation())
      .listen();
  });
  // runtime-derived diagnostics (§ Phase 10 readback)
  rot.add(rt, 'tangentPitchDeg', -360, 360, 0.1).name('tangent pitch (derived)').listen().disable();
  rot.add(rt, 'tangentYawDeg', -360, 360, 0.1).name('tangent yaw (derived)').listen().disable();
  rot.close();

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

  // ── Ergonomics: reset + copy helpers (engine-consumed fields only) ────────
  const resetStartOffset = (): void => {
    startOffset.x = startOffset.y = startOffset.z = 0;
    applyPersistentOffset();
  };
  const resetEndOffset = (): void => {
    endOffset.x = endOffset.y = endOffset.z = 0;
    applyPersistentOffset();
  };
  const resetEndpointRotations = (): void => {
    startRotation.pitch = startRotation.yaw = startRotation.roll = 0;
    endRotation.pitch = endRotation.yaw = endRotation.roll = 0;
    applyPersistentRotation();
  };
  const copy = (label: string, value: unknown): void => {
    const text = JSON.stringify(value);
    try {
      const nav = (
        window as unknown as {
          navigator?: { clipboard?: { writeText: (t: string) => unknown } };
        }
      ).navigator;
      nav?.clipboard?.writeText(text);
    } catch {
      /* clipboard unavailable in worker context */
    }
    // eslint-disable-next-line no-console
    console.log(`[electric-arc ${label}]`, text);
  };
  const ergo = parentFolder.addFolder('Tools');
  ergo.add(resetStartOffset, 'call').name('Reset start offset');
  ergo.add(resetEndOffset, 'call').name('Reset end offset');
  ergo.add(resetEndpointRotations, 'call').name('Reset endpoint rotations');
  ergo
    .add(
      { call: () => copy('effective', { start: rt.effectiveStart, end: rt.effectiveEnd }) },
      'call'
    )
    .name('Copy effective endpoints');
  ergo
    .add(
      {
        call: () =>
          copy('persistent', {
            ...(rt.mode === 'standalone' ? { start: cfg.start, end: cfg.end } : {}),
            startOffset: cfg.startOffset,
            endOffset: cfg.endOffset,
            startRotation: cfg.startRotation,
            endRotation: cfg.endRotation,
            rotationZ: cfg.rotationZ,
          }),
      },
      'call'
    )
    .name('Copy persistent transform');
  ergo.close();

  // ── JSON report (debug-only, non-authoritative, non-persistent) ───────────
  // Snapshot the authored baseline once so the diff is meaningful.
  const baseline = JSON.parse(JSON.stringify(snapshot(cfg)));
  const reportObj = {
    generateReport: (): Record<string, unknown> => {
      refreshDerived();
      const current = snapshot(cfg);
      const report = {
        kind: 'electric-arc',
        generatedAt: new Date().toISOString(),
        // Binding mode explains why base anchors may be read-only.
        binding: {
          mode: rt.mode,
          sourceId: rt.sourceId || undefined,
          startFrameSource: rt.startFrameSource,
          endFrameSource: rt.endFrameSource,
        },
        // Persistent user config (what serializes; standalone keeps start/end).
        persistent: {
          ...(rt.mode === 'standalone' ? { start: { ...cfg.start }, end: { ...cfg.end } } : {}),
          startOffset: { ...cfg.startOffset },
          endOffset: { ...cfg.endOffset },
          startRotation: { ...cfg.startRotation },
          endRotation: { ...cfg.endRotation },
          rotationZ: Number.isFinite(cfg.rotationZ) ? Number(cfg.rotationZ) : 0,
        },
        // Runtime-derived state (read-back only; never written back).
        runtime: {
          baseStart: { ...rt.baseStart },
          baseEnd: { ...rt.baseEnd },
          effectiveStart: { ...rt.effectiveStart },
          effectiveEnd: { ...rt.effectiveEnd },
          chord: { ...computeOffset() },
          tangentPitchDeg: rt.tangentPitchDeg,
          tangentYawDeg: rt.tangentYawDeg,
        },
        changed: diff(baseline, current),
      };
      try {
        (window as unknown as { __needleArcReport?: unknown }).__needleArcReport = report;
      } catch {
        /* window may be unavailable in worker context */
      }
      // eslint-disable-next-line no-console
      console.log('[electric-arc report]', JSON.stringify(report));
      return report;
    },
  };
  parentFolder.add(reportObj, 'generateReport').name('Generate JSON report');

  return {
    onUpdate: (): void => {
      // Keep mode/anchors/offset/tangent read-outs in sync with the live
      // host-provided endpoints every frame (read-back only; the persistent
      // transforms are never written back).
      refreshDerived();
    },
  };
};

/** Flat, JSON-safe projection of the persistent endpoint/rotation surface. */
function snapshot(cfg: any): Record<string, unknown> {
  return {
    start: { ...cfg.start },
    end: { ...cfg.end },
    offset: { ...computeOf(cfg) },
    rotationZ: Number.isFinite(cfg.rotationZ) ? Number(cfg.rotationZ) : 0,
    startOffset: { ...(cfg.startOffset ?? { x: 0, y: 0, z: 0 }) },
    endOffset: { ...(cfg.endOffset ?? { x: 0, y: 0, z: 0 }) },
    startRotation: { ...(cfg.startRotation ?? { pitch: 0, yaw: 0, roll: 0 }) },
    endRotation: { ...(cfg.endRotation ?? { pitch: 0, yaw: 0, roll: 0 }) },
  };
}

function computeOf(cfg: any): Vec3 {
  return {
    x: (cfg.end?.x ?? 0) - (cfg.start?.x ?? 0),
    y: (cfg.end?.y ?? 0) - (cfg.start?.y ?? 0),
    z: (cfg.end?.z ?? 0) - (cfg.start?.z ?? 0),
  };
}

/** Recursive leaf diff: only keys whose primitive value changed. */
function diff(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  const walk = (pa: Record<string, unknown>, pb: Record<string, unknown>, prefix: string): void => {
    for (const key of Object.keys(pb)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const va = pa?.[key];
      const vb = pb[key];
      if (vb !== null && typeof vb === 'object' && !Array.isArray(vb)) {
        walk((va ?? {}) as Record<string, unknown>, vb as Record<string, unknown>, path);
      } else if (va !== vb) {
        out[path] = { from: va ?? null, to: vb };
      }
    }
  };
  walk(a, b, '');
  return out;
}
