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

## API connectivity

The frontend (generated client hooks **and** the hand-written `fetch("/api/...")`
calls in `useAuth`, `use-tts`, `Landing`, `Onboarding`, and `BookUpload`) resolves
every API request through a single base, controlled by one optional build-time var:

| Variable       | Default          | Effect                                              |
| -------------- | ---------------- | --------------------------------------------------- |
| `VITE_API_URL` | _unset_ (empty)  | When set, every API call is prefixed with this absolute origin. When unset, calls stay same-origin relative (`/api/...`). |

How it is wired:

- `src/main.tsx` calls `setBaseUrl(import.meta.env.VITE_API_URL)` at startup when the
  var is set, so the generated client hooks hit the remote host.
- The hand-written fetches call `apiUrl(...)` (`src/lib/api-url.ts`), which delegates
  to `resolveApiUrl()` from `@workspace/api-client-react` — the same base the
  generated client uses. So both always agree.

For the deployed app to actually function you must make `/api/*` resolve to the
running API server. Choose one:

### Option A — Proxy `/api` from Vercel to the API host (recommended)

Leave `VITE_API_URL` **unset** and add a rewrite to `vercel.json` that forwards API
calls to wherever the API server runs. Keep the SPA catch-all **after** the API rule
(Vercel matches top-to-bottom):

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
so the relative `fetch("/api/...")` calls and cookie-based Replit OIDC auth keep
working with no server changes. **This is the recommended option** precisely because
it sidesteps the cross-origin auth caveat below.

### Option B — Point the client at an absolute API base URL

Set `VITE_API_URL` in Vercel's Environment Variables to the API origin
(e.g. `https://your-api-host`). No code changes are needed — the wiring described
above prefixes every API call with that value at runtime, and `vercel.json` only
needs the SPA catch-all rewrite.

> ⚠️ Cross-origin auth caveat: Replit OIDC auth uses session cookies set by the API
> server. With Option B the API is on a different origin than the Vercel app, so for
> auth to work the **API server** must additionally be configured for cross-site use:
> session cookies as `SameSite=None; Secure`, CORS allowing the Vercel origin with
> credentials, and the OIDC `returnTo` redirect handling updated to send users back
> to the frontend origin (the current server only accepts same-origin relative
> `returnTo` paths). Until that server work is done, prefer **Option A**, which keeps
> everything same-origin and needs none of it.
