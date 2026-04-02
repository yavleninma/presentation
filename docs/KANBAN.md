# SlideForge — Канбан-доска

> **RULE:** When you finish a task, check it off `[x]` here. When all tasks in an epic are done, move the epic to Done. When starting an epic, move it to In Progress. This file is the source of truth for project status.
>
> Each epic = separate chat session. Read `AGENTS.md` for full context before starting.
>
> **Priority logic:** Image → Export quality → Landing → Persistence → Auth → Billing.
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

### EPIC-06: Outline Editor
- [ ] UI для редактирования аутлайна перед генерацией
- [ ] Drag-and-drop порядка слайдов
- [ ] Выбор layout для каждого слайда в аутлайне
- [ ] Добавление/удаление слайдов из аутлайна
- Контекст: `PresentationOutline` тип уже есть, `onOutline` callback в SSE

---

## 🟡 To Do (в порядке приоритета)

### EPIC-10: Landing Page
- [ ] Hero + "Попробовать бесплатно" (без регистрации!)
- [ ] 3 примера готовых презентаций (скриншоты/гифки)
- [ ] SEO: мета-теги, title "AI генератор презентаций на русском"
- [ ] Видео/гифка процесса генерации
- [ ] Open Graph для шеринга

### EPIC-13: UX Quick Wins
- [x] Выбор числа слайдов при генерации: только 1–10 (меньше токенов / быстрее)
- [ ] Сменить дефолтный шаблон на "Минимализм" (универсальнее Совкомбанка)
- [ ] localStorage persistence — не терять презентацию при перезагрузке
- [ ] Промпт-подсказки: 6 кликабельных примеров под textarea
- [ ] Разные шрифты для шаблонов (сейчас все на Inter — шаблоны выглядят одинаково)
- [ ] Универсальный placeholder: "Квартальный отчёт по продажам" вместо банковского примера

### EPIC-14: New Templates
- [ ] "Стартап / Pitch Deck" — яркий, с акцентом на метрики
- [ ] "Консалтинг / McKinsey" — строгий, data-heavy
- [ ] "IT / Технологии" — тёмный, с моноширинным акцентом
- Зачем: разнообразие шаблонов = ощущение премиальности + каждый находит "свой"

### EPIC-05: PDF Export
- [ ] Серверный рендеринг слайдов через Puppeteer
- [ ] API route `/api/export/pdf`
- [ ] Кнопка "PDF" рядом с "PPTX" в хедере

### EPIC-11: Deploy
- [x] Vercel production после push в `main`: job `deploy-vercel` в `.github/workflows/presentations-ci.yml` + секреты `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (см. README); Root Directory = `presentations-frontend`; альтернатива — только Git-интеграция в дашборде Vercel без этого job
- [ ] Домен slideforge.ru / slideforge.app
- [ ] Мониторинг (Sentry)
- [x] CI: GitHub Actions — lint, typecheck, build на `main` / PR

---

## 🔵 In Progress

(Nothing right now)

---

## ✅ Done

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
- [x] 3 шаблона: Совкомбанк, Modern Dark, Минимализм
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
