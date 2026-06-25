---
name: Placement/practice answer evaluation depends on question_cache
description: Why every served question (incl. fallbacks) must be persisted, or answer submission 400s
---

# Answer evaluation re-fetches the served question by id

Placement and practice strip `correctOptionId` from the question before sending it to the client (so the answer can't be guessed from the payload). On submit, the answer route re-fetches the question from `question_cache` via `payload->>'id' = questionId` to evaluate correctness server-side.

**Consequence (the trap):** any served question that is NOT in `question_cache` by its id cannot be evaluated and the answer endpoint returns 400 ("Question not found in cache").

**Why this bit us:** the AI path persisted questions, but the fallback path returned a question with a fresh random id and never persisted it — so every fallback-served question broke answer submission. Fix: route all fallback returns through a helper that persists (setCached) before returning.

**How to apply:** if you add any new way to produce/serve a question (new generator, new fallback, mock path), it MUST be persisted to `question_cache` with the exact id that gets sent to the client, or answers for it will 400. `setCached` swallows DB errors (now logs a warning) — a persist failure recreates this 400 class, so watch the "Failed to persist question to cache" warning.
