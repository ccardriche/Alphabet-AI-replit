---
name: API server runtime file paths under esbuild bundle
description: Why source-relative require()/fs reads of data files break in the api-server, and how to ship data files instead
---

# api-server runtime asset paths break under the esbuild bundle

The api-server dev/prod workflow runs the **esbuild bundle** (`pnpm run build` → `dist/index.mjs`, then `node dist/index.mjs`), NOT the TS source. So any runtime path computed from `import.meta.url` / `__dirname` resolves relative to `dist/`, not `src/`.

**Symptom:** a data file under `src/data/*.json` loaded via `require(path.join(dirname, "../data/..."))` throws `Cannot find module .../api-server/data/...json` at runtime — typecheck stays green because the file exists in source.

**Fix:** import data files statically so esbuild bundles them into the output:
```ts
import data from "../data/fallback-questions.json" with { type: "json" };
```
Verify it actually bundled by grepping a known string from the JSON in `dist/index.mjs`.

**Why:** esbuild does not copy arbitrary sibling files; only what is imported (or explicitly externalized/copied) ends up in `dist`. Runtime path math against the bundle location points at a directory layout that doesn't exist.

**How to apply:** for any data/asset the server reads at runtime, prefer a static import (JSON, or `?raw`-style text) over runtime `fs`/`require` with a source-relative path. If the file genuinely cannot be bundled, add an esbuild copy step in `build.mjs` and resolve from the bundle dir.

Related: OpenAI access in this repo uses the managed Replit integration env vars `AI_INTEGRATIONS_OPENAI_BASE_URL` / `AI_INTEGRATIONS_OPENAI_API_KEY` (no user key). The clients prefer those, then `OPENAI_API_BASE_URL`/`OPENAI_API_KEY`. If neither is set, generation silently falls back to the static question pool — watch for "always falling back" meaning credentials are missing.
