# SlideForge Agent Guide

> After meaningful changes, update this file, `docs/KANBAN.md`, and `docs/CODEBASE-GRAPH.md`.

## Repo Layout

- `presentations-frontend/` - Next.js 16 app with the public UI and Route Handlers
- `presentations-frontend/src/app/page.tsx` - main public generator flow at `/`
- `presentations-frontend/src/app/demo/page.tsx` - public demo route at `/demo`
- `presentations-frontend/src/app/api/generate/route.ts` - public generation endpoint used by `/`
- `presentations-frontend/src/app/api/images/search/route.ts` - public image lookup endpoint used by the UI
- `docs/` - roadmap, strategy, design notes, and codebase map
- `.cursor/rules/` - project role definitions (`engineer`, `strategist`)
- `.agents/skills/public-scenario-qa/` - repo folder for the `slideforge-public-ux-qa` skill
- `.agents/skills/slideforge-engineer/` - local engineer skill for implementation work
- `.agents/skills/slideforge-strategist/` - local strategist skill for product and prioritization work
- `.codex/config.toml` - project-scoped Codex config for repeatable QA runs

## Commands

- Install root hooks: `npm install`
- Install app deps: `cd presentations-frontend && npm install`
- Run locally: `cd presentations-frontend && npm run dev`
- Build app: `cd presentations-frontend && npm run build`
- Start built app: `cd presentations-frontend && npm run start`
- Full verification: `npm run verify`
- Quick verification: `npm run verify:quick`

## Environment

- Full generation testing on `/` expects `presentations-frontend/.env.local` with `OPENAI_API_KEY` and `PEXELS_API_KEY`.
- Public shell checks can still inspect `/` and `/demo` without finishing the generate flow, but do not fake a successful generation pass if the env is missing or broken.
- On this machine, `next dev` may fail inside the sandbox with `spawn EPERM`. If that happens, rerun the dev server outside the sandbox before calling the browser issue a product bug.

## Public Routes And Core Journeys

- `/` - enter a topic, optionally choose slide count and template, start generation, observe outline/progress, review the finished deck, navigate slides, edit inline, add/delete slides, export PPTX
- `/demo` - browse all slide types and switch templates without generating anything
- Public API calls behind the UI: `/api/generate` and `/api/images/search`

## Public UX QA Rules

- Browser scenario testing matters more than code-only assumptions.
- Judge clarity, friction, trust, and momentum, not just whether the code technically runs.
- Scope is public, non-authenticated flows only. Auth, billing, admin, and future private areas are out of scope unless the user explicitly expands scope.
- Prefer small verified fixes over broad rewrites.
- Retest every affected scenario after a meaningful fix.
- If browser MCP or the local app cannot run, report the exact blocker. Do not claim browser coverage you did not get.
- Use the local `slideforge-public-ux-qa` skill for recurring no-auth QA passes.

## Unified Skill Names

- `slideforge-engineer` - implementation and debugging
- `slideforge-strategist` - product, growth, and prioritization
- `slideforge-public-ux-qa` - browser-first public no-auth UX QA

## Human Aliases

- `инженер` -> `slideforge-engineer`
- `стратег` -> `slideforge-strategist`
- `qa` -> `slideforge-public-ux-qa`

## Canonical Prompts

Copy and reuse these as your default prompts:

- Engineer
  `Используй skill slideforge-engineer. Возьми следующую подходящую задачу из канбана или выполни явно указанную мной задачу. Работай как инженер: внеси изменения, проверь результат, обнови AGENTS.md, docs/KANBAN.md и docs/CODEBASE-GRAPH.md.`

- Strategist
  `Используй skill slideforge-strategist. Оцени продукт, приоритеты или конкретную идею как стратег: найди главный рычаг, укажи слабые места, предложи следующие шаги и обнови docs/KANBAN.md и docs/STRATEGY.md, если выводы меняют приоритеты.`

- Public UX QA
  `Используй skill slideforge-public-ux-qa. Прогони browser-first public no-auth UX QA по выбранному сценарию. Смотри на clarity, friction, trust и momentum. Исправляй только маленькие надёжные проблемы, потом ретестни и дай структурированный отчёт.`

Quick phrasing also works:

- `Используй skill slideforge-engineer и сделай EPIC-18`
- `Используй skill slideforge-strategist и пересобери приоритеты`
- `Используй skill slideforge-public-ux-qa и прогони public UX QA на главной`

## Definition Of Done For Public UX QA

- The app was started or the exact startup blocker was recorded.
- At least one real public scenario was walked in the browser from entry to outcome.
- The pass reports: scenario tested, user goal, what worked well, blockers, friction points, trust issues, cosmetic roughness, fixes made, and remaining risks.
- Any high-confidence fix was retested in the affected scenario before closing the task.
- `AGENTS.md`, `docs/KANBAN.md`, and `docs/CODEBASE-GRAPH.md` were updated if the repo state changed.

## Current Testing Reality

- No dedicated repo-owned unit or e2e test suite is wired today.
- `npm run verify` is the engineering safety net for lint, typecheck, and build.
- Public product quality should be judged mainly through scenario-first browser passes, not through shallow checklist thinking alone.
