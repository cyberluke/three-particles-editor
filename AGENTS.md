# AGENTS.md — three-particles-editor

## Versioning

- Always bump by **minor** version only: 4.0.1 → 4.0.2 → 4.0.3 (never 4.1.0, 4.2.0, 5.0.0).
- Bump both `package.json` files in lockstep: root (`@cyberluke/three-particles-editor`) and `packages/three-particles/` (`@cyberluke/three-particles`).
- After a bump: rebuild (`npm run build`), refresh public + public/lib mirrors, then publish; set `latest` dist-tag to the new version if the registry is slow to promote it.

## Build / publish order

1. `npm run build` (engine tsup → mirror to public/lib + root copies → rollup editor bundle).
2. `npm publish` in `packages/three-particles`, then at root.
3. `npm view <pkg> version` to confirm latest tag.
