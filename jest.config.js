/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Jest 30's `default-esm` preset does not inject `jest`/`describe`/`it`/…
  // onto `globalThis`, which breaks the ~40 test files written against the
  // legacy CJS globals. This small setup file mirrors `@jest/globals` onto
  // `globalThis` (see the file for details).
  setupFiles: ['<rootDir>/src/jest-globals-setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Route `three` subpaths to physical ESM builds so Jest's CJS require()
    // does not go through the deprecated `three.cjs` shim (which itself
    // `require`s the ESM module and trips Jest's non-ESM parser).
    '^three$': '<rootDir>/node_modules/three/build/three.module.js',
    '^three/webgpu$': '<rootDir>/node_modules/three/build/three.webgpu.js',
    '^three/tsl$': '<rootDir>/node_modules/three/build/three.tsl.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          verbatimModuleSyntax: false,
          // Transpile-only: this Jest suite is numeric parity, not a type
          // program. The `@types/three@0.183/0.186` subpath exports do not
          // list TSL's `Node` / `ShaderNodeObject`, and `strict:true` rejects
          // the proxy-object idioms every `Fn(...)` chain in `webgpu/*.ts`
          // uses. `packages/three-particles/tsconfig.json` still runs a full
          // type pass for the tsup `dist/` build.
          isolatedModules: true,
        },
      },
    ],
  },
};
