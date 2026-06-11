---
name: Generated file deduplication
description: lib/api-zod and lib/api-client-react had duplicate exports from a double codegen run blocking esbuild builds
---

# Generated file deduplication

## The rule
When `pnpm --filter @workspace/api-server run build` fails with "Multiple exports with the same name" in `lib/api-zod` or `lib/api-client-react`, the generated files have been corrupted by a double-codegen run.

## How to apply
Inspect the file, find the line where content repeats (grep for a known export name to see two hits), then slice out the first (partial/old) copy keeping only:
1. The file header + imports (typically lines 1–8 for api-zod, 1–163 for api-client-react)
2. The complete second copy starting from its first export

For api-zod: keep lines 1-8 + everything from the second `GetCurrentAuthUserHeader` onwards.
For api-client-react: keep lines 1-163 (includes healthCheck) + everything from the second `getGetCurrentAuthUserUrl` onwards.

After slicing, verify `HealthCheckResponse` is still exported from api-zod (it was only in lines 9-16 of the old first copy — re-add it manually if missing).

**Why:** Orval codegen has been run twice against the same output file without clearing it first, appending a second complete copy. The proper fix long-term is to run `pnpm --filter @workspace/api-spec run codegen` from a clean state.
