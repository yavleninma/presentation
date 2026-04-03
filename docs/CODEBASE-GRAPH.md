# Codebase Dependency Graph

> Compact map for agents. Shows how modules connect and where to edit.
>
> **RULE:** If you add, remove, or rename files, update this graph and the File Size Guide below.

## Operational Files

```text
.codex/config.toml                                      -> project-scoped Codex config for conservative sandbox + isolated Playwright MCP
.agents/skills/public-scenario-qa/SKILL.md             -> `slideforge-public-ux-qa` workflow for public no-auth browser QA
.agents/skills/public-scenario-qa/references/public-scenarios.md -> scenario catalog for `/` and `/demo`
AGENTS.md                                              -> repo context, routes, commands, UX QA guardrails
docs/KANBAN.md                                         -> roadmap and current priority queue
docs/STRATEGY.md                                       -> product and commercialization strategy
docs/CODEBASE-GRAPH.md                                 -> this file
```

## Module Dependency Flow

```text
[src/app/page.tsx]
  ├─ uses ─> [src/lib/generation/client.ts]
  │           ├─ outline request ─> [/api/generate/route.ts]
  │           ├─ slide stream    ─> [/api/generate/route.ts]
  │           ├─ chat update     ─> [/api/generate/chat/route.ts]
  │           └─ slide rebuild   ─> [/api/generate/slide/route.ts]
  ├─ uses ─> [src/lib/store/presentation-store.ts]
  ├─ uses ─> [src/lib/decision-package.ts]
  ├─ reads ─> [src/lib/templates/index.ts]
  ├─ renders -> [src/components/slides/SlideRenderer.tsx]
  └─ exports -> [src/lib/export/pptx-export.ts]

[src/app/demo/page.tsx]
  ├─ reads ─> [src/lib/templates/index.ts]
  ├─ reads ─> [src/lib/decision-package.ts]
  └─ renders -> [src/components/slides/SlideRenderer.tsx]

[/api/generate/route.ts]
  ├─ uses ─> [src/lib/generation/prompts.ts]
  ├─ uses ─> [src/lib/decision-package.ts]
  ├─ calls -> OpenAI API
  └─ calls -> [src/lib/images/pexels.ts]

[/api/generate/chat/route.ts]
  ├─ uses ─> [src/lib/generation/prompts.ts]
  ├─ calls -> OpenAI API
  └─ calls -> [src/lib/images/pexels.ts] when updated slides need visuals

[/api/generate/slide/route.ts]
  ├─ uses ─> [src/lib/generation/prompts.ts]
  └─ calls -> OpenAI API

[src/components/slides/SlideRenderer.tsx]
  ├─ routes -> [TitleSlide.tsx]
  ├─ routes -> [SectionSlide.tsx]
  ├─ routes -> [ContentSlide.tsx]
  ├─ routes -> [TwoColumnsSlide.tsx]
  ├─ routes -> [ImageTextSlide.tsx]
  ├─ routes -> [KPISlide.tsx]
  ├─ routes -> [TimelineSlide.tsx]
  ├─ routes -> [QuoteSlide.tsx]
  ├─ routes -> [FullImageSlide.tsx]
  └─ routes -> [ThankYouSlide.tsx]
```

## Current Product Shape

```text
Public flow:
topic input -> minimal settings -> outline -> streamed draft slides -> workspace -> chat-driven refinement -> single-slide rebuild -> PPTX export

Key UX promises:
1. One thought to start.
2. Russian-only visible interface.
3. Beautiful first draft before advanced complexity.
4. Chat works inside one presentation, not as a detached general bot.
5. Advanced enterprise scenarios stay hidden and non-blocking.
```

## Key Interfaces

### `page.tsx` ↔ `presentation-store.ts`

```text
Store exposes:
- presentation
- currentSlideIndex
- phase
- outline
- error

Main mutators used now:
- setPresentation
- setCurrentSlide
- setPhase
- setOutline
- setError
- appendSlide
- updateSlide
- updateSlideContent
- removeSlide
- resetPresentation
```

### `page.tsx` ↔ `client.ts`

```text
generateOutline(brief, options)
generateSlides(brief, outline, options, callbacks)
chatWithPresentation(presentation, brief, message, currentSlideId?)
regenerateSlide(slide, presentation, brief, intent, customInstruction?, previousSlide?, nextSlide?)
```

### `client.ts` ↔ API routes

```text
/api/generate
- mode: "outline" -> JSON { outline }
- mode: "slides"  -> SSE stream

SSE events:
- phase
- thinking
- researching
- slide_start
- image_search
- slide
- polishing
- presentation
- error

/api/generate/chat
- JSON in/out for presentation-scoped chat updates

/api/generate/slide
- JSON in/out for single-slide rebuild
```

### `decision-package.ts` ↔ prompts/UI/routes

```text
Shared source for:
- hidden advanced scenario definitions
- quick-start defaults
- format and length labels
- slide role labels
- archetype labels
- slide rebuild intent labels
```

## Current Gaps

```text
1. Browser QA:
   Build and local HTTP checks are green, but Playwright MCP visual verification can still be blocked by an already-used browser session.

2. Materials:
   "Добавить материалы" is an honest UI stub for now; upload + parsing are still future work.

3. Advanced modes:
   Enterprise-specific scenarios still exist under the hood for later expansion, but the current public UX intentionally hides them.

4. Export polish:
   PPTX export works, but preview ↔ export fidelity can still be improved further.
```

## File Size Guide

| File | Lines | When to read |
|------|-------|--------------|
| `presentations-frontend/src/types/presentation.ts` | ~230 | Core shared types |
| `presentations-frontend/src/app/page.tsx` | ~900 | Main public quick-start + workspace UX |
| `presentations-frontend/src/app/demo/page.tsx` | ~450 | Public draft examples |
| `presentations-frontend/src/app/api/generate/route.ts` | ~590 | Outline creation + streamed slide generation |
| `presentations-frontend/src/app/api/generate/chat/route.ts` | ~240 | Presentation-scoped chat editing |
| `presentations-frontend/src/app/api/generate/slide/route.ts` | ~120 | Single-slide rebuild |
| `presentations-frontend/src/lib/generation/prompts.ts` | ~430 | All AI prompt builders + content normalization |
| `presentations-frontend/src/lib/generation/client.ts` | ~180 | Browser-side API clients |
| `presentations-frontend/src/lib/decision-package.ts` | ~330 | Defaults, labels, hidden advanced scenarios |
| `presentations-frontend/src/lib/store/presentation-store.ts` | ~135 | Zustand state and slide CRUD |
| `presentations-frontend/src/lib/export/pptx-export.ts` | ~580 | PPTX export logic |
| `presentations-frontend/src/components/slides/SlideRenderer.tsx` | ~190 | Slide layout routing and scaling |

## Verification

- Root quick/full: `npm run verify:quick`, `npm run verify`
- App build: `npm run build --prefix presentations-frontend`
- Visual QA should ideally use browser-first checks on `/` and `/demo`
