# SlideForge — AI Presentation Generator

> **RULE FOR EVERY AGENT:** After completing your work, update this file AND `docs/KANBAN.md` AND `docs/CODEBASE-GRAPH.md` to reflect your changes. Check off completed tasks, update file maps, fix line counts, move "NOT Working" items to "Working" if you implemented them. This keeps the next agent fast and accurate.

## Quick Context (read this first)

SlideForge — SaaS-генератор презентаций для российского бизнеса (аналог Gamma/KIMI для РФ).
Первый клиент — Совкомбанк (корпоративный шаблон встроен). Цель — продукт для малого/среднего бизнеса с подпиской.

**Стек:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + Shadcn/ui + Zustand + OpenAI API + PptxGenJS.
**Бэкенд пока не нужен** — всё через Next.js API routes (`/api/generate`).

## Repository layout (root)

```
presentation/
├── package.json              # Husky prepare; scripts: verify, lint (delegates to frontend)
├── .husky/pre-commit         # Runs npm run verify:quick (eslint + tsc)
├── .github/workflows/        # CI: lint + typecheck + build on main
├── frontend/                 # Next.js app (see below)
├── docs/
└── AGENTS.md
```

## Architecture

```
User enters prompt
       ↓
[Next.js API route: /api/generate]
       ↓
OpenAI GPT-4o-mini (JSON mode)
  1. Generate outline (slide titles + layouts)
  2. For each slide → generate content JSON
       ↓
SSE stream → frontend
       ↓
[Zustand store] → [SlideRenderer] → visual preview
       ↓
Export: PptxGenJS (PPTX) / Puppeteer (PDF, TODO)
```

## Codebase Map

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main UI: prompt input + presentation viewer
│   │   ├── demo/page.tsx         # Demo page showing all 10 slide types
│   │   ├── layout.tsx            # Root layout (Inter font, cyrillic)
│   │   ├── globals.css           # Tailwind v4 + Shadcn theme vars
│   │   └── api/generate/route.ts # SSE endpoint: OpenAI → stream slides
│   │
│   ├── components/
│   │   ├── slides/
│   │   │   ├── SlideRenderer.tsx    # Core: routes slide to layout component
│   │   │   ├── TitleSlide.tsx       # Title with brand bar + logo
│   │   │   ├── SectionSlide.tsx     # Dark section divider with number
│   │   │   ├── ContentSlide.tsx     # Heading + bullet points
│   │   │   ├── TwoColumnsSlide.tsx  # Two column comparison
│   │   │   ├── ImageTextSlide.tsx   # Image left + text right
│   │   │   ├── KPISlide.tsx         # 3-4 metric cards with trends
│   │   │   ├── TimelineSlide.tsx    # Horizontal timeline
│   │   │   ├── QuoteSlide.tsx       # Quote with author
│   │   │   ├── FullImageSlide.tsx   # Background image + overlay text
│   │   │   └── ThankYouSlide.tsx    # Contact info + brand footer
│   │   ├── editor/
│   │   │   └── EditableText.tsx   # contentEditable wrapper for inline text editing
│   │   └── ui/                   # Shadcn components (button, input, etc.)
│   │
│   ├── lib/
│   │   ├── templates/
│   │   │   ├── index.ts           # Template registry + getTemplate()
│   │   │   ├── sovcombank.ts      # Sovcombank brand: red/blue/navy
│   │   │   ├── modern-dark.ts     # Dark theme: indigo/violet/pink
│   │   │   └── minimal.ts        # Clean B&W + blue accent
│   │   ├── generation/
│   │   │   ├── prompts.ts        # System prompt + outline/slide prompts
│   │   │   └── client.ts         # SSE client: fetch + parse stream
│   │   ├── export/
│   │   │   └── pptx-export.ts    # PptxGenJS: Presentation → .pptx file
│   │   ├── store/
│   │   │   └── presentation-store.ts  # Zustand: slides, navigation, CRUD
│   │   └── utils.ts              # cn() helper
│   │
│   └── types/
│       └── presentation.ts       # ALL types: Slide, Template, KPI, etc.
│
├── .env.local                    # OPENAI_API_KEY=sk-...
└── package.json
```

## Key Types (from `types/presentation.ts`)

- `SlideLayoutType` — 10 layout types: title, section, content, two-columns, image-text, kpi, timeline, quote, full-image, thank-you
- `Slide` — { id, order, layout, content: SlideContent, notes }
- `SlideContent` — union of all possible fields (heading, bullets, kpiValues, timelineItems, quoteText, etc.)
- `PresentationTemplate` — { colors: ThemeColors, fonts, spacing, logoUrl, backgroundPattern }
- `Presentation` — { id, title, templateId, slides[], language }

## Slide Rendering Model

Each slide renders at **1280×720** (16:9) and is CSS-scaled using `transform: scale(N)`.
All slides receive `(slide, template)` props. Colors come from `template.colors.*`.
Background patterns (geometric/dots/grid) are SVG overlays in `SlideRenderer.tsx`.

## Conventions

- **Quality gate:** Before pushing, run `npm run verify` from repo root (or `cd frontend && npm run verify`). Pre-commit hook runs `verify:quick` (lint + typecheck only). CI runs full `verify` on `main`.
- **Language:** Russian for UI text and generated content. Code/comments in English.
- **Styling:** All slides use inline `style={{ color: c.foreground }}` — NOT Tailwind color classes. This is intentional because colors come from the dynamic template object.
- **Tailwind v4:** Uses `@theme inline {}` syntax. No `tailwind.config.js`.
- **State:** Zustand store at `lib/store/presentation-store.ts`. Single source of truth.
- **Generation:** SSE streaming via `ReadableStream` in route handler. Client parses `data: {event, data}\n\n` lines.
- **Export:** Client-side PPTX via PptxGenJS. PDF export via Puppeteer is TODO.

## Environment

- Node 20+, npm
- `cd frontend && npm run dev` → http://localhost:3000
- `.env.local` must have `OPENAI_API_KEY`
- From repo root: `npm install` once (enables Husky); frontend deps still via `cd frontend && npm install`

## What's Working

- ✅ ESLint (max warnings 0) + `tsc --noEmit` + pre-commit hook; GitHub Actions CI on `main`
- ✅ Prompt → AI generates outline → streams slides → visual preview
- ✅ 10 slide layout types with Sovcombank branding
- ✅ 3 templates (Sovcombank, Dark, Minimal)
- ✅ Slide navigation (thumbnails sidebar + arrows)
- ✅ PPTX export
- ✅ Demo page at /demo
- ✅ Inline editing: headings, bullet points, quotes, contacts (contentEditable)
- ✅ Layout switcher dropdown in right panel
- ✅ Add/delete slide buttons
- ✅ "New presentation" button → resets to prompt screen

## What's NOT Working Yet

- ❌ Image replacement (drag-and-drop or URL input)
- ❌ Stock photo search (Pexels/Unsplash API)
- ❌ AI image generation (Kandinsky API)
- ❌ PDF export
- ❌ Document upload + parsing
- ❌ Outline editor (edit structure before generation)
- ❌ Template customizer (upload logo, pick colors)
- ❌ Auth / user accounts
- ❌ Billing / subscription
