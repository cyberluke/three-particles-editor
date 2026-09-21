import { blendingMap } from '@cyberluke/three-particles';
import { getTexture } from '../assets';
import { getDepthTexture } from '../world';
import { openTextureSelectorModal } from '../texture-selector/texture-selector';

type RendererEntriesParams = {
  parentFolder: any;
  particleSystemConfig: any;
  recreateParticleSystem: () => void;
};

type RendererEntriesResult = {
  onReset: () => void;
  onParticleSystemChange: () => void;
  onUpdate: () => void;
  onAssetUpdate: () => void;
};

export const createRendererEntries = ({
  parentFolder,
  particleSystemConfig,
  recreateParticleSystem,
}: RendererEntriesParams): RendererEntriesResult => {
  let lastUsedTextureId = '';

  const folder = parentFolder.addFolder('Renderer');
  folder.close();

  if (!particleSystemConfig.renderer.rendererType) {
    particleSystemConfig.renderer.rendererType = 'POINTS';
  }

  folder
    .add(particleSystemConfig.renderer, 'rendererType', [
      'POINTS',
      'INSTANCED',
      'TRAIL',
      'MESH',
      'FLUID',
    ])
    .onChange((value: string) => {
      if (value === 'MESH') {
        particleSystemConfig.renderer.depthWrite = true;
      }
      if (value === 'FLUID' && !particleSystemConfig.renderer.fluid) {
        // Seed FluidConfig with the engine's documented defaults so
        // sliders always bind to a live object (see FluidConfig).
        particleSystemConfig.renderer.fluid = {
          stretch: 1.0,
          absorption: 1.44,
          ior: 1.33,
        };
      }
      rebuild();
      recreateParticleSystem();
    })
    .listen();

  const setConfigByTexture = (textureId: string): void => {
    lastUsedTextureId = textureId;
    const texture = getTexture(textureId);
    if (texture) {
      const { map, tiles } = texture;
      particleSystemConfig.map = map;
      particleSystemConfig._editorData.textureId = textureId;
      particleSystemConfig.textureSheetAnimation.tiles.x =
        tiles?.x || particleSystemConfig.textureSheetAnimation.tiles.x;
      particleSystemConfig.textureSheetAnimation.tiles.y =
        tiles?.y || particleSystemConfig.textureSheetAnimation.tiles.y;
    }
  };

  let controllers: any[] = [];

  const rebuild = (): void => {
    controllers.forEach((controller) => controller.destroy());
    controllers = [];

    const isMesh = particleSystemConfig.renderer.rendererType === 'MESH';

    if (isMesh) {
      // Mesh particles use the engine's built-in 1x1 white texture,
      // sprite textures are not applicable ??? texture UI is hidden
    } else {
      // Add a display field showing current texture
      const displayTextureConfig = {
        selectedTexture: particleSystemConfig._editorData.textureId || 'None',
      };

      controllers.push(
        folder
          .add(displayTextureConfig, 'selectedTexture')
          .name('Selected Texture')
          .listen()
          .disable()
      );

      // Add button to open texture selector
      const textureSelectButton = {
        selectTexture: () => {
          openTextureSelectorModal({
            currentTextureId: particleSystemConfig._editorData.textureId,
            onSelect: (textureId: string) => {
              particleSystemConfig._editorData.textureId = textureId;
              displayTextureConfig.selectedTexture = textureId;
              setConfigByTexture(textureId);
              recreateParticleSystem();
            },
          });
        },
      };

      controllers.push(folder.add(textureSelectButton, 'selectTexture').name('Choose Texture...'));

      setConfigByTexture(particleSystemConfig._editorData.textureId);
    }

    if (!particleSystemConfig.simulationBackend) {
      particleSystemConfig.simulationBackend = 'AUTO';
    }
    controllers.push(
      folder
        .add(particleSystemConfig, 'simulationBackend', ['AUTO', 'CPU', 'GPU'])
        .onChange(recreateParticleSystem)
        .listen()
    );

    controllers.push(
      folder
        .add(particleSystemConfig.renderer, 'discardBackgroundColor')
        .onChange(recreateParticleSystem)
        .listen()
    );

    controllers.push(
      folder
        .add(particleSystemConfig.renderer, 'backgroundColorTolerance', 0.0, 2.0, 0.001)
        .onChange(recreateParticleSystem)
        .listen()
    );

    controllers.push(
      folder
        .addColor(particleSystemConfig.renderer, 'backgroundColor')
        .onChange(recreateParticleSystem)
        .listen()
    );

    if (typeof particleSystemConfig.renderer.blending === 'number')
      particleSystemConfig.renderer.blending = Object.keys(blendingMap).find(
        (entry) =>
          blendingMap[entry as keyof typeof blendingMap] === particleSystemConfig.renderer.blending
      );
    controllers.push(
      folder
        .add(particleSystemConfig.renderer, 'blending', [
          'THREE.NoBlending',
          'THREE.NormalBlending',
          'THREE.AdditiveBlending',
          'THREE.SubtractiveBlending',
          'THREE.MultiplyBlending',
        ])
        .listen()
        .onChange(recreateParticleSystem)
    );

    controllers.push(
      folder
        .add(particleSystemConfig.renderer, 'transparent')
        .onChange(recreateParticleSystem)
        .listen()
    );

    controllers.push(
      folder
        .add(particleSystemConfig.renderer, 'depthTest')
        .onChange(recreateParticleSystem)
        .listen()
    );

    controllers.push(
      folder
        .add(particleSystemConfig.renderer, 'depthWrite')
        .onChange(recreateParticleSystem)
        .listen()
    );

    // Soft Particles
    if (!particleSystemConfig.renderer.softParticles) {
      particleSystemConfig.renderer.softParticles = {
        enabled: false,
        intensity: 1.0,
      };
    }
    const softParticles = particleSystemConfig.renderer.softParticles;

    controllers.push(
      folder
        .add(softParticles, 'enabled')
        .name('Soft Particles')
        .onChange((value: boolean) => {
          if (value) {
            const depthTex = getDepthTexture();
            if (depthTex) {
              softParticles.depthTexture = depthTex;
            }
          } else {
            delete softParticles.depthTexture;
          }
          recreateParticleSystem();
        })
        .listen()
    );

    controllers.push(
      folder
        .add(softParticles, 'intensity', 0.01, 5.0, 0.01)
        .name('Soft Particles Intensity')
        .onChange(recreateParticleSystem)
        .listen()
    );

    // Fluid Metaball renderer (§34) — only exposed when the requested
    // rendererType is `FLUID`. Values mirror the engine's defaults in
    // `FluidConfig`; the shared uniforms
    // (`fluidStretch / fluidAbsorption / fluidIor`) live on the TSL material
    // built by `createFluidTSLMaterial`, so any edit requires a full
    // recreate (which is already what `recreateParticleSystem` does).
    const isFluid = particleSystemConfig.renderer.rendererType === 'FLUID';
    if (isFluid) {
      if (!particleSystemConfig.renderer.fluid) {
        particleSystemConfig.renderer.fluid = {
          stretch: 1.0,
          absorption: 1.44,
          ior: 1.33,
        };
      }
      const fluid = particleSystemConfig.renderer.fluid;
      // Seed the optional knobs (screen-space pass chain) on the same object.
      // The three dambreak / metaball example configs ship only a subset of
      // `FluidConfig`, so every bound value is backfilled before `gui.add`.
      if (typeof fluid.stretch !== 'number') fluid.stretch = 1.0;
      if (typeof fluid.absorption !== 'number') fluid.absorption = 1.44;
      if (typeof fluid.ior !== 'number') fluid.ior = 1.33;
      if (typeof fluid.sphereSize !== 'number') fluid.sphereSize = 1.2;
      if (typeof fluid.density !== 'number') fluid.density = 0.7;
      if (!Array.isArray(fluid.waterColor) || fluid.waterColor.length !== 3) {
        fluid.waterColor = [0.0, 0.7375, 0.95];
      }
      if (typeof fluid.sphereRender !== 'boolean') fluid.sphereRender = true;

      const fluidFolder = folder.addFolder('Fluid');
      fluidFolder
        .add(fluid, 'stretch', 1.0, 6.0, 0.01)
        .name('Stretch (velocity smear)')
        .onChange(recreateParticleSystem)
        .listen();
      fluidFolder
        .add(fluid, 'absorption', 0.05, 4.0, 0.01)
        .name('Absorption (Beer-Lambert)')
        .onChange(recreateParticleSystem)
        .listen();
      fluidFolder
        .add(fluid, 'ior', 1.0, 2.4, 0.001)
        .name('IOR (Fresnel)')
        .onChange(recreateParticleSystem)
        .listen();
      fluidFolder
        .add(fluid, 'sphereSize', 0.01, 10.0, 0.01)
        .name('Sphere size (world units)')
        .onChange(recreateParticleSystem)
        .listen();
      fluidFolder
        .add(fluid, 'density', 0.0, 5.0, 0.01)
        .name('Density k')
        .onChange(recreateParticleSystem)
        .listen();
      // Per-axis water tint: three number fields on the fixed 3-tuple.
      ['R', 'G', 'B'].forEach((axisLabel, idx) => {
        const proxy = { v: fluid.waterColor[idx] };
        fluidFolder
          .add(proxy, 'v', 0.0, 1.0, 0.001)
          .name(`Water ${axisLabel}`)
          .onChange((v: number) => {
            fluid.waterColor[idx] = v;
            // Force a re-read so the slider shows the canonical value even
            // when a neighbouring channel changes the array (no-op when it
            // is 0/1/0 and the user does not touch this axis).
            recreateParticleSystem();
          })
          .listen();
      });
      fluidFolder
        .add(fluid, 'sphereRender')
        .name('Sphere debug render')
        .onChange(recreateParticleSystem)
        .listen();
      // Ocean-style solver selector (`FluidConfig.solver`): both solvers share
      // the screen-space pass chain, only the compute kernels differ.
      if (typeof fluid.solver !== 'string' || !fluid.solver) fluid.solver = 'MLS-MPM';
      fluidFolder
        .add(fluid, 'solver', ['MLS-MPM', 'SPH'])
        .name('Solver')
        .onChange((value: string) => {
          const renderer = particleSystemConfig.renderer;
          if (value === 'SPH' && !renderer.sph) {
            // SPH defaults (reference `sph/sph.ts` parameter block).
            renderer.sph = {
              kernelRadius: 0.07,
              mass: 1,
              restDensity: 15000,
              stiffness: 20,
              nearStiffness: 1,
              viscosity: 100,
              dt: 0.006,
              gravity: -9.8,
              sphereSize: fluid.sphereSize,
              halfBoxSize: [1, 2, 1],
              boxWidthRatio: 1,
            };
          }
          if (value === 'MLS-MPM' && !renderer.mlsMpm) {
            // MLS-MPM defaults (reference `main.ts` parameter block).
            renderer.mlsMpm = {
              stiffness: 3,
              restDensity: 4,
              dynamicViscosity: 0.1,
              dt: 0.2,
              gravity: -0.3,
              cellSize: 1,
              gridSize: 64,
              sphereSize: fluid.sphereSize,
              boxSize: [40, 30, 60],
              boxWidthRatio: 1,
            };
          }
          rebuild();
          recreateParticleSystem();
        })
        .listen();
      fluidFolder.close();
    }

    // MLS-MPM solver (port of `matsuoka-601/webgpu-ocean`, `mls-mpm/`). The
    // 2 sub-steps / `64^3` lattice kernels are rebuilt with the pool, so every
    // edit goes through `recreateParticleSystem`.
    const fluidSolverName = String(particleSystemConfig.renderer.fluid?.solver ?? 'MLS-MPM')
      .trim()
      .toUpperCase();
    const isMLSMPM =
      particleSystemConfig.renderer.rendererType === 'FLUID' && fluidSolverName !== 'SPH';
    if (isMLSMPM) {
      if (!particleSystemConfig.renderer.mlsMpm) {
        particleSystemConfig.renderer.mlsMpm = {
          stiffness: 3,
          restDensity: 4,
          dynamicViscosity: 0.1,
          dt: 0.2,
          gravity: -0.3,
          sphereSize: 1.2,
          boxWidthRatio: 1,
        };
      }
      const mls = particleSystemConfig.renderer.mlsMpm;
      // Seed the lattice / box knobs the WaterBall demo drives explicitly so
      // the sliders bind to live numbers (`MLSMPMConfig` fields).
      if (typeof mls.boxWidthRatio !== 'number') mls.boxWidthRatio = 1;
      if (typeof mls.cellSize !== 'number') mls.cellSize = 1;
      if (typeof mls.gridSize !== 'number') mls.gridSize = 64;
      if (!Array.isArray(mls.boxSize) || mls.boxSize.length !== 3) {
        mls.boxSize = [40, 30, 60];
      }
      const mlsFolder = folder.addFolder('MLS-MPM');
      mlsFolder
        .add(mls, 'stiffness', 0.1, 20, 0.01)
        .name('Stiffness k')
        .onChange(recreateParticleSystem)
        .listen();
      mlsFolder
        .add(mls, 'restDensity', 0.1, 20, 0.01)
        .name('Rest density d0')
        .onChange(recreateParticleSystem)
        .listen();
      mlsFolder
        .add(mls, 'dynamicViscosity', 0, 1, 0.001)
        .name('Dynamic viscosity mu')
        .onChange(recreateParticleSystem)
        .listen();
      mlsFolder
        .add(mls, 'dt', 0.01, 1, 0.001)
        .name('Step dt (per sub-step)')
        .onChange(recreateParticleSystem)
        .listen();
      mlsFolder
        .add(mls, 'gravity', -3, 3, 0.01)
        .name('Gravity (y)')
        .onChange(recreateParticleSystem)
        .listen();
      mlsFolder
        .add(mls, 'sphereSize', 0.01, 10, 0.01)
        .name('Sphere size')
        .onChange(recreateParticleSystem)
        .listen();
      mlsFolder
        .add(mls, 'boxWidthRatio', 0.1, 3, 0.001)
        .name('Box z ratio')
        .onChange(recreateParticleSystem)
        .listen();
      mlsFolder
        .add(mls, 'cellSize', 0.5, 4, 0.5)
        .name('Cell size')
        .onChange(recreateParticleSystem)
        .listen();
      mlsFolder
        .add(mls, 'gridSize', 8, 64, 1)
        .name('Grid size (per axis)')
        .onChange(recreateParticleSystem)
        .listen();
      // Simulation box — the dambreak lattice extent (`boxSize` 3-tuple).
      ['X', 'Y', 'Z'].forEach((axisLabel, idx) => {
        const proxy = { v: mls.boxSize[idx] };
        mlsFolder
          .add(proxy, 'v', 1, 64, 1)
          .name(`Box ${axisLabel}`)
          .onChange((v: number) => {
            mls.boxSize[idx] = v;
            recreateParticleSystem();
          })
          .listen();
      });
      mlsFolder.close();
    }

    // SPH solver (port of `matsuoka-601/webgpu-ocean`, `sph/`): fixed-radius
    // neighbour search with double-density relaxation.
    const isSPH =
      particleSystemConfig.renderer.rendererType === 'FLUID' && fluidSolverName === 'SPH';
    if (isSPH) {
      if (!particleSystemConfig.renderer.sph) {
        particleSystemConfig.renderer.sph = {
          kernelRadius: 0.07,
          mass: 1,
          restDensity: 15000,
          stiffness: 20,
          nearStiffness: 1,
          viscosity: 100,
          dt: 0.006,
          gravity: -9.8,
          sphereSize: 1.2,
          boxWidthRatio: 1,
        };
      }
      const sph = particleSystemConfig.renderer.sph;
      // Seed the box-extent / ratio knobs the SPH demo drives explicitly so
      // the sliders bind to live numbers (`SPHConfig` fields).
      if (typeof sph.boxWidthRatio !== 'number') sph.boxWidthRatio = 1;
      if (!Array.isArray(sph.halfBoxSize) || sph.halfBoxSize.length !== 3) {
        sph.halfBoxSize = [1, 2, 1];
      }
      const sphFolder = folder.addFolder('SPH');
      sphFolder
        .add(sph, 'kernelRadius', 0.01, 0.5, 0.001)
        .name('Kernel radius h')
        .onChange(recreateParticleSystem)
        .listen();
      sphFolder
        .add(sph, 'mass', 0.1, 10, 0.01)
        .name('Mass m')
        .onChange(recreateParticleSystem)
        .listen();
      sphFolder
        .add(sph, 'restDensity', 100, 30000, 1)
        .name('Rest density')
        .onChange(recreateParticleSystem)
        .listen();
      sphFolder
        .add(sph, 'stiffness', 0.1, 100, 0.01)
        .name('Stiffness k')
        .onChange(recreateParticleSystem)
        .listen();
      sphFolder
        .add(sph, 'nearStiffness', 0.01, 20, 0.001)
        .name('Near stiffness')
        .onChange(recreateParticleSystem)
        .listen();
      sphFolder
        .add(sph, 'viscosity', 0, 300, 0.1)
        .name('Viscosity mu')
        .onChange(recreateParticleSystem)
        .listen();
      sphFolder
        .add(sph, 'dt', 0.0005, 0.05, 0.0005)
        .name('Step dt (per sub-step)')
        .onChange(recreateParticleSystem)
        .listen();
      sphFolder
        .add(sph, 'gravity', -20, 20, 0.01)
        .name('Gravity (y)')
        .onChange(recreateParticleSystem)
        .listen();
      sphFolder
        .add(sph, 'sphereSize', 0.01, 10, 0.01)
        .name('Sphere size')
        .onChange(recreateParticleSystem)
        .listen();
      sphFolder
        .add(sph, 'boxWidthRatio', 0.1, 3, 0.001)
        .name('Box z ratio')
        .onChange(recreateParticleSystem)
        .listen();
      // Half-extents of the simulation box — the SPH dambreak extent.
      ['X', 'Y', 'Z'].forEach((axisLabel, idx) => {
        const proxy = { v: sph.halfBoxSize[idx] };
        sphFolder
          .add(proxy, 'v', 0.1, 4, 0.01)
          .name(`Half box ${axisLabel}`)
          .onChange((v: number) => {
            sph.halfBoxSize[idx] = v;
            recreateParticleSystem();
          })
          .listen();
      });
      sphFolder.close();
    }
  };

  rebuild();

  let lastRendererType = particleSystemConfig.renderer.rendererType || 'POINTS';

  return {
    onReset: rebuild,
    onParticleSystemChange: (): void => {
      const currentRendererType = particleSystemConfig.renderer.rendererType || 'POINTS';
      if (lastRendererType !== currentRendererType) {
        lastRendererType = currentRendererType;
        rebuild();
        return;
      }
      // It looks onChange doesn't work on dropdown entry so have to handle it manually
      if (lastUsedTextureId !== particleSystemConfig._editorData.textureId) {
        setConfigByTexture(particleSystemConfig._editorData.textureId);
        recreateParticleSystem();
      }
    },
    onUpdate: (): void => {},
    onAssetUpdate: rebuild,
  };
};
