# SlideForge — Канбан-доска

> **RULE:** When you finish a task, check it off `[x]` here. When all tasks in an epic are done, move the epic to Done. When starting an epic, move it to In Progress. This file is the source of truth for project status.
>
> Each epic = separate chat session. Read `AGENTS.md` for full context before starting.
> Role shortcuts: Cursor — `@eng` = engineer, `@strat` = strategist. Codex — просто пиши `Инженер, ...` или `Стратег, ...`.
>
> **Priority logic:** Outline-first UX → Live generation feel → Output quality → Export fidelity → Landing → Persistence → Auth → Billing.
> Everything else is secondary until we have paying users.

---

## 🔴 Backlog

### EPIC-08: Auth + Accounts
- [ ] Авторизация (email/OAuth через NextAuth или Clerk)
- [ ] Сохранение презентаций в БД (SQLite → PostgreSQL)
- [ ] История презентаций пользователя ("Мои презентации")
- [ ] Лимиты по тарифу (free: 3/мес, starter: без лимита, business: приоритет + API)

### EPIC-09: Billing
- [ ] Интеграция ЮKassa / CloudPayments
- [ ] Тарифные планы: Free (3 презы/мес + водяной знак), Starter 490₽/мес, Business 1490₽/мес
- [ ] B2B white-label пакет (кастомный шаблон + бренд), от 50K₽/мес
- [ ] Трекинг использования (генерации, слайды, LLM-токены)

### EPIC-12: Growth Mechanics
- [ ] Водяной знак "Made with SlideForge" на бесплатных экспортах
- [ ] Share link: /p/[id] — отправить презентацию коллеге
- [ ] Промпт-подсказки (6 кнопок: "Питч-дек", "Квартальный отчёт", "Стратегия", "Обучение", "Продажи", "Запуск продукта")
- [ ] Analytics: Posthog/Mixpanel — кто генерит, что генерит, где бросает
- [ ] Sentry для ошибок

### EPIC-07: Document Upload
- [ ] Загрузка DOCX/PDF/TXT файлов
- [ ] Парсинг в Markdown
- [ ] Передача текста в LLM как контекст для генерации
- Приоритет: ПОСЛЕ landing + auth. Но потенциально самый сильный use case.

### ~~EPIC-06: Outline Editor~~ → moved to To Do (priority up)

---

## 🟡 To Do (в порядке приоритета)

### EPIC-19: Collaboration-Safe Packaging ⭐ NEW
> Conditional strategic track: do this before giving any code access to employer/partner.
- [ ] Определить границу `Private Core` / `Shared Wrapper` / `Work Edition`
- [ ] Зафиксировать список приватных активов: prompts, template R&D, strategy docs, agents, evals, коммерческие заметки
- [ ] Подготовить отдельный work-safe repo/branch без `.env*`, стратегических доков и внутренних agent/system файлов
- [ ] Выделить интерфейс/adapter boundary, чтобы shared-версия запускалась без доступа к приватному core-репо
- [ ] Подготовить `README` + `env.example` для shared-версии без секретов
- [ ] Подготовить короткий IP/NDA/ownership memo до любого code-sharing
- Контекст: нужен controlled sharing с работодателем/партнёром без передачи всего moat целиком.

### EPIC-06: Outline Editor ⬆️ PRIORITY UP
> Самый большой UX-разрыв с KIMI. `PresentationOutline` тип есть, `onOutline` callback в SSE есть.
- [ ] Подключить `onOutline` → Zustand/UI и сделать отдельный экран подтверждения плана до генерации слайдов
- [ ] UI для показа аутлайна (заголовки слайдов + тезисы) сразу после генерации плана
- [ ] Отдельное CTA на этапе outline: "Утвердить план и продолжить"
- [ ] Редактирование: изменить заголовок, удалить/добавить слайд в аутлайне
- [ ] Drag-and-drop порядка слайдов в аутлайне
- [ ] Выбор layout для каждого слайда в аутлайне
- [ ] Кнопка "Выглядит хорошо, генерируй!" → запуск генерации слайдов
- [ ] Выбор шаблона МЕЖДУ аутлайном и генерацией (перенести из начального экрана)

