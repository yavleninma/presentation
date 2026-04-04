# Codebase Graph

> Keep this file short. If it starts repeating `AGENTS.md`, trim it.

## Entry Points

```text
src/app/page.tsx
  -> src/lib/generation/client.ts
  -> src/lib/store/presentation-store.ts
  -> src/lib/templates/index.ts
  -> src/components/slides/SlideRenderer.tsx
  -> src/lib/export/pptx-export.ts

src/lib/generation/client.ts
  -> /api/generate
  -> /api/generate/chat
  -> /api/generate/slide

/api/generate
  -> src/lib/generation/prompts.ts
  -> src/lib/decision-package.ts
  -> src/lib/images/pexels.ts

src/app/demo/page.tsx
  -> src/lib/templates/index.ts
  -> src/components/slides/SlideRenderer.tsx
```

## Product Flow

```text
work context -> minimal settings -> outline -> streamed draft -> workspace -> chat/regenerate -> PPTX
```

## Edit Here

- `src/app/page.tsx` - main public UX
- `src/app/api/generate/route.ts` - outline + streamed generation
- `src/app/api/generate/chat/route.ts` - chat edits
- `src/app/api/generate/slide/route.ts` - single-slide rebuild
- `src/lib/decision-package.ts` - labels, defaults, hidden advanced configs
- `src/lib/store/presentation-store.ts` - client state
- `src/lib/export/pptx-export.ts` - export fidelity
