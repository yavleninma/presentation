# SlideForge Agent Guide

> After meaningful changes, update this file, `docs/KANBAN.md`, and `docs/CODEBASE-GRAPH.md`.

## Product Rules

These rules override older prompts and docs.

- Primary job: help users turn work context into a presentable internal slide deck fast.
- First value: "not embarrassing to show", not "visually impressive".
- Use task-first copy, not product-self copy.
- Above the fold: one main job, one main CTA.
- No fake affordances. Unbuilt features stay hidden or clearly labeled.
- Default style: strict, calm, corporate-safe, low clutter.
- If data is missing, use placeholders. Never invent numbers.
- Preserve minimalism and check desktop/mobile after public-UX changes.

## Key Files

- `presentations-frontend/src/app/page.tsx` - main public flow at `/`
- `presentations-frontend/src/app/demo/page.tsx` - public examples at `/demo`
- `presentations-frontend/src/app/api/generate/route.ts` - outline + streamed slide generation
- `presentations-frontend/src/app/api/generate/chat/route.ts` - presentation-scoped chat edits
- `presentations-frontend/src/app/api/generate/slide/route.ts` - single-slide rebuild
- `presentations-frontend/src/app/api/images/search/route.ts` - public image lookup
- `presentations-frontend/src/lib/decision-package.ts` - shared labels, defaults, hidden advanced configs

## Commands

- `cd presentations-frontend && npm run dev`
- `cd presentations-frontend && npm run build`
- `npm run verify`
- `npm run verify:quick`

## Environment

- Full generation on `/` needs `presentations-frontend/.env.local` with `OPENAI_API_KEY` and `PEXELS_API_KEY`.
- If `next dev` or `next build` fails in the sandbox with `spawn EPERM`, rerun outside the sandbox before calling it a product bug.

## Public QA

- Browser-first checks matter more than code-only assumptions.
- Check clarity, friction, trust, momentum, one main job, one main CTA, honest affordances, calm visual style.
- Public scope only: `/`, `/demo`, and their public APIs.
- If landing clarity, CTA flow, or layout changed, check desktop and mobile.
- Do not claim generation or browser coverage you did not actually run.

## Skills

- `slideforge-engineer` / `инженер` - implementation
- `slideforge-strategist` / `стратег` - prioritization and product direction
- `slideforge-public-ux-qa` / `qa` - public no-auth browser QA
