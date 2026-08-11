# scripts/

## Responsibility

Houses standalone Node scripts for release management. One script bumps plugin metadata during versioning; one extracts release notes; one copies Obsidian store artifacts.

## Design

- CLI-style top-level scripts with no exports.
- They use Node built-ins and write repo-root files in place.
- `version-bump.mjs` is driven by `npm_package_version` and updates `manifest.json`, `versions.json`, and `src/consts.ts`.
- `release-notes.mjs` accepts a version argument, reads `CHANGELOG.md`, and emits `release-notes.md`.
- `package.mjs` validates version consistency and copies `dist/` into `release/`. It also runs after every successful `tsdown` build via `onSuccess`.

## Flow

1. Package scripts invoke the files with `node`.
2. `version-bump.mjs` writes the target version into plugin metadata.
3. `release-notes.mjs` scans `CHANGELOG.md` for the matching `##` section.
4. `package.mjs` copies `main.js`, `manifest.json`, and `styles.css` for Obsidian plugin submission.

## Integration

- `package.json` exposes `ver`, `notes`, and `package`.
- Version scripts depend on `manifest.json`, `versions.json`, and `CHANGELOG.md` at the repo root.
