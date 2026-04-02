# Codebase Dependency Graph

> Compact map for agents. Shows how modules connect. Read this to know WHERE to edit.
>
> **RULE:** If you add, remove, or rename files, update the graph and the File Size Guide below. If you add new module connections, update the dependency flow diagram.

## Operational Files

```
.codex/config.toml                                      -> project-scoped Codex config for conservative sandbox + isolated Playwright MCP
.agents/skills/public-scenario-qa/SKILL.md             -> `slideforge-public-ux-qa` workflow for public no-auth browser QA
.agents/skills/public-scenario-qa/references/public-scenarios.md -> scenario catalog for `/` and `/demo`
.agents/skills/slideforge-engineer/SKILL.md            -> unified engineer skill name for implementation work
.agents/skills/slideforge-strategist/SKILL.md          -> unified strategist skill name for product and prioritization work
AGENTS.md                                              -> repo context, commands, routes, QA guardrails
docs/KANBAN.md                                         -> roadmap and priority queue
docs/STRATEGY.md                                       -> positioning, moat, commercialization boundary decisions
```

## Scenario QA Flow

```
[.codex/config.toml] -> configures isolated Playwright MCP for repeatable browser sessions
        |
        v
[public-scenario-qa/SKILL.md] -> reads [references/public-scenarios.md]
        |
        v
Browser QA pass against public routes: `/` and `/demo`
```

## Module Dependency Flow

```text
[page.tsx]
  ├─ uses ─> [decision-package.ts]
  │            scenario presets, brief defaults, role/archetype labels, regen intent labels
  ├─ uses ─> [presentation-store.ts]
  │            presentation, outline, phase, error, currentSlideIndex
  ├─ uses ─> [client.ts]
  │            ├─ POST outline mode ─> [/api/generate/route.ts]
  │            ├─ POST slides mode  ─> [/api/generate/route.ts]
  │            └─ POST regenerate   ─> [/api/generate/slide/route.ts]
  ├─ renders ─> [SlideRenderer.tsx]
  ├─ reads ─> [templates/index.ts]
  └─ calls ─> [pptx-export.ts]

[/api/generate/route.ts]
  ├─ uses ─> [decision-package.ts]
  ├─ uses ─> [prompts.ts]
  ├─ calls -> OpenAI API
  └─ calls -> [pexels.ts] for auto-image lookup when needed

[/api/generate/slide/route.ts]
  ├─ uses ─> [prompts.ts]
  └─ calls -> OpenAI API

[SlideRenderer.tsx]
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

## Key Interfaces Between Modules

### `page.tsx` ↔ `presentation-store.ts`

```text
Store exposes:
- presentation
- currentSlideIndex
- phase
- outline
- error

Key mutators used by the main flow:
- setPresentation
- setCurrentSlide
- setPhase
- setOutline
- setError
- appendSlide
- updateSlide
- updateSlideContent
- addSlide
- removeSlide
- resetPresentation
```

### `page.tsx` ↔ `client.ts`

```text
generateOutline(brief, options)
generateSlides(brief, outline, options, callbacks)
regenerateSlide(slide, presentation, brief, intent, previousSlide?, nextSlide?)
```

### `client.ts` ↔ `/api/generate` and `/api/generate/slide`

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

/api/generate/slide
- JSON in/out for intent-based single-slide regeneration
```

### `decision-package.ts` ↔ prompts/routes/UI

```text
Central source for:
- scenarioDefinitions
- createEmptyBrief()
- getScenarioDefinition()
- slideRoleLabels
- archetypeLabels
- regenerationIntentLabels
- DEFAULT_REGEN_INTENTS
```

## Current Product Gaps

```text
1. Ingestion depth:
   Guided brief works, but enterprise-friendly document ingestion is still missing.

2. Update mode depth:
   "Update Previous Package" exists as a scenario preset, but not yet as a true prior-package diff/reuse workflow.

3. Export parity:
   Template fonts/rendering diverge from PPTX because pptx-export.ts still has legacy assumptions.

4. Structural split:
   The repo is still a single app tree; no hard boundary yet between private core IP and any external/shared wrapper.
```

## File Size Guide

| File | Lines | When to read |
|------|-------|--------------|
| `src/types/presentation.ts` | 218 | Always; defines the decision-package types |
| `src/app/page.tsx` | 1014 | Main public workflow, guided brief, outline review, preview |
| `src/app/demo/page.tsx` | 497 | Scenario-led public demo |
| `src/app/api/generate/route.ts` | 587 | Outline creation, streaming slide generation, normalization |
| `src/app/api/generate/slide/route.ts` | 106 | Slide-level regeneration |
| `src/lib/generation/prompts.ts` | 384 | Decision-package prompts, normalization helpers |
| `src/lib/generation/client.ts` | 142 | Outline/slides/regeneration client calls |
| `src/lib/decision-package.ts` | 315 | Scenario definitions and labels |
| `src/lib/store/presentation-store.ts` | 135 | Zustand state and slide CRUD |
| `src/lib/export/pptx-export.ts` | 581 | PPTX export logic |
| `src/components/slides/SlideRenderer.tsx` | 199 | Layout routing and scaling |
| `src/lib/templates/index.ts` | 22 | Template registry |
| `src/lib/templates/*.ts` | 30-31 | Theme colors, fonts, spacing |
| `AGENTS.md` | 72 | Repo operations and route reality |
| `docs/KANBAN.md` | 174 | Current roadmap and priorities |
| `docs/STRATEGY.md` | 70 | Strategic decisions and boundary notes |
| `docs/CODEBASE-GRAPH.md` | 166 | This file |

## CI And Local Checks

- Root: `npm run verify` -> frontend `lint` + `typecheck` + `build`
- Fast local gate: `npm run verify:quick`
- App-only build: `npm run build --prefix presentations-frontend`

## Change Playbooks

### New slide type

1. Add it to `SlideLayoutType` in `src/types/presentation.ts`
2. Create `src/components/slides/NewSlide.tsx`
3. Register it in `src/components/slides/SlideRenderer.tsx`
4. Add generation instructions in `src/lib/generation/prompts.ts`
5. Add PPTX rendering support in `src/lib/export/pptx-export.ts`

### New scenario / decision package type

1. Add the scenario in `src/lib/decision-package.ts`
2. Update the brief defaults and prompt seed there
3. Ensure prompt handling in `src/lib/generation/prompts.ts` supports the intended output
4. Update `/demo` if the scenario should be publicly visible

### New export format

1. Create `src/lib/export/new-format.ts`
2. Add the button/handler in `src/app/page.tsx`
