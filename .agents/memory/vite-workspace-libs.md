---
name: Vite workspace lib resolution
description: How to make a new @workspace/* lib importable in the alphabet-ai Vite app
---

## Required steps for a new lib
1. Add to `artifacts/alphabet-ai/package.json` devDependencies: `"@workspace/my-lib": "workspace:*"`
2. Run `pnpm install` to create the symlink in `artifacts/alphabet-ai/node_modules/@workspace/`
3. Add explicit Vite alias in `artifacts/alphabet-ai/vite.config.ts`:
   ```ts
   "@workspace/my-lib": path.resolve(import.meta.dirname, "../../lib/my-lib/src/index.ts"),
   ```
4. Add lib path to `fs.allow`:
   ```ts
   fs: { strict: true, allow: [path.resolve(import.meta.dirname), path.resolve(import.meta.dirname, "../../lib"), ...] }
   ```
5. Add tsconfig reference in `artifacts/alphabet-ai/tsconfig.json`

**Why:** Vite's `fs.strict: true` blocks serving files outside the root. Symlinks point to `lib/` which is outside `artifacts/alphabet-ai/`. The alias also bypasses any export-field ambiguity with .ts source files.
