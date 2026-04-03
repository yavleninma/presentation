# SlideForge Agent Guide

> After meaningful changes, update this file, `docs/KANBAN.md`, and `docs/CODEBASE-GRAPH.md`.

## Repo Layout

- `presentations-frontend/` - Next.js 16 app with the public UI and route handlers
- `presentations-frontend/src/app/page.tsx` - public Russian quick-start flow at `/`: one idea, minimal settings, generation, draft workspace, chat, slide rebuild
- `presentations-frontend/src/app/demo/page.tsx` - public examples route at `/demo` with ready-made draft presentations
- `presentations-frontend/src/app/api/generate/route.ts` - outline + streaming slide generation for the quick-start flow
- `presentations-frontend/src/app/api/generate/chat/route.ts` - presentation-scoped chat editing endpoint
- `presentations-frontend/src/app/api/generate/slide/route.ts` - single-slide rebuild endpoint
- `presentations-frontend/src/app/api/images/search/route.ts` - public image lookup endpoint used by the UI
- `presentations-frontend/src/lib/decision-package.ts` - shared labels, defaults, hidden advanced scenario definitions, format/length labels
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
- Public shell checks can still inspect `/` and `/demo` without finishing the AI flow, but do not fake a successful generation pass if the env is missing or broken.
- On this machine, `next dev` or `next build` may fail inside the sandbox with `spawn EPERM`. If that happens, rerun outside the sandbox before filing a product bug.

## Public Routes And Core Journeys

- `/` - user enters one topic, picks length/format/theme, generates a draft presentation, refines it in a presentation-scoped chat, and rebuilds single slides with light guidance
- `/demo` - inspect three public example drafts without generating anything
- Public API calls behind the UI: `/api/generate`, `/api/generate/chat`, `/api/generate/slide`, `/api/images/search`

## Product Reality

- SlideForge is currently a light, beautiful, Russian-first AI presentation service.
- The public experience should feel like a fast conversation, not like a long form or enterprise wizard.
- Complexity is allowed, but it must appear later and softly. The first-run experience should stay simple.
- The main output is a good-looking draft presentation that is refined inside one workspace through chat and slide-level rebuilds.
- Advanced enterprise IT scenarios are hidden for later expansion and must not dominate the public UX.

## Public UX QA Rules

- Browser scenario testing matters more than code-only assumptions.
- Judge clarity, friction, trust, momentum, and visual quality, not just whether the code technically runs.
- Scope is public, non-authenticated flows only. Auth, billing, admin, and future private areas are out of scope unless the user explicitly expands scope.
- The QA role is test-and-report only. Fixes belong to the engineer role, not QA.
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
  `Используй skill slideforge-public-ux-qa. Прогони browser-first public no-auth UX QA по выбранному сценарию. Смотри на clarity, friction, trust и momentum. Ничего не исправляй: только протестируй и дай структурированный отчёт.`

Quick phrasing also works:

- `Используй skill slideforge-engineer и сделай следующую задачу`
- `Используй skill slideforge-strategist и пересобери приоритеты`
- `Используй skill slideforge-public-ux-qa и прогони public UX QA на главной`

## Definition Of Done For Public UX QA

- The app was started or the exact startup blocker was recorded.
- At least one real public scenario was walked in the browser from entry to outcome.
- The pass reports: scenario tested, user goal, what worked well, blockers, friction points, trust issues, cosmetic roughness, and remaining risks.
- `AGENTS.md`, `docs/KANBAN.md`, and `docs/CODEBASE-GRAPH.md` were updated if the repo state changed.

## Current Testing Reality

- No dedicated repo-owned unit or e2e test suite is wired today.
- `npm run verify` is the engineering safety net for lint, typecheck, and build.
- Public product quality should be judged mainly through browser-first passes and real generation flows, not through shallow checklist thinking alone.
