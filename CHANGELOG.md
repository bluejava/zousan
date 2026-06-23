# Changelog

## 4.0.0 - 2026-06-23

### Breaking Changes

- Changed `finally()` to match native `Promise.prototype.finally()` behavior. It now preserves the original fulfillment value or rejection reason unless the cleanup handler throws or returns a rejected promise.
- Changed the CommonJS package entry from `zousan-min.js` to `zousan-min.cjs`.
- Added `"type": "module"` and package `"exports"` metadata. ESM consumers now import the source module at `src/zousan.js`, while CommonJS consumers use `zousan-min.cjs`.
- Removed the generated `zousan-esm-min.js` artifact.
- Deep imports of removed or renamed distribution files, such as `zousan/zousan-min.js` or `zousan/zousan-esm-min.js`, are no longer supported.

### Changed

- Replaced the minified ESM build with a direct ESM source entry for modern bundlers.
- Replaced the shell-pipeline build with a Rollup/Terser build script that writes the generated bundle only after a successful build.
- Added `prepack` so `npm pack` and `npm publish` rebuild `zousan-min.cjs` before packaging.
- Added a package `files` allowlist so published tarballs contain only runtime files plus npm's required metadata.

### Fixed

- Added tests covering native-compatible `finally()` value preservation, rejection preservation, and cleanup failure behavior.
- Updated test installation to use `npm ci --prefix test`, avoiding lockfile rewrites during normal test runs.
- Updated test/build dependencies and lockfiles to remove known audit vulnerabilities from the active development dependency graph.
