---
name: Spec/server path contract
description: Server Express routes must match openapi.yaml paths exactly or the generated client 404s silently
---

The OpenAPI spec (`lib/api-spec/openapi.yaml`) is the source of truth. Orval
generates client hooks whose request URLs come straight from the spec `paths`.
If a server route handler is registered at a different path than the spec
declares, the generated hook hits a URL the server never registered → 404, with
no type error to catch it (the spec and server are checked independently).

**Why:** This caused the "students trapped on the placement page" bug. The spec
declared `/placement/{sessionId}/question` but the server handler was
`/placement/:sessionId/next`. The question fetch 404'd → no question → no answers
saved → placement never completed → pre_assessment_completed stayed false → every
guarded route bounced the student back to /placement. The practice routes had the
same class of mismatch (`/practice/start|:id/next|:id/answer|:id/complete` vs spec
`/practice/session`, `/practice/session/{id}/activity|submit|complete`).

**How to apply:** When adding/renaming any endpoint, change the spec first, run
`pnpm --filter @workspace/api-spec run codegen`, then make the Express route path
match the spec verbatim. To audit quickly: extract paths the client calls with
`grep -rhoE "/your-path[a-zA-Z0-9/{}\$_.-]*" lib/api-client-react/src | sort -u`
and compare against `router.(get|post)(...)` in the route files. Probing through
the proxy, an existing route returns 401 (auth) while a missing one returns 404.
