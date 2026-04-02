# Codebase Dependency Graph

> Compact map for agents. Shows how modules connect. Read this to know WHERE to edit.
>
> **RULE:** If you add, remove, or rename files — update the graph and the File Size Guide below. If you add new module connections — update the dependency flow diagram.

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
                      ├──imports──→ [sovcombank.ts]
                      ├──imports──→ [modern-dark.ts]
                      └──imports──→ [minimal.ts]
```

## Key Interfaces Between Modules

### page.tsx ↔ presentation-store.ts
```
Store exposes: presentation, currentSlideIndex, phase
Store mutators: setPresentation, setCurrentSlide, appendSlide, updateSlideContent, updateSlide, removeSlide, addSlide, resetPresentation
```

### page.tsx ↔ client.ts
```
generatePresentation(topic, options, callbacks)
  callbacks: onPhase, onOutline, onSlide, onComplete, onError
```

### client.ts ↔ /api/generate (SSE protocol)
```
Request:  POST { topic, slideCount, language, templateId }
Response: SSE stream of lines:  data: {"event": "phase|outline|slide|presentation|error", "data": ...}
```

### SlideRenderer ↔ Slide Components
```
All receive: { slide: Slide, template: PresentationTemplate, editable?, onContentChange? }
All access:  slide.content.* for data,  template.colors.* for styling
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
| types/presentation.ts | 105 | Always — defines all types |
| page.tsx | 631 | When editing main UI |
| SlideRenderer.tsx | 200 | When adding slide types or fixing rendering |
| editor/EditableText.tsx | 65 | When fixing inline editing |
| prompts.ts | 131 | When changing AI output format |
| route.ts (generate) | 169 | When changing generation pipeline |
| route.ts (images) | 20 | When changing image search API |
| pexels.ts | 75 | When changing image provider |
| pptx-export.ts | 340 | When fixing PPTX export |
| presentation-store.ts | 135 | When adding state/actions |
| templates/sovcombank.ts | 35 | When editing brand colors |
| client.ts | 89 | When changing SSE parsing |
| Individual slide .tsx | 40-110 | When fixing specific slide layout |

## CI and local checks

- **Root:** `npm run verify` → `presentations-frontend`: `lint` + `typecheck` + `build`
- **Pre-commit:** `.husky/pre-commit` → `verify:quick` (lint + typecheck, без build)
- **GitHub:** `.github/workflows/presentations-ci.yml` — verify on push/PR to `main`; production deploy to Vercel on push to `main` (requires `VERCEL_*` secrets)

### New slide type
1. Add to `SlideLayoutType` union in `types/presentation.ts`
2. Create `components/slides/NewSlide.tsx` (receive SlideComponentProps)
3. Register in `SlideRenderer.tsx` → `layoutComponents` map
4. Add layout instructions in `prompts.ts` → `layoutInstructions` object
5. Add PPTX rendering case in `pptx-export.ts` → `addSlideContent` switch

### New template
1. Create `lib/templates/my-theme.ts` exporting `PresentationTemplate`
2. Register in `lib/templates/index.ts` → `templates` object

### New export format
1. Create `lib/export/new-format.ts`
2. Add button + handler in `page.tsx` header section
