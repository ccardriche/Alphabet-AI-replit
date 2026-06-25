# Deploying Alphabet AI to Vercel

This guide covers hosting the **Alphabet AI** frontend (`artifacts/alphabet-ai`) — the
static React + Vite single-page app — on Vercel so a funder can open a live link and
explore the product without running any code.

> Scope: this deploys the **frontend only**. The Express API server
> (`@workspace/api-server`) is **not** deployed by these steps — see
> [API connectivity](#api-connectivity) for how the hosted frontend reaches a backend,
> and [What still needs human setup](#what-still-needs-human-setup) for the remaining
> dependencies.
>
> For the deeper frontend-specific reference (the two API options, the cross-origin auth
> caveat, etc.) see [`artifacts/alphabet-ai/VERCEL.md`](artifacts/alphabet-ai/VERCEL.md).

## Vercel project settings

This is a **pnpm workspace monorepo**, so the project root on Vercel is the *artifact*
directory, but Vercel still needs access to the repo root to resolve the `@workspace/*`
packages.

| Setting                                                   | Value                    |
| --------------------------------------------------------- | ------------------------ |
| Root Directory                                            | `artifacts/alphabet-ai`  |
| Framework Preset                                          | `Vite`                   |
| Install Command                                           | `pnpm install`           |
| Build Command                                             | `pnpm run build`         |
| Output Directory                                          | `dist/public`            |
| Include source files outside of the Root Directory        | **Enabled** (required)   |

The "Include source files outside of the Root Directory in the Build Step" toggle
**must be enabled** — without it Vercel cannot see the monorepo root and the
`@workspace/api-client-react` / `@workspace/replit-auth-web` workspace deps fail to
resolve.

`artifacts/alphabet-ai/vercel.json` already contains the SPA catch-all rewrite that
sends every non-asset path to `/index.html`, so client-side routing (wouter) handles
deep links and refreshes.

## Environment variables

Every environment variable the app's code actually reads is listed below. The build
does **not** depend on any Replit-only variable — the Replit Vite plugins are loaded
only when `REPL_ID` is present, which it never is on Vercel.

### Frontend (read by the app)

| Variable       | Required? | Default        | Effect                                                                                                                                                       |
| -------------- | --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_API_URL` | Optional  | _unset_ (empty)| Absolute origin every API call is prefixed with (e.g. `https://your-api-host`). When unset, API calls stay same-origin relative (`/api/...`). Set this only if you use **Option B** below. |

### Build / dev only (you normally leave these unset on Vercel)

| Variable    | Required? | Default  | Effect                                                                                                              |
| ----------- | --------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `BASE_PATH` | Optional  | `/`      | Sets the app's base path (`vite base`). On Vercel the app serves from the domain root, so leave unset.            |
| `PORT`      | Optional  | `5173`   | Only affects the local dev/preview server, not the static build. Vercel ignores it for static hosting.            |
| `REPL_ID`   | Optional  | _unset_  | Replit-only. When present, loads Replit Vite plugins. Never set on Vercel.                                        |
| `NODE_ENV`  | Optional  | —        | Vercel sets this to `production` during the build automatically. Controls dev-only plugin loading.               |

> Vite also exposes a built-in `BASE_URL` (derived from `base`/`BASE_PATH`) that the
> router uses. You do **not** set this yourself.

**For an interactive demo, the simplest setup is to set _no_ frontend env vars** and use
the Vercel→API proxy (Option A below).

## API connectivity

The hosted frontend must be able to reach a running API for login and live data. Pick one:

### Option A — Proxy `/api` from Vercel to the API host (recommended for the demo)

Leave `VITE_API_URL` **unset** and add an `/api` rewrite to
`artifacts/alphabet-ai/vercel.json` that forwards API calls to the running API server.
Keep the SPA catch-all **after** the API rule (Vercel matches top-to-bottom):

```jsonc
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://YOUR-API-HOST/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This keeps every request same-origin from the browser's perspective, so the relative
`fetch("/api/...")` calls and cookie-based Replit OIDC auth keep working with **no API
server changes**. This is recommended because it sidesteps the cross-origin auth caveat.

### Option B — Point the client at an absolute API base URL

Set `VITE_API_URL` in Vercel's Environment Variables to the API origin
(e.g. `https://your-api-host`). No code changes are needed. **Caveat:** because the API
is then on a different origin, Replit OIDC session cookies and CORS must be reconfigured
on the API server for cross-site use (see `VERCEL.md` for the full list). Until that
server work lands, prefer Option A.

## Quick verification

From the repo root:

```bash
pnpm --filter @workspace/alphabet-ai run build
```

This should finish with `✓ built` and emit static files to
`artifacts/alphabet-ai/dist/public/` (including `index.html`). No Replit env vars are
required.

## What still needs human setup

A fully interactive demo (login + live student/teacher data) depends on two things that
are **out of scope for this frontend deployment** and tracked separately:

1. **A hosted API server.** The Express API (`@workspace/api-server`) must be running and
   reachable so `/api/*` resolves. Until it is, the Vercel site loads (landing page,
   marketing UI) but login and data-backed pages cannot function. *(Tracked separately —
   hosting the API server.)*
2. **Cross-origin auth (only if you choose Option B).** Replit OIDC login across a Vercel
   frontend + remote API needs `SameSite=None; Secure` session cookies, CORS allowing the
   Vercel origin with credentials, and `returnTo` redirect handling pointed at the
   frontend origin. *(Tracked separately — making login work across different web
   addresses.)* **Option A avoids all of this** by keeping everything same-origin.

See `DEMO_NOTES.md` for what to click and how to run the demo.
