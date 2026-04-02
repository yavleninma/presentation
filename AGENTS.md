# SlideForge — AI Presentation Generator

> **RULE FOR EVERY AGENT:** After completing your work, update this file AND `docs/KANBAN.md` AND `docs/CODEBASE-GRAPH.md` to reflect your changes. Check off completed tasks, update file maps, fix line counts, move "NOT Working" items to "Working" if you implemented them. This keeps the next agent fast and accurate.

## Quick Context (read this first)

SlideForge — SaaS-генератор презентаций для российского бизнеса (аналог Gamma/KIMI для РФ).
Первый клиент — Совкомбанк (корпоративный шаблон встроен). Цель — продукт для малого/среднего бизнеса с подпиской.

**Стек:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + Shadcn/ui + Zustand + OpenAI API + PptxGenJS.

### Where the “backend” runs

There is **no separate backend repo or long‑running server process**. Server logic lives in **Next.js Route Handlers** under `presentations-frontend/src/app/api/**/route.ts` (e.g. `/api/generate`, `/api/images/search`).

- **Local:** `cd presentations-frontend && npm run dev` — one Node process serves the UI and executes API routes on demand.
- **Production (e.g. Vercel):** the same app deploys as **Serverless Functions** (or the platform’s equivalent) for those routes; the browser still talks to the same origin (`/api/...`).

## Agent Roles

The project uses two switchable roles via Cursor manual rules (`.cursor/rules/`). Reference one at the start of a chat to activate it:

| Role | File | Invoke with | Purpose |
|------|------|-------------|---------|
| **Engineer** | `.cursor/rules/engineer.mdc` | `@engineer` | Executes tasks from kanban. Writes code, runs quality checks, updates docs. No product strategy. |
| **Strategist** | `.cursor/rules/strategist.mdc` | `@strategist` | Business partner & growth experimenter. Analyzes product, proposes hypotheses, updates kanban & strategy. Never edits product code. |

Both roles inherit project context from `slideforge.mdc` (always-applied).

**Strategist CAN edit:** `docs/*`, `AGENTS.md`, `.cursor/rules/` — operational & strategic files only.
**Engineer CAN edit:** everything in the codebase + all docs (mandatory doc updates after each task).

## Repository layout (root)

```
presentation/                          # npm package: slideforge-presentations
├── package.json              # Husky prepare; scripts delegate to presentations-frontend
├── .husky/pre-commit         # Runs npm run verify:quick (eslint + tsc)
├── .github/workflows/presentations-ci.yml  # CI + Vercel deploy on push to main (see README)
├── presentations-frontend/   # Next.js app: UI + API routes (npm: slideforge-presentations-web)
├── docs/
│   ├── KANBAN.md             # Sprint board — source of truth for task status
│   ├── STRATEGY.md           # Product strategy, decisions, competitive landscape
│   ├── KIMI-UX-PLAYBOOK.md   # UX benchmark: KIMI patterns to adopt (read before UX tasks!)
│   └── CODEBASE-GRAPH.md     # File dependency graph + size guide
├── .cursor/rules/
│   ├── slideforge.mdc        # Always-on: architecture, conventions, quality gates
│   ├── engineer.mdc          # Manual: executor role
│   └── strategist.mdc        # Manual: business partner role
└── AGENTS.md
```

## Architecture

```
User enters prompt
       ↓
[Next.js API route: /api/generate]  (same app as UI)
       ↓
OpenAI GPT-5.4-mini (JSON mode; Chat Completions; override via OPENAI_MODEL)
  1. Generate outline (slide titles + layouts)
  2. For each slide → generate content JSON
       ↓
SSE stream → browser (React app)
       ↓
[Zustand store] → [SlideRenderer] → visual preview
       ↓
Export: PptxGenJS (PPTX) / Puppeteer (PDF, TODO)
```

## Codebase Map

