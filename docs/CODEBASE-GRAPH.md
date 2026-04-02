# Codebase Dependency Graph

> Compact map for agents. Shows how modules connect. Read this to know WHERE to edit.
>
> **RULE:** If you add, remove, or rename files — update the graph and the File Size Guide below. If you add new module connections — update the dependency flow diagram.

## Operational Files

```
.cursor/rules/engineer.mdc   -> main Engineer role
.cursor/rules/eng.mdc        -> short alias for Engineer (`@eng`)
.cursor/rules/strategist.mdc -> main Strategist role
.cursor/rules/strat.mdc      -> short alias for Strategist (`@strat`)
docs/STRATEGY.md             -> positioning, moat, commercialization boundary decisions
docs/KANBAN.md               -> roadmap and priority queue, including collaboration-safe packaging
AGENTS.md                    -> repo context + operational sharing guardrails
```

## Module Dependency Flow

```
[page.tsx] ──uses──→ [presentation-store.ts] (Zustand)
    │                        │
    │──uses──→ [client.ts] ──fetches──→ [/api/generate/route.ts]
    │                                          │
    │                                          ├──calls──→ [prompts.ts] (builds LLM prompts)
    │                                          ├──calls──→ OpenAI API (GPT-5.4-mini; override via OPENAI_MODEL)
    │                                          └──calls──→ [pexels.ts] (auto-fetch images)
    │
    │──can fetch──→ [/api/images/search/route.ts] ──calls──→ [pexels.ts]
    │
    │──renders──→ [SlideRenderer.tsx]
    │                   │
    │                   ├──routes──→ [TitleSlide.tsx] ──uses──→ [EditableText.tsx]
    │                   ├──routes──→ [SectionSlide.tsx] ──uses──→ [EditableText.tsx]
    │                   ├──routes──→ [ContentSlide.tsx] ──uses──→ [EditableText.tsx]
    │                   ├──routes──→ [TwoColumnsSlide.tsx] ──uses──→ [EditableText.tsx]
    │                   ├──routes──→ [ImageTextSlide.tsx] ──uses──→ [EditableText.tsx]
    │                   ├──routes──→ [KPISlide.tsx] ──uses──→ [EditableText.tsx]
    │                   ├──routes──→ [TimelineSlide.tsx] ──uses──→ [EditableText.tsx]
    │                   ├──routes──→ [QuoteSlide.tsx] ──uses──→ [EditableText.tsx]
    │                   ├──routes──→ [FullImageSlide.tsx] ──uses──→ [EditableText.tsx]
    │                   └──routes──→ [ThankYouSlide.tsx] ──uses──→ [EditableText.tsx]
    │
    │──calls──→ [pptx-export.ts] ──uses──→ PptxGenJS
    │
    └──reads──→ [templates/index.ts]
                      │
                      ├──imports──→ [minimal.ts]
                      ├──imports──→ [modern-dark.ts]
                      ├──imports──→ [sovcombank.ts]
                      ├──imports──→ [startup.ts]
                      ├──imports──→ [consulting.ts]
                      └──imports──→ [tech.ts]
```

## Key Interfaces Between Modules

### page.tsx ↔ presentation-store.ts
```
Store exposes: presentation, currentSlideIndex, phase
Store mutators: setPresentation, setCurrentSlide, appendSlide, updateSlideContent, updateSlide, removeSlide, addSlide, resetPresentation
Generation flow: page.tsx seeds an empty draft presentation before calling generatePresentation(),
so appendSlide() can hydrate the UI immediately from incoming SSE slide events.
```

### page.tsx ↔ client.ts
```
generatePresentation(topic, options, callbacks)
  callbacks: onPhase, onOutline, onStatus, onSlide, onComplete, onError
```

### Known Product Gaps In Current Wiring
```
EPIC-15 wiring is now live end-to-end: page.tsx seeds a draft presentation, renders
outline review, consumes status events, and auto-follows new slides while generation is in flight.

The remaining outline gap is product-level, not transport-level: the UI now shows the outline,
but there are still no approval controls to edit/reorder slides before generation continues.

template files expose template.fonts for browser rendering, but pptx-export.ts still hardcodes Arial,
so template differentiation and preview/export parity break at the export boundary.

UI defaults already point to `minimal`, but client.ts and /api/generate still fall back to `sovcombank`
when templateId is omitted, so template defaults are not yet fully synchronized across UI / client / server.

The repo is still effectively a single app tree, so there is no clean architectural split yet
between personal product IP (`Private Core`) and any employer-safe `Shared Wrapper`.
If code-sharing becomes necessary, a separate boundary layer should be introduced before access is granted.
```