### EPIC-18: Output Fidelity Pass ⭐ NEW
> Цель: чтобы презентация ощущалась "дорогой" не только в браузере, но и в результате.
- [ ] Убрать hardcoded `Arial` из PPTX-экспорта и привязать шрифты к `template.fonts`
- [ ] Preview ↔ PPTX parity audit по всем 10 layout-типам: найти и завести mismatch-список
- [ ] Усилить различия шаблонов не только цветом, но и типографикой, плотностью и визуальным ритмом
- [ ] Пройтись по дефолтным spacing/typography токенам шаблонов и убрать ощущение "одного и того же шаблона в разных цветах"
- [ ] Улучшить imageQuery/подбор визуалов, чтобы меньше было generic stock-photo эффекта
- [ ] Ввести quality-review для `/demo`: каждый шаблон должен давать ощутимо разное впечатление на одном и том же контенте

### EPIC-16: Slide-Level Regeneration ⭐ NEW
> Ref: KIMI-UX-PLAYBOOK.md §6 — перегенерация блоков
- [ ] Кнопка "🔄 Переписать" при hover на заголовок → AI перегенерирует только этот текст
- [ ] Кнопка "🔄 Переписать слайд" → перегенерация контента, сохраняя layout + шаблон
- [ ] Quick-actions на каждом слайде: "Короче" | "Формальнее" | "Переписать"
- [ ] API route для мини-генерации (один блок/слайд, не вся дека)

### EPIC-13: UX Quick Wins
- [x] Выбор числа слайдов при генерации: только 1–10 (меньше токенов / быстрее)
- [x] Сменить дефолтный шаблон на "Минимализм" (универсальнее Совкомбанка)
- [ ] localStorage persistence — не терять презентацию при перезагрузке
- [x] Разные шрифты для шаблонов (сейчас все на Inter — шаблоны выглядят одинаково)
- [x] Универсальный placeholder: "Квартальный отчёт по продажам" вместо банковского примера
- [x] Constraint в промпте: "Используй минимум 5 разных типов лейаутов, не повторяй layout > 2 раз"
- [ ] Синхронизировать дефолты между UI / client / server, чтобы везде был один стартовый шаблон и один quality baseline

### EPIC-14: New Templates
- [x] "Стартап / Pitch Deck" — яркий, с акцентом на метрики
- [x] "Консалтинг / McKinsey" — строгий, data-heavy
- [x] "IT / Технологии" — тёмный, с моноширинным акцентом
- [ ] AI-подбор шаблона на основе темы (Freestyle-режим)
- Зачем: разнообразие шаблонов = ощущение премиальности + каждый находит "свой"

### EPIC-10: Landing Page
- [ ] Hero + "Попробовать бесплатно" (без регистрации!)
- [ ] 3 примера готовых презентаций (скриншоты/гифки)
- [ ] SEO: мета-теги, title "AI генератор презентаций на русском"
- [ ] Видео/гифка процесса генерации
- [ ] Open Graph для шеринга

### EPIC-05: PDF Export
- [ ] Серверный рендеринг слайдов через Puppeteer
- [ ] API route `/api/export/pdf`
- [ ] Кнопка "PDF" рядом с "PPTX" в хедере

