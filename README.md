# Presentation

Репозиторий перезапущен под текущую версию Vnyatno.

## Текущий маршрут

Сейчас в продукте один рабочий путь:

`start -> clarify -> building -> draft -> editor`

Пользователь начинает с короткого рабочего запроса, попадает в короткое уточнение, при желании сразу запускает сборку, получает шестислайдовый draft, правит его и только потом переходит в editor для локальной пересборки активного слайда.

## Что это умеет сейчас

Текущая версия в `presentations-frontend/` умеет:

- принять рабочий запрос без раннего выбора темы и формата;
- открыть короткое уточнение с быстрыми ответами и необязательной перепиской;
- показать отдельное состояние сборки без пустого draft;
- собрать draft из 6 слайдов через `/api/draft`;
- дать чат для правок и уточнений прямо на draft-экране;
- удержать один `DraftSession` между уточнением, draft и editor;
- показать editor с лентой слайдов, холстом и drawer;
- локально пересобрать только активный слайд;
- открыть режим показа презентации из editor.

## Что пока не обещаем

- Нет большого onboarding.
- Нет экспорта.
- Нет расширенного набора стартовых сценариев поверх первого демо-потока `Показ продукта`.

## Источники истины

Для продукта и UI опираемся на:

- `VNYATNO.md`
- `MUTNO.md`
- `DESIGN_SPINE.md`
- `UI_KIT_V0.md`
- `SCREEN_ATLAS.md`
- `COPY_RULES.md`

Если код спорит с этими файлами, правим код и затем приводим документацию к одному слою.

## Документы для агентов

- `AGENTS.md` — режим «Внятно», дизайн-основание, git, делегирование
- `SLED_SMEN.md` — журнал смен и передача контекста между чатами
- `AGENTS_BRAND_KIT_sovcom-inspired.md` — опциональный гайд по тону и визуальной подаче

Устаревшие Cursor rules для старого SlideForge: `old/.cursor/rules/`.

## Проверка

Базовый локальный проход:

```bash
npm run verify
```

Smoke для главного маршрута:

```bash
npm run smoke
```

`npm run smoke` сам собирает production build, поднимает локальный сервер, проверяет путь `start -> clarify -> building -> draft -> editor`, отдельно ловит ошибку первого `clarify`, а `generate/revise` мокает без реального `OPENAI_API_KEY`.

Для production-сборки используется тот же workspace:

```bash
npm run start --workspace presentations-frontend
```

## Git и деплой

Для репозитория действует одна рабочая ветка `main`.
Коммит и пуш делаем только по явной команде пользователя.

Для Vercel опорой считается `presentations-frontend` как root directory.
Автодеплой через Git-интеграцию Vercel отключён в `presentations-frontend/vercel.json`.
Единственная production-дорога идёт через `.github/workflows/presentations-ci.yml`: push в `main` проходит `npm run verify`, затем `npm run smoke`, затем `vercel deploy --prod`, затем перепривязку `vnyatno.vercel.app` к свежему deployment.

Целевой production-адрес:

`https://vnyatno.vercel.app`