```
presentations-frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main UI: prompt input + presentation viewer
│   │   ├── demo/page.tsx         # Demo page showing all 10 slide types
│   │   ├── layout.tsx            # Root layout (Inter font, cyrillic)
│   │   ├── globals.css           # Tailwind v4 + Shadcn theme vars
│   │   ├── api/generate/route.ts # SSE endpoint: OpenAI → stream slides
│   │   └── api/images/search/route.ts # Pexels image search API
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
│   │   ├── images/
│   │   │   └── pexels.ts         # Pexels API client for stock photos
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

## Design Tools & Setup

> **Read `docs/DESIGN-STANDARDS.md` before any UI or template task.** It defines the aesthetics reference, font choices per template, and anti-patterns to avoid.

### Claude Code design skills (install once)

**Skill `frontend-design`** — Anthropic official. Solves "AI slop". 277k installs.
- Activate per session: `/frontend-design`
- Skill chain for UI tasks: `/frontend-design` → `/baseline-ui` → `/fixing-accessibility`

**shadcn/ui MCP** — prevents prop hallucinations with shadcn components:
```json
// .claude/settings.json → mcpServers:
{
  "shadcn": {
    "command": "npx",
    "args": ["-y", "@shadcn-ui/mcp-server"],
    "cwd": "./presentations-frontend"
  }
}
```

**Figma MCP** — POST-MVP. Connect when design system is established (requires Figma Desktop + Dev seat).

### Core design rule

Every template = a distinct aesthetic concept. Never a variation of the same blue.
Heading font ≠ body font. No purple/indigo/violet gradients. Backgrounds must have atmosphere.
See `docs/DESIGN-STANDARDS.md` for full spec including exact font names and color palettes.

---

## Conventions

- **Quality gate:** Before pushing, run `npm run verify` from repo root (or `cd presentations-frontend && npm run verify`). Pre-commit hook runs `verify:quick` (lint + typecheck only). CI runs full `verify` on `main`.
- **Language:** Russian for UI text and generated content. Code/comments in English.
- **Styling:** All slides use inline `style={{ color: c.foreground }}` — NOT Tailwind color classes. This is intentional because colors come from the dynamic template object.
- **Tailwind v4:** Uses `@theme inline {}` syntax. No `tailwind.config.js`.
- **State:** Zustand store at `lib/store/presentation-store.ts`. Single source of truth.
- **Generation:** SSE streaming via `ReadableStream` in route handler. Client parses `data: {event, data}\n\n` lines. User-facing slide count is **1–10** (UI select + server/client clamp) to limit LLM cost.
- **Export:** Client-side PPTX via PptxGenJS. PDF export via Puppeteer is TODO.

## Environment

- Node 20+, npm
- `cd presentations-frontend && npm run dev` → http://localhost:3000
- `presentations-frontend/.env.local` must have `OPENAI_API_KEY` and `PEXELS_API_KEY` (get free key at pexels.com/api)
- Optional: `OPENAI_MODEL` to override default model (default is `gpt-5.4-mini`)
- From repo root: `npm install` once (enables Husky); app deps via `cd presentations-frontend && npm install`

## What's Working

- ✅ ESLint (max warnings 0) + `tsc --noEmit` + pre-commit hook; GitHub Actions CI on `main`
- ✅ Prompt → AI generates outline → streams slides → visual preview
- ✅ 10 slide layout types with Sovcombank branding
- ✅ 3 templates (Sovcombank, Dark, Minimal)
- ✅ Slide navigation (thumbnails sidebar + arrows)
- ✅ PPTX export (all 10 layout types, including images)
- ✅ Demo page at /demo
- ✅ Inline editing: headings, bullet points, quotes, contacts (contentEditable)
- ✅ Layout switcher dropdown in right panel
- ✅ Add/delete slide buttons
- ✅ "New presentation" button → resets to prompt screen
- ✅ Pexels stock photo integration (auto-fetch for image-text / full-image slides)
- ✅ Image fallback gradients when Pexels unavailable
- ✅ `/api/images/search` route for client-side image search

## What's NOT Working Yet

- ❌ Image replacement (drag-and-drop or URL input)
- ❌ AI image generation (Kandinsky API)
- ❌ PDF export
- ❌ Document upload + parsing
- ❌ Outline editor (edit structure before generation)
- ❌ Template customizer (upload logo, pick colors)
- ❌ Auth / user accounts
- ❌ Billing / subscription
