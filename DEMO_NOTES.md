# Alphabet AI — Funder Demo Notes

A plain-language guide for exploring the live Alphabet AI demo. No setup or code required —
just open the link and click.

## What Alphabet AI is

Alphabet AI is a **K-12 adaptive English Language Arts (ELA) mastery platform**. It meets
each student exactly at their reading level and moves with them as they grow. Three ideas
make it different:

- **Adaptive engine (IRT).** Every question is calibrated to the individual student. The
  app estimates each student's ability in real time and picks the next question that will
  tell it the most — the same psychometric approach used in modern standardized adaptive
  tests, applied continuously to daily practice.
- **SmartScore mastery (0–100).** Instead of a vague pass/fail, each skill gets a precise,
  continuously-updated 0–100 score, so teachers and families can see exactly where a
  student stands and watch it move.
- **Culturally responsive, AI-generated content.** Practice questions are personalized to
  each student's interests and identity, and the app can read passages aloud
  (text-to-speech) for emerging readers.

It serves three audiences from one platform: **students**, **teachers**, and **family
members (caregivers)**.

## What to click first

1. **Open the link → the Landing page.** This is the marketing/overview screen with the
   product pitch and a sample SmartScore panel. Click **Sign in to get started**.
2. **Pick a role** — *Student*, *Teacher*, or *Family Member*. The role you choose sets the
   experience.
3. **As a Student:** complete a short **placement assessment** (an adaptive quiz that finds
   your reading level), then land on the **Student Dashboard** with your streak, XP, domain
   progress, and "Up Next" skills. Try **Practice** to see the adaptive engine and live
   SmartScore in action.
4. **As a Teacher:** create a class (you'll get a join code), then explore the **Teacher
   Dashboard** — class stats, intervention alerts, the **Roster & Heatmap**, **Class
   Analytics**, **Book Upload** (generate lessons from a text), and the **Exercise
   Generator**.

## Suggested ~10-minute demo flow

1. **(1 min) Landing page.** Read the pitch, point out the three pillars: adaptive IRT,
   SmartScore, culturally responsive content.
2. **(2 min) Student placement.** Sign in as a Student and start the placement assessment.
   Answer a few questions and narrate how the questions adjust to performance.
3. **(2 min) Student dashboard + practice.** Show the dashboard (streak, XP, domain
   progress, badges). Open **Practice** and answer a couple of questions — watch the
   SmartScore update after each answer. Try the **read-aloud** button on a passage.
4. **(1 min) Skill tree / progress.** Show how mastery is tracked per skill and over time.
5. **(3 min) Teacher view.** Sign in as a Teacher (or use a second browser profile). Create
   a class, open the **Roster & Heatmap** and **Class Analytics**, and point out the
   intervention alerts that flag students who need re-teaching.
6. **(1 min) Wrap.** Recap: one platform, continuously adaptive, actionable for teachers,
   transparent for families.

> Tip: students, teachers, and caregivers are separate roles. To show both sides in one
> sitting, use two browser windows (or a regular + incognito window) so you can stay signed
> in as a Student in one and a Teacher in the other.

## What's prototype / MVP

This is an early-stage product. The following are functional but should be framed as
prototype/MVP, not finished production features:

- **AI question generation** runs on a generative model and falls back to a static question
  bank if generation is slow or unavailable, so question quality and variety will vary.
- **Text-to-speech read-aloud** is wired up but voice coverage and pacing are still being
  tuned.
- **Teacher tools** (Book Upload, Exercise Generator, Class Analytics, intervention plans)
  are working demonstrations of the workflow rather than hardened, at-scale features.
- **Caregiver (family member) experience** is the newest surface and the lightest of the
  three roles.
- **Gamification** (streaks, XP, badges) is intentionally simple in this build.

## Known limitations for the demo

- **A live, interactive demo needs a running backend.** This Vercel deployment hosts the
  **frontend only**. For login and real data to work, the API server must be reachable —
  the recommended setup is the Vercel→API proxy (**Option A** in
  [`DEPLOYMENT.md`](DEPLOYMENT.md) and `artifacts/alphabet-ai/VERCEL.md`). Two pieces of
  setup are tracked separately and required for a *fully* interactive demo:
  1. **Hosting the API server**, and
  2. **Cross-origin login** (only needed if the API is on a different domain than the
     frontend; Option A avoids it).
  Until the API is connected, the site still loads and the landing/marketing UI is fully
  viewable, but signing in and data-backed pages won't function.
- **If a data request fails or returns nothing**, the affected pages show a friendly empty
  or error state (e.g. "Complete your placement to see progress" or a "Something went
  wrong — reload" card) rather than a blank screen or a crash. This is expected and keeps
  the demo presentable even if the backend hiccups.
- **No seeded demo data.** A brand-new account starts empty; you build up progress live
  during the demo by completing placement and practice. If you want a populated teacher
  view, create a class and add a student or two first.

## Where to go next

- Vercel setup and environment variables: [`DEPLOYMENT.md`](DEPLOYMENT.md)
- Frontend deployment deep-dive (API options, auth caveat):
  [`artifacts/alphabet-ai/VERCEL.md`](artifacts/alphabet-ai/VERCEL.md)
- Product/architecture overview: [`replit.md`](replit.md)
