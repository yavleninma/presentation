# SlideForge

SlideForge is not a generic AI slide maker anymore. It is a decision-package copilot for enterprise IT leaders: a public Next.js app that turns scattered status updates, KPI fragments, risks, and source notes into a management package for CEOs, CFOs, steering committees, and investment committees.

## Product Shape

- `/` -> scenario-first guided brief for management communication
- outline-first flow -> extraction findings, storyline options, structure approval
- package generation -> executive-ready slides, notes, appendix logic, slide-level regeneration by intent
- `/demo` -> public scenario-led previews instead of a gallery of slide types

## Repo Structure

- `presentations-frontend/` - app, route handlers, templates, slide rendering, export
- `docs/` - roadmap, strategy, and codebase map
- `AGENTS.md` - repo operations, routes, commands, QA rules

## Quick Start

```bash
npm install
cd presentations-frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment

For full generation flows on `/`, set in `presentations-frontend/.env.local`:

- `OPENAI_API_KEY`
- `PEXELS_API_KEY`

Without those keys you can still inspect the public shell and `/demo`, but not claim a successful end-to-end generation pass.

## Checks

From repo root:

```bash
npm run verify:quick
npm run verify
```

App-only build:

```bash
npm run build --prefix presentations-frontend
```

## Deploy

The app deploys from `presentations-frontend` on Vercel.

Required Vercel project settings:

- Root Directory -> `presentations-frontend`
- environment variables -> `OPENAI_API_KEY`, `PEXELS_API_KEY`

Required GitHub Actions secrets for production deploy:

- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`

## Agent Docs

- [AGENTS.md](AGENTS.md)
- [docs/KANBAN.md](docs/KANBAN.md)
- [docs/CODEBASE-GRAPH.md](docs/CODEBASE-GRAPH.md)
- [docs/STRATEGY.md](docs/STRATEGY.md)
