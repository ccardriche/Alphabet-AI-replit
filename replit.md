# Alphabet AI

K-12 adaptive ELA mastery platform with 3-PL IRT adaptive engine, ElevenLabs TTS, and OpenAI-generated culturally-responsive questions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 (`artifacts/alphabet-ai`)
- API: Express 5 (`artifacts/api-server`, port 8080)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- IRT: 3-PL adaptive engine (`lib/irt-engine`) — pure TS, no deps
- Auth: Replit OIDC PKCE (`lib/replit-auth-web` + auth routes)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (users, students, skills, mastery, sessions, teacher)
- `lib/irt-engine/src/index.ts` — 3-PL IRT math (EAP, MFI, SmartScore)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/alphabet-ai/src/pages/` — React page components

## Architecture decisions

- **IRT theta scale**: θ ∈ [–4, +4], anchored so θ=0 ≈ 5th grade. SmartScore = 50 + θ×12.5, clamped [0,100].
- **Placement CAT**: Full EAP over all session responses (stored as JSONB in `placement_sessions.answers`). MFI item selection. Stops at ≥8 items when SE < 0.35, or hard-cap at 25.
- **Practice IRT**: Single-step Bayesian update (`eapUpdate`) per response, using skill's current θ as prior. Theta stored per-skill in `skill_mastery`.
- **IRT parameters shipped with each question**: `/placement/:id/next` and `/practice/:id/next` return `irt:{a,b,c}` in the response; the client echoes them back on answer submission to avoid a second DB lookup.
- **users.id is TEXT** (Replit OIDC `sub` claim), not UUID. student_profiles.userId is VARCHAR FK.
- **POST-login routing**: Landing.tsx waits for explicit role selection (student/teacher) before redirecting — no auto-redirect for brand-new users with no profile.

## Product

- Adaptive placement assessment (CAT): 8–25 questions, EAP ability estimation, diagnoses reading grade level and pathway (foundation/developing/proficient/advanced)
- Adaptive practice sessions: per-skill IRT theta, MFI item selection, real-time SmartScore (0–100) after each answer
- AI-generated questions: culturally-responsive, personalized to student interests via OpenAI gpt-4o-mini
- ElevenLabs TTS for audio read-aloud
- Teacher dashboard with class roster, intervention plans, lesson generation
- Streak + XP gamification

## User preferences

_Populate as you build._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any openapi.yaml change — it also runs `typecheck:libs`.
- openapi.yaml had duplicate auth paths/schemas after a merge (now fixed). If codegen fails with "Failed to resolve input", check for duplicate path keys in the spec.
- `lib/irt-engine` is a composite lib — add it to root `tsconfig.json` references and consumer `tsconfig.json` references when adding new consumers.
- API server port is 8080 (not 5000 as the old README said).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

<!-- sync check 347d90f -->
