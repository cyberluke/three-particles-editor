import { isConfigV2 } from '../config-util';
import {
  isElectricArcConfig,
  loadParticleSystem,
  serializeParticleSystemConfig,
} from '../save-and-load';
import {
  mergeLiveConfig,
  normalizeElectricArcConfig,
  touchesStructuralField,
} from '../../../../packages/three-particles/src/js/effects/electric-arc/electric-arc-config';

/**
 * Contract + persistence surface for the Electric Arc subsystem (§34 flat
 * config, §24 dynamic endpoints). See docs/electric-arc-config-contract.md.
 */

const ARC = {
  kind: 'electric-arc',
  start: { x: -1.1, y: 0.2, z: 0 },
  end: { x: 1.1, y: 0.2, z: 0.5 },
  offset: { x: 2.2, y: 0, z: 0.5 },
  rotationZ: 15,
  thickness: 0.036,
  chaos: 0.18,
  seed: 271,
  glow: { enabled: true, width: 6.5, intensity: 1.35, profile: 'gaussian' },
  _editorData: { textureId: 'POINT' },
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('electric-arc config detection', () => {
  test('isElectricArcConfig matches only the flat subsystem kind', () => {
    expect(isElectricArcConfig(ARC)).toBe(true);
    expect(isElectricArcConfig({ start: { x: 0, y: 0, z: 0 } })).toBe(false);
    expect(isElectricArcConfig(undefined)).toBe(false);
  });

  test('the flat subsystem config never needs legacy conversion', () => {
    expect(isConfigV2(ARC)).toBe(true);
  });
});

describe('electric-arc serialization round-trip', () => {
  test('whole flat config survives serialize -> JSON -> reload', () => {
    const exported = serializeParticleSystemConfig(ARC);
    const reparsed = clone(exported);

    // The particle-system default diff would drop every arc key; the arc
    // branch must keep them so `window.editor.load()` can restore the state.
    expect(reparsed.kind).toBe('electric-arc');
    expect(reparsed.start).toEqual({ x: -1.1, y: 0.2, z: 0 });
    expect(reparsed.end).toEqual({ x: 1.1, y: 0.2, z: 0.5 });
    expect(reparsed.offset).toEqual({ x: 2.2, y: 0, z: 0.5 });
    expect(reparsed.rotationZ).toBe(15);
    expect(reparsed.glow).toEqual({
      enabled: true,
      width: 6.5,
      intensity: 1.35,
      profile: 'gaussian',
    });
    expect(reparsed._editorData).toEqual({ textureId: 'POINT' });
  });

  test('particle-system configs still export as a default diff', () => {
    const psConfig = { duration: 3, maxParticles: 42 };
    const exported = serializeParticleSystemConfig(psConfig);
    expect(exported.duration).toBe(3);
    expect(exported.maxParticles).toBe(42);
    // Keys equal to the engine default are omitted from the diff form.
    expect(exported.startLifetime).toBeUndefined();
  });

  test('edit -> serialize -> reload -> runtime keeps every persistent field', () => {
    const live = clone(ARC);
    // panel edit: move the end anchor through the relative offset handle
    live.offset.x += 0.3;
    live.end.x = live.start.x + live.offset.x;

    const target = clone(ARC);
    const recreated: number[] = [];
    loadParticleSystem({
      config: JSON.parse(JSON.stringify(serializeParticleSystemConfig(live))),
      particleSystemConfig: target,
      recreateParticleSystem: (markAsDirty) => recreated.push(Number(markAsDirty)),
    });

    expect(recreated).toEqual([0]); // restored record drove one recreate
    expect(target.kind).toBe('electric-arc');
    expect(target.offset.x).toBeCloseTo(2.5, 5);
    expect(target.end.x).toBeCloseTo(1.4, 5);
    expect(target.start.x).toBeCloseTo(-1.1, 5);
    expect(target.rotationZ).toBe(15);
    // particle-system defaults must not leak into the restored arc record
    expect(target.maxParticles).toBeUndefined();
  });
});

describe('electric-arc endpoint transform model', () => {
  test('zero offset reproduces the authored absolute endpoints', () => {
    const start = { ...ARC.start };
    const offset = {
      x: ARC.end.x - ARC.start.x,
      y: ARC.end.y - ARC.start.y,
      z: ARC.end.z - ARC.start.z,
    };
    const effectiveEnd = {
      x: start.x + offset.x,
      y: start.y + offset.y,
      z: start.z + offset.z,
    };
    expect(effectiveEnd).toEqual(ARC.end);
  });

  test('offset edits move the end anchor and keep the start pinned', () => {
    const start = { ...ARC.start };
    const offset = { ...ARC.offset };
    offset.y += 1.5;
    const effectiveEnd = {
      x: start.x + offset.x,
      y: start.y + offset.y,
      z: start.z + offset.z,
    };
    expect(start).toEqual(ARC.start);
    expect(effectiveEnd.y).toBeCloseTo(1.7, 5);
  });
});

describe('engine live-update contract', () => {
  test('normalizeElectricArcConfig resolves absolute endpoints', () => {
    const normalized = normalizeElectricArcConfig(clone(ARC) as any);
    expect(normalized.start.x).toBeCloseTo(-1.1, 5);
    expect(normalized.end.z).toBeCloseTo(0.5, 5);
    expect(normalized.rotationZ).toBe(15);
  });

  test('mergeLiveConfig applies start / end / rotationZ', () => {
    const normalized = normalizeElectricArcConfig(clone(ARC) as any);
    mergeLiveConfig(normalized, {
      start: { x: 1, y: 2, z: 3 },
      end: { x: 4, y: 5, z: 6 },
      rotationZ: 90,
    } as any);
    expect(normalized.start.x).toBe(1);
    expect(normalized.end.z).toBe(6);
    expect(normalized.rotationZ).toBe(90);
  });

  test('mergeLiveConfig consumes persistent fields, skips the derived chord', () => {
    const normalized = normalizeElectricArcConfig(clone(ARC) as any);
    mergeLiveConfig(normalized, {
      offset: { x: 9, y: 9, z: 9 },
      startOffset: { x: 0.5, y: 0, z: 0 },
      startRotation: { pitch: 10 },
      endRotation: { yaw: 20 },
    } as any);
    // the editor-relative chord `offset` stays derived (never in the engine)
    expect((normalized as any).offset).toBeUndefined();
    // persistent transforms ARE part of the engine contract since 4.1.2
    expect(normalized.startOffset.x).toBeCloseTo(0.5, 5);
    expect(normalized.startRotation.pitch).toBe(10);
    expect(normalized.startRotation.yaw).toBe(0);
    expect(normalized.endRotation.yaw).toBe(20);
    expect(normalized.start.x).toBeCloseTo(-1.1, 5);
  });

  test('structural keys are flagged for a backend rebuild', () => {
    expect(touchesStructuralField({ segments: 64 } as any)).toBe(true);
    expect(touchesStructuralField({ chaosAlgorithm: 'pulse' } as any)).toBe(true);
    expect(touchesStructuralField({ rotationZ: 45 } as any)).toBe(false);
    expect(touchesStructuralField({ chaos: 0.5 } as any)).toBe(false);
  });
});
