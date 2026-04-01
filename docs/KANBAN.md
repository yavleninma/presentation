# SlideForge — Kanбан-доска

> **RULE:** When you finish a task, check it off `[x]` here. When all tasks in an epic are done, move the epic to Done. When starting an epic, move it to In Progress. This file is the source of truth for project status.
>
> Each epic = separate chat session. Read `AGENTS.md` for full context before starting.

---

## 🔴 Backlog

### EPIC-08: Auth + Accounts
- [ ] Авторизация (email/password или OAuth)
- [ ] Сохранение презентаций в БД (SQLite → PostgreSQL)
- [ ] История презентаций пользователя
- [ ] Лимиты по тарифу (free/starter/business)

### EPIC-09: Billing
- [ ] Интеграция ЮKassa / CloudPayments
- [ ] Тарифные планы (free 3/мес, starter 499р, business 1490р)
- [ ] Pay-per-use модель как альтернатива
- [ ] Трекинг использования (презентации, слайды, LLM-токены)

### EPIC-10: Landing Page
- [ ] Продающая страница с демо
- [ ] SEO-оптимизация под "генератор презентаций AI"
- [ ] Примеры сгенерированных презентаций

### EPIC-11: Deploy
- [ ] Docker Compose (frontend + optional backend)
- [x] CI: GitHub Actions — lint, typecheck, build на `main` / PR
- [ ] CI/CD: автодеплой из Actions (опционально; сейчас Vercel по Git)
- [ ] Мониторинг (Sentry, логи)
- [ ] Домен + SSL

---

## 🟡 To Do (приоритет)

### EPIC-04: Stock Photos + AI Images
- [ ] Интеграция Pexels API (поиск по imageQuery)
- [ ] Автоматическая подстановка фото в image-text и full-image слайды
- [ ] Кэширование изображений
- [ ] Fallback: Unsplash API
- [ ] Kandinsky API (Fusion Brain) для AI-генерации иллюстраций
- Контекст: `SlideContent.imageQuery` уже генерируется AI на английском

### EPIC-05: PDF Export
- [ ] Серверный рендеринг слайдов через Puppeteer
- [ ] API route `/api/export/pdf`
- [ ] Кнопка "PDF" рядом с "PPTX" в хедере
- Контекст: слайды уже рендерятся в HTML, нужно просто скриншотить

### EPIC-06: Outline Editor
- [ ] UI для редактирования аутлайна перед генерацией
- [ ] Drag-and-drop порядка слайдов в аутлайне
- [ ] Выбор layout для каждого слайда
- [ ] Добавление/удаление слайдов из аутлайна
- Контекст: `PresentationOutline` тип уже есть, `onOutline` callback в SSE

### EPIC-07: Document Upload
- [ ] Загрузка DOCX/PDF/TXT файлов
- [ ] Конвертация в Markdown (python-docx / pdf-parse)
- [ ] Превью и редактирование извлечённого текста
- [ ] Передача текста в LLM как контекст для генерации

---

## 🔵 In Progress

### EPIC-03: Slide Editor
- [x] Inline-редактирование заголовков (contentEditable)
- [x] Inline-редактирование буллет-поинтов
- [ ] Замена изображений (drag-and-drop или URL)
- [x] Переключение layout слайда через dropdown
- [x] Удаление слайда
- [x] Добавление пустого слайда
- [x] Кнопка "Новая презентация" → возврат к экрану ввода
- Контекст: `EditableText` компонент в `components/editor/`, все 10 slide-компонентов поддерживают inline editing

---

## ✅ Done

### EPIC-01: Core Foundation
- [x] Next.js 16 + TypeScript + Tailwind v4 + Shadcn/ui
- [x] Система типов (`types/presentation.ts`)
- [x] Zustand store с CRUD для слайдов
- [x] 3 шаблона: Совкомбанк, Modern Dark, Минимализм
- [x] Template registry с `getTemplate()`

### EPIC-02: AI Generation + Rendering
- [x] OpenAI API route с SSE streaming
- [x] Промпты для аутлайна и контента каждого слайда
- [x] 10 типов слайдов (title, section, content, two-columns, image-text, kpi, timeline, quote, full-image, thank-you)
- [x] `SlideRenderer` с фоновыми паттернами и логотипом
- [x] Главный UI: ввод промпта + превью + навигация + сайдбар миниатюр
- [x] PPTX экспорт через PptxGenJS
- [x] Демо-страница `/demo`
