# Система компонентов слайдов

## Как устроена генерация

Презентация состоит из 6 слотов. Каждому слоту присвоена **функция** (`SlideFunctionId`), а каждой функции — **визуальный layout** (`CanvasLayoutId`).

| Слот | Функция | Layout | Визуал |
|------|---------|--------|--------|
| 01 | `open_topic` | `cover` | Крупный заголовок + subtitle (аудитория) + мета (цель) |
| 02 | `main_point` | `metrics` | 3 карточки с крупными числами (12%, 200мс, 40%) |
| 03 | `movement` | `steps` | 01 / 02 / 03 — нумерованные шаги с коннекторами |
| 04 | `evidence` | `checklist` | Строки с галочками (факты + 1 placeholder) |
| 05 | `tension` | `personas` | 3 карточки-персоны или fallback «Риск / Факт / Решение» |
| 06 | `next_step` | `features` | Иконка + заголовок + описание (3 фичи) |

Маппинг лежит в `demo-generator.ts` → `slideFunctionToLayout()`.

## Файлы

| Файл | Что делает |
|------|-----------|
| `lib/presentation-types.ts` | Типы: `CanvasLayoutId`, `SlideBlock`, `PresentationSlide` |
| `lib/demo-generator.ts` | Генерация: `buildBlocks` → 6 builder-функций |
| `components/slide-canvas.tsx` | Рендер: `renderSlideBody()` switch по layout |
| `app/globals.css` | Стили: секции `/* ── Cover layout ── */` и т.д. |

## Как добавить новый layout

1. Добавить значение в `CanvasLayoutId` в `presentation-types.ts`
2. Написать `buildXxxBlocks()` в `demo-generator.ts`
3. Привязать к `SlideFunctionId` в `slideFunctionToLayout()`
4. Добавить ветку в `renderSlideBody()` в `slide-canvas.tsx`
5. Добавить CSS в `globals.css` с секциями для каждого template (`strict`, `cards`, `briefing`)
6. Добавить thumbnail preview в `renderThumbnailPreview()`

## Как работают блоки

`SlideBlock` — единица контента внутри слайда:

```
id         — уникальный ключ
type       — семантика: focus | movement | constraint | proof | decision | fact
icon       — иконка: spark | file | trend | shield | flag | gap | arrow | clock
title      — заголовок блока (до 34 символов после fit-pass)
body       — описание (до 156 символов)
placeholder — true если контент сгенерирован из fallback
metric     — числовое значение для metrics layout ("12%", "200мс")
stepNumber — номер шага для steps layout ("01", "02", "03")
tagline    — подпись для personas layout (тема или роль)
```

## Как работает extractMetricValues

Из строки вида `"конверсия выросла на 12%"` вытаскивает:
- `value`: `"12%"`
- `label`: `"Конверсия выросла на"`

Regex: `/(\d[\d.,]*\s*(?:%|×|мс|мин|сек|ч|дн|[xк])?)/i`

Поддерживает: проценты, миллисекунды, минуты, секунды, часы, дни, множители.

## Как работает personas fallback

Если аудитория — один человек (а не перечисление):
- Карточка 1: «Где упираемся» (placeholder) с tagline = аудитория
- Карточка 2: «Что уже известно» с реальным фактом
- Карточка 3: «Какое решение нужно» с реальным desiredOutcome

Если аудитория содержит `и` / `,` / `;` и распадается на 2+ части:
- Каждая часть становится карточкой-персоной с ролью, задачей и tagline.

Разделение: `splitAudience()` — разделяет по `,;/&+` или по ` и ` (только союз, не буква в слове).

## Стили

Каждый layout имеет 3 варианта отображения по template:
- `strict` — минимальная рамка, accent-линия слева, острые углы
- `cards` — тени, закруглённые углы, без бордеров
- `briefing` — тонкая accent-рамка, мягкие углы

4 цветовые темы (`data-color`):
- `slate` — графит (#1e293b)
- `indigo` — кобальт (#4338ca)
- `teal` — изумруд (#0d9488)
- `sand` — янтарь (#b45309)

Темы задают CSS-переменные: `--canvas-accent`, `--canvas-accent-strong`, `--canvas-accent-soft`.

## Fit-pass

`fitSlide()` обрезает контент до безопасных размеров:
- Title: до 78 символов
- Subtitle: до 84 символов
- Block title: до 34 символов
- Block body: до 156 символов (96 для placeholder)
- maxBlocks: 4 для checklist, 1 для cover, 3 для остальных
