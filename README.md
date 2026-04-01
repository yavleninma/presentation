# SlideForge

AI-генератор корпоративных презентаций для российского бизнеса.

## Quick Start

```bash
cd frontend
cp .env.local.example .env.local  # add your OPENAI_API_KEY
npm install
npm run dev
```

Open http://localhost:3000

### One-time: Git hooks (pre-commit)

From the **repo root** (not only `frontend/`):

```bash
npm install
```

Husky runs `lint` + `typecheck` on `git commit`. Full gate (including production build):

```bash
npm run verify
```

Same checks run in **GitHub Actions** on push/PR to `main` (`.github/workflows/frontend-ci.yml`).

## Docs for AI Agents

| File | Purpose |
|------|---------|
| [AGENTS.md](AGENTS.md) | Architecture, codebase map, conventions |
| [docs/KANBAN.md](docs/KANBAN.md) | Task board — epics, sprints, priorities |
| [.cursor/rules/slideforge.mdc](.cursor/rules/slideforge.mdc) | Cursor agent rules |

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind v4, Shadcn/ui, Zustand
- **AI:** OpenAI GPT-4o-mini (JSON mode, SSE streaming)
- **Export:** PptxGenJS (PPTX), Puppeteer (PDF — planned)
- **Templates:** Sovcombank, Modern Dark, Minimal

## Features

- Prompt → outline → 10 slide types → visual preview
- 3 corporate templates with brand colors
- PPTX export
- Real-time slide-by-slide generation with SSE streaming
