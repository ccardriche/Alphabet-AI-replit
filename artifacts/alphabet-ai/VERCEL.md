# Deploying the Alphabet AI frontend to Vercel

This is the static React + Vite single-page app (`@workspace/alphabet-ai`). It can
be built and hosted on Vercel as a static site. The API server (`@workspace/api-server`)
is **not** deployed here — it stays on Replit (or another host) and the frontend
talks to it over relative `/api/*` requests (see "API connectivity" below).

## Vercel project settings

When importing this monorepo into Vercel, set:

| Setting           | Value                       |
| ----------------- | --------------------------- |
| Root Directory    | `artifacts/alphabet-ai`     |
| Framework Preset  | `Vite`                      |
| Build Command     | `pnpm run build`            |
| Output Directory  | `dist/public`               |
| Install Command   | `pnpm install` (default)    |

Because this is a pnpm workspace, leave "Include source files outside of the Root
Directory in the Build Step" **enabled** so Vercel can resolve the `@workspace/*`
dependencies from the monorepo root.

`vercel.json` (in this directory) rewrites every non-asset path to `/index.html`
so the client-side router (wouter) handles deep links and page refreshes.

## Build environment

The build no longer requires any Replit-specific env vars:

- `PORT` — optional; defaults to `5173` (only affects the local dev/preview server).
- `BASE_PATH` — optional; defaults to `/`. On Replit this is set to the artifact's
  path prefix. On Vercel, leave it unset (app serves from the domain root).
- The Replit-only Vite plugins (`@replit/vite-plugin-runtime-error-modal`,
  `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`) are only
  loaded when `REPL_ID` is present, so they are skipped entirely on Vercel.

## Runtime environment variables

The frontend currently consumes **no** `VITE_*` build-time environment variables.
All backend calls are made to same-origin relative paths (`/api/...`), and auth is
handled by redirecting the browser to `/api/login` and `/api/logout`.

There is therefore nothing to "fill in" for the build to succeed. However, for the
deployed app to actually function, you must make the `/api/*` routes resolve to the
running API server. Choose one:

### Option A — Proxy `/api` from Vercel to the API host (recommended)

Add a rewrite to `vercel.json` that forwards API calls to wherever the API server
runs. Keep the SPA catch-all **after** the API rule (Vercel matches top-to-bottom):

```jsonc
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://# FILL IN API HOST/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Replace `# FILL IN API HOST` with the deployed API origin (e.g. the Replit
deployment domain). This keeps requests same-origin from the browser's perspective,
so the existing relative `fetch("/api/...")` calls and cookie-based auth keep working.

### Option B — Point the client at an absolute API base URL

The generated API client exposes `setBaseUrl()` (from `@workspace/api-client-react`).
You could call it at app startup with an env-provided value, e.g.:

```ts
// in src/main.tsx, before rendering
import { setBaseUrl } from "@workspace/api-client-react";
if (import.meta.env.VITE_API_URL) setBaseUrl(import.meta.env.VITE_API_URL);
```

…and set `VITE_API_URL = # FILL IN API HOST` in Vercel. Note this only affects the
generated API hooks; the hand-written `fetch("/api/...")` calls in `useAuth`,
`use-tts`, and a few pages would also need updating. This is a code change beyond
the current static-build scope and is documented here only for completeness.

> ⚠️ Cross-origin auth caveat: Replit OIDC auth uses session cookies set by the API
> server. If the API is on a different origin than the Vercel app, cookies and the
> OIDC redirect flow must be configured for cross-site use (SameSite/None, CORS,
> redirect allowlist). Option A avoids this by keeping everything same-origin.