### Recommended Future Split (strategic, not implemented yet)
```
[Private Core]
  prompts, generation orchestration, template logic, export fidelity, internal docs/evals
          |
          v
[Shared Wrapper]
  UI shell, adapter contracts, employer-specific branding/integrations, deploy glue
          |
          v
[Work Edition]
  hosted pilot, sanitized repo, or packaged runnable build for external collaboration
```

### client.ts ↔ /api/generate (SSE protocol)
```
Request:  POST { topic, slideCount, language, templateId }
Response: SSE stream of lines:
  data: {"event": "phase|thinking|researching|outline|slide_start|image_search|slide|polishing|presentation|error", "data": ...}
```

### SlideRenderer ↔ Slide Components
```
All receive: { slide: Slide, template: PresentationTemplate, editable?, onContentChange? }
All access:  slide.content.* for data,  template.colors.* for styling
```

### layout.tsx + globals.css ↔ templates
```
layout.tsx loads the Google Fonts pack used by the template system.
globals.css defines CSS custom properties such as --font-bricolage-grotesque and --font-space-mono.
templates/*.ts reference those vars through template.fonts.heading/body/mono.
```

### templates/*.ts → PresentationTemplate
```
{ id, name, colors: ThemeColors, fonts: ThemeFonts, spacing, logoUrl?, backgroundPattern? }
ThemeColors: primary, primaryForeground, secondary, secondaryForeground, accent, accentForeground,
             background, foreground, muted, mutedForeground, surface, surfaceForeground
```

## File Size Guide (for token budgeting)

| File | Lines | When to read |
|------|-------|--------------|
| types/presentation.ts | 137 | Always — defines all types |
| page.tsx | 1184 | When editing main UI |
| SlideRenderer.tsx | 199 | When adding slide types or fixing rendering |
| editor/EditableText.tsx | 69 | When fixing inline editing |
| prompts.ts | 144 | When changing AI output format |
| route.ts (generate) | 312 | When changing generation pipeline |
| route.ts (images) | 22 | When changing image search API |
| pexels.ts | 78 | When changing image provider |
| pptx-export.ts | 581 | When fixing PPTX export |
| presentation-store.ts | 135 | When adding state/actions |
| templates/index.ts | 22 | When registering or reordering templates |
| templates/*.ts | 30-31 | When editing template colors, fonts, spacing |
| client.ts | 106 | When changing SSE parsing |
| Individual slide .tsx | 40-110 | When fixing specific slide layout |
| AGENTS.md | 265 | When you need repo context, role rules, or sharing guardrails |
| docs/KANBAN.md | 181 | When choosing the next priority or updating task status |
| docs/STRATEGY.md | 134 | When checking positioning, moat, or collaboration decisions |
| docs/CODEBASE-GRAPH.md | 176 | When orienting in the codebase or updating module boundaries |

## CI and local checks

- **Root:** `npm run verify` → `presentations-frontend`: `lint` + `typecheck` + `build`
- **Pre-commit:** `.husky/pre-commit` → `verify:quick` (lint + typecheck, без build)
- **GitHub:** `.github/workflows/presentations-ci.yml` — verify on push/PR to `main`; production deploy to Vercel on push to `main` (requires `VERCEL_*` secrets and a Vercel Project Root Directory of `presentations-frontend` while the workflow itself runs from repo root)

### New slide type
1. Add to `SlideLayoutType` union in `types/presentation.ts`
2. Create `components/slides/NewSlide.tsx` (receive SlideComponentProps)
3. Register in `SlideRenderer.tsx` → `layoutComponents` map
4. Add layout instructions in `prompts.ts` → `layoutInstructions` object
5. Add PPTX rendering case in `pptx-export.ts` → `addSlideContent` switch

### New template
1. Create `lib/templates/my-theme.ts` exporting `PresentationTemplate`
2. Register in `lib/templates/index.ts` → `templates` object
3. Add any new font family to `app/layout.tsx` + `app/globals.css` before referencing it from `template.fonts`

### New export format
1. Create `lib/export/new-format.ts`
2. Add button + handler in `page.tsx` header section
