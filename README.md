# SlideForge — презентации (веб-приложение)

Продукт: AI-генератор корпоративных презентаций. В этом репозитории — **монорепозиторий** с одним приложением Next.js: **UI + серверные API** в каталоге `presentations-frontend/` (npm-пакет `slideforge-presentations-web`). Корень репозитория — `slideforge-presentations` (хуки, общие скрипты).

## Где «бэкенд»

Отдельного бэкенд-сервиса нет. Запросы к OpenAI и Pexels идут из **Route Handlers** Next.js: `presentations-frontend/src/app/api/...`. Локально это тот же процесс, что и `next dev`; на Vercel — serverless-функции того же деплоя.

## Quick Start

```bash
cd presentations-frontend
cp .env.local.example .env.local  # add your OPENAI_API_KEY
npm install
npm run dev
```

Open http://localhost:3000

### One-time: Git hooks (pre-commit)

From the **repo root** (not only `presentations-frontend/`):

```bash
npm install
```

Husky runs `lint` + `typecheck` on `git commit`. Full gate (including production build):

```bash
npm run verify
```

Same checks run in **GitHub Actions** on push/PR to `main` (`.github/workflows/presentations-ci.yml`).

### Deploy (Vercel, после push в `main`)

После успешного CI workflow выкатывает **production** через Vercel CLI. Нужно один раз:

1. Создать проект в [Vercel](https://vercel.com): импорт репозитория, **Root Directory** = `presentations-frontend`.
2. В Vercel → Project → Settings → Environment Variables задать `OPENAI_API_KEY`, `PEXELS_API_KEY` (и при необходимости остальное).
3. В GitHub → репозиторий → **Settings → Secrets and variables → Actions** добавить (это **не** то же самое, что переменные в Vercel):
   - **`VERCEL_TOKEN`** — [Vercel → Account Settings → Tokens](https://vercel.com/account/tokens): создать токен, вставить в секрет **целиком**, без пробелов. Без него: `no-credentials-found`.
   - **`VERCEL_PROJECT_ID`** — Vercel → твой **проект** → **Settings** → **General** → блок **Project ID** → скопировать (часто начинается с `prj_`).
   - **`VERCEL_ORG_ID`** — это ID команды/аккаунта, к которому привязан проект:
     - В шапке Vercel выбери **team** (или Personal team) → **Settings** (настройки команды) → **Team ID**; или
     - локально: `cd presentations-frontend && npx vercel link`, затем из файла `.vercel/project.json` поля `projectId` → GitHub-секрет `VERCEL_PROJECT_ID`, `orgId` → **`VERCEL_ORG_ID`** (файл `.vercel/` в git не коммитить).

   Без любого из трёх секретов job `deploy-vercel` упадёт; CI (`verify`) по-прежнему выполнится.

**Если проект в Vercel уже был привязан к старому пути `frontend/`**, в настройках проекта смените **Root Directory** на `presentations-frontend`.

## Docs for AI Agents

| File | Purpose |
|------|---------|
| [AGENTS.md](AGENTS.md) | Architecture, codebase map, conventions |
| [docs/KANBAN.md](docs/KANBAN.md) | Task board — epics, sprints, priorities |
| [.cursor/rules/slideforge.mdc](.cursor/rules/slideforge.mdc) | Cursor agent rules |

## Tech Stack

- **App:** Next.js 16, TypeScript, Tailwind v4, Shadcn/ui, Zustand (каталог `presentations-frontend/`)
- **AI:** OpenAI GPT-4o-mini (JSON mode, SSE streaming)
- **Export:** PptxGenJS (PPTX), Puppeteer (PDF — planned)
- **Templates:** Sovcombank, Modern Dark, Minimal

## Features

- Prompt → outline → 10 slide types → visual preview
- 3 corporate templates with brand colors
- PPTX export
- Real-time slide-by-slide generation with SSE streaming
