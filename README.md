# THREE Particles Editor

The best-in-class particle framework for Three.js — now with a WebGPU compute simulation. This is the Unity-style visual editor and offline example gallery that goes with it: tune effects live, then export ready-to-paste configs for the [@cyberluke/three-particles](https://github.com/cyberluke/three-particles) library.

Why it stands out:

- **WebGPU compute** — gravity, velocity, 7 lifetime modifiers, point/directional force fields + collision planes and 3D simplex noise run in Three.js TSL compute kernels: 50K–350K+ textured particles at full framerate, one draw call. (The CPU path used to be the bottleneck for real 350K+ counts — the whole simulation was reworked around compute; emission, sub-emitters and `updateConfig()` remain CPU, the TRAIL renderer always simulates on CPU.)
- **Five renderer types in the exported config** — `POINTS` billboard quads, `INSTANCED` sprites (no `gl_PointSize` limit), `TRAIL` ribbons with width/opacity/color tapering, `MESH` debris/gems/coins with full 3D rotation and lighting, `FLUID` volumetric-metaball liquid (sphere normals, Beer-Lambert absorption, Fresnel reflections).
- **Unity-familiar workflow** — bursts, sub-emitters, collision planes (kill/clamp/bounce), Bézier over-lifetime curves baked to 256-sample lookups; every example ships as a copy-paste config.
- **Pinned versions** — three.js r186 (`"three": "^0.186.0"`), svelte 5 editor. With this engine we do not recommend react-three-fiber for now: react 19.3 is breaking it upstream ([react-three-fiber#3915](https://github.com/pmndrs/react-three-fiber/issues/3915)) — use three.js r186+ directly.
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
