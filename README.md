# THREE Particles Editor

The best-in-class particle framework for Three.js — now with a WebGPU compute simulation. This is the Unity-style visual editor and offline example gallery that goes with it: tune effects live, then export ready-to-paste configs for the [@cyberluke/three-particles](https://github.com/cyberluke/three-particles) library.

Why it stands out:

- **WebGPU compute** — gravity, velocity, 7 lifetime modifiers, point/directional force fields + collision planes and 3D simplex noise run in Three.js TSL compute kernels: 50K–350K+ textured particles at full framerate, one draw call. (The CPU path used to be the bottleneck for real 350K+ counts — the whole simulation was reworked around compute; emission, sub-emitters and `updateConfig()` remain CPU, the TRAIL renderer always simulates on CPU.)
- **Five renderer types in the exported config** — `POINTS` billboard quads, `INSTANCED` sprites (no `gl_PointSize` limit), `TRAIL` ribbons with width/opacity/color tapering, `MESH` debris/gems/coins with full 3D rotation and lighting, `FLUID` volumetric-metaball liquid (sphere normals, Beer-Lambert absorption, Fresnel reflections).
- **Unity-familiar workflow** — bursts, sub-emitters, collision planes (kill/clamp/bounce), Bézier over-lifetime curves baked to 256-sample lookups; every example ships as a copy-paste config.
- **Pinned versions** — three.js r186 (`"three": "^0.186.0"`), svelte 5 editor.
- **React Three Fiber supported and working** — no wrapper package needed, drive the engine from R3F hooks directly:

### Usage with React Three Fiber

The library works seamlessly with React Three Fiber. No additional wrapper package is needed — use createParticleSystem directly with React hooks:

```tsx
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { createParticleSystem, Shape, type ParticleSystem } from '@newkrok/three-particles';
import * as THREE from 'three';

function FireEffect({ config }: { config?: Record<string, unknown> }) {
  const groupRef = useRef<THREE.Group>(null);
  const systemRef = useRef<ParticleSystem | null>(null);

  useEffect(() => {
    const system = createParticleSystem({
      duration: 5,
      looping: true,
      maxParticles: 200,
      startLifetime: { min: 0.5, max: 1.5 },
      startSpeed: { min: 1, max: 3 },
      startSize: { min: 0.3, max: 0.8 },
      startColor: {
        min: { r: 1, g: 0.2, b: 0 },
        max: { r: 1, g: 0.8, b: 0 },
      },
      gravity: -1,
      emission: { rateOverTime: 50 },
      shape: { shape: Shape.CONE, cone: { angle: 0.2, radius: 0.3 } },
      renderer: {
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      },
      ...config,
    });

    systemRef.current = system;
    groupRef.current?.add(system.instance);

    return () => {
      system.dispose();
    };
  }, [config]);

  useFrame((_, delta) => {
    systemRef.current?.update({
      now: performance.now(),
      delta,
      elapsed: 0,
    });
  });

  return <group ref={groupRef} />;
}

// In your R3F Canvas:
// <Canvas>
//   <FireEffect />
// </Canvas>
```

Key points:

- Use useEffect to create and dispose the particle system
- Use useFrame to drive updates each frame (call system.update() instead of updateParticleSystems() for per-system control)
- Add the system.instance to a `<group>` ref so R3F manages the scene graph
- Return a cleanup function from useEffect that calls system.dispose()
- **Offline gallery** — all example modules, three.js builds and textures are mirrored as static files, so the whole page works without a network.

Author: **CyberLuke** — the single maintained line since v4.

## Installation

From npm (both are public):

```bash
npm install @cyberluke/three-particles
npm install @cyberluke/three-particles-editor
```

The engine package ships `dist/index.js` + `dist/webgpu.js` ESM entries and `dist/three-particles.min.js`. No separate CDN bundle exists; use the ESM files with an import map or your bundler.

From a clone of this repo (workspace layout: editor at the root, engine in `packages/three-particles`):

```bash
npm install               # installs both workspaces
npm run dev               # engine tsup + mirror sync + rollup -w
npm start                 # serve ./public on 127.0.0.1:5173
```

## Editor scripts

- `npm run build` — `engine:build` (tsup) → `mirror` (sync `public/lib/` copies) → `build:editor` (themes + rollup)
- `npm run dev` / `npm run start` — dev server / static server
- `npm run lint` / `npm run format` — lint + prettier

## Features

- Visual editor for creating and fine-tuning particle effects
- Real-time preview of particle systems (WebGPU-backed via the engine's compute path)
- Export configurations for use with the @cyberluke/three-particles library
- Customizable particle properties (position, velocity, size, color, alpha, rotation, etc.)
- Support for various emitter shapes and parameters
- Offline example gallery — same code as the live page, mirrored assets, no external requests

## Screenshots

<img src="https://user-images.githubusercontent.com/13141660/167223378-e3002af9-2800-49b3-a955-9cb5fb54b103.png" width="320px">
<img src="https://user-images.githubusercontent.com/13141660/167223438-493cf422-c327-43d3-a622-dacc20ddc07e.png" width="320px">
<img src="https://user-images.githubusercontent.com/13141660/167223497-c4880d7c-eec2-4c41-b83e-82cc571e64c3.png" width="320px">
<img src="https://user-images.githubusercontent.com/13141660/167223587-a5bd6e40-ef4f-434f-a952-aad56041def7.png" width="320px">