### EPIC-11: Deploy
- [x] Vercel production после push в `main`: job `deploy-vercel` в `.github/workflows/presentations-ci.yml` + секреты `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (см. README); Vercel Project Root Directory = `presentations-frontend`, а GitHub Actions deploy запускается из repo root
- [ ] Домен slideforge.ru / slideforge.app
- [ ] Мониторинг (Sentry)
- [x] CI: GitHub Actions — lint, typecheck, build на `main` / PR

---

## ✅ Done

### EPIC-20: Public Scenario QA Enablement
- [x] Project-scoped `.codex/config.toml` added for repeatable Codex QA with conservative sandboxing and isolated Playwright MCP
- [x] Reusable `.agents/skills/public-scenario-qa/` skill added for no-auth browser scenario passes
- [x] Repo-derived public scenario reference added for `/` and `/demo`
- [x] `AGENTS.md` tightened around browser-first public UX QA rules and definition of done
- [x] Unified local skill naming added: `slideforge-engineer`, `slideforge-strategist`, `slideforge-public-ux-qa`
- [x] QA role clarified: `slideforge-public-ux-qa` only tests and reports, fixes belong to engineer mode

### EPIC-15: "KIMI-like" Generation UX ⭐ NEW
> Ref: `docs/KIMI-UX-PLAYBOOK.md` - полный разбор паттернов
- [x] **Реальный live-stream preview**: инициализировать пустую презентацию и показывать `slide`-события сразу, а не только после финального `presentation`
- [x] **Нормальный state flow генерации**: `idle → outline review → generating → polishing → complete`, без "мертвой паузы" между prompt и результатом
- [x] **Театр прогресса**: SSE-события thinking/researching/slide_start/polishing + анимированный статус-бар
- [x] **Анимация появления слайдов**: fade-in + auto-scroll к текущему слайду при генерации
- [x] **Прогресс генерации**: "Генерирую слайд 3 из 8: «Анализ рынка»..."
- [x] **Спикер-ноуты**: генерировать `notes` в промпте + показать в правой панели (поле уже есть в типе!)
- [x] **Промпт-подсказки**: 6 кликабельных кнопок-примеров под textarea (из EPIC-13)
- Результат: outline теперь виден как отдельная стадия, генерация идёт без пустой паузы, а UI показывает живой прогресс и speaker notes до финального `presentation`.

### EPIC-17: Design System Upgrade
- [x] Загрузка шрифтов через Google Fonts `<link>` + CSS custom properties: Bricolage Grotesque, Space Grotesk, IBM Plex Sans, Syne, DM Sans, Playfair Display, Source Sans 3, Space Mono
- [x] `minimal.ts`: heading → Bricolage Grotesque
- [x] `modern-dark.ts`: heading → Space Grotesk + новые цвета (teal/emerald/amber on near-black)
- [x] `sovcombank.ts`: heading → IBM Plex Sans
- [x] Новый шаблон `startup.ts`: Syne + DM Sans, green+orange on black
- [x] Новый шаблон `consulting.ts`: Playfair Display + Source Sans 3, navy+red on white
- [x] Новый шаблон `tech.ts`: Space Mono, terminal green on near-black
- [x] `index.ts`: 6 шаблонов зарегистрировано, дефолт → minimal
- [x] `prompts.ts`: LAYOUT DIVERSITY RULE — min 5 типов, content ≤ 40%, не повторять тип 2 раза подряд
- [x] `page.tsx`: дефолтный шаблон → minimal

### EPIC-04: Images
- [x] Интеграция Pexels API — API route `/api/images/search`
- [x] Автоподстановка фото: image-text и full-image слайды (imageQuery уже генерируется!)
- [x] Фото в PPTX экспорте
- [x] Fallback: placeholder с градиентом если Pexels не вернул результат
- [x] Кэширование URL изображений в slide.content.imageUrl

### EPIC-04b: PPTX Export Fix
- [x] Two-columns: два столбца вместо generic fallback
- [x] Image-text: изображение + текст
- [x] Timeline: горизонтальная шкала
- [x] Full-image: фоновое изображение + текст поверх
- [x] Thank-you: контактная информация с красивой вёрсткой

### EPIC-01: Core Foundation
- [x] Next.js 16 + TypeScript + Tailwind v4 + Shadcn/ui
- [x] Система типов (`types/presentation.ts`)
- [x] Zustand store с CRUD для слайдов
- [x] 6 шаблонов: Минимализм, Modern Dark (обновлён), Совкомбанк, Стартап, Консалтинг, IT
- [x] Template registry с `getTemplate()`

### EPIC-02: AI Generation + Rendering
- [x] OpenAI API route с SSE streaming
- [x] Промпты для аутлайна и контента каждого слайда
- [x] 10 типов слайдов (title, section, content, two-columns, image-text, kpi, timeline, quote, full-image, thank-you)
- [x] `SlideRenderer` с фоновыми паттернами и логотипом
- [x] Главный UI: ввод промпта + превью + навигация + сайдбар миниатюр
- [x] PPTX экспорт через PptxGenJS (базовый, 5 из 10 типов)
- [x] Демо-страница `/demo`

### EPIC-03: Slide Editor
- [x] Inline-редактирование заголовков (contentEditable)
- [x] Inline-редактирование буллет-поинтов
- [x] Переключение layout слайда через dropdown
- [x] Удаление слайда
- [x] Добавление пустого слайда
- [x] Кнопка "Новая презентация" → возврат к экрану ввода
- ~~[ ] Замена изображений~~ → перенесено в EPIC-04 (Images)
