# SlideForge — Product Strategy & Decision Log

> Updated: 2026-04-02 | Status: Pre-launch MVP

## Positioning

**One-liner:** AI-генератор презентаций для российского бизнеса.
**For whom:** Менеджеры, маркетологи, аналитики в малом/среднем бизнесе РФ.
**Why now:** Санкции стимулируют рост национальных SaaS. Gamma/Tome недоступны или неудобны для рус. рынка. Локальные конкуренты (Slidy.ai, Сократик, Presentacium) — есть, но ни один не стал "стандартом".

## Strategic Review (2026-04-02)

**What is actually strong now:** the product is already beyond "toy demo" level. It has a real generation pipeline, editable slides, templates, images, and PPTX export. That is enough to impress in a live demo.

**What is underperforming right now:** the product promise is ahead of the actual feeling in the UI. Code-wise, outline events exist but are not surfaced, and live slide streaming is not yet visible to the user. So the experience still feels like "submit -> wait -> receive", not like an AI co-author.

**Main priority reading:** right now the bottleneck is quality, not monetization. The product needs to feel more alive during generation and more polished in the final output before it is worth optimizing packaging.

**Strategic implication:** before spending energy on pricing, billing, or sales packaging, fix the visible generation loop, outline approval, typography differentiation, and export fidelity. Otherwise the product is technically capable but emotionally flatter than it should be.

## Quality Priorities (next 2 sprints)

1. **Outline-first control.** Пользователь должен увидеть план, поправить его и только потом запускать сборку слайдов.
2. **Live generation feel.** Генерация должна выглядеть как живой процесс, а не как ожидание чёрного ящика.
3. **Output fidelity.** Шаблоны должны реально отличаться, а export не должен ухудшать впечатление от preview.
4. **Input neutrality.** Продукт должен перестать выглядеть как "генератор только для банков" в дефолтном входе и базовом template-flow.

## Competitive Landscape (April 2026)

| Конкурент | Цена | Сильная сторона | Слабость |
|-----------|------|----------------|----------|
| Gamma | $10-20/мес | 70M юзеров, карточный формат, картинки | Плохой PPTX экспорт, нет RU фокуса |
| Slidy.ai | ? | Российские серверы, локализация | Менее известен |
| Сократик | 189₽/преза, 469₽/мес | Простота, русский | Базовый функционал |
| Presentacium | ? | Учёба + бизнес | Нет "вау"-эффекта |
| KIMI (Moonshot AI) | Free–$199/мес | Agentic slides, AI-инфографика, outline-first flow, 200K контекст | Нет кастомных шаблонов, интерфейс EN/CN only, китайский сервер |
| **SlideForge** | **нет (пока)** | **Совкомбанк-кейс, хороший визуал слайдов, RU-first** | **Нет outline editor, нет landing, нет billing** |

## Revenue Model Hypothesis

### Phase 1: B2B White-Label (month 1-3)
- Продать Совкомбанку (или подобному банку) кастомный инструмент
- Цена: 50-200K₽/мес за бренд-шаблон + unlimited генерации
- Нужно: auth + persistence + кастомный шаблон upload
- Revenue target: 1 контракт = 100K₽/мес = 1.2M₽/год

### Phase 2: Freemium SaaS (month 2-6)
- Free: 3 презы/мес, с водяным знаком, текст-only экспорт
- Starter 490₽/мес: без лимитов, без знака, картинки в экспорте
- Business 1490₽/мес: + document upload, + приоритетная генерация, + share links
- Revenue target: 500 платящих юзеров через 6 мес = 245K₽/мес

### Phase 3: Template Marketplace (month 6+)
- Продажа premium-шаблонов (199-499₽ разово)
- UGC: дизайнеры загружают свои шаблоны, получают 70%
- Revenue target: пассивный доход, масштабируется с ростом базы

## Key Risks

1. **Execution speed.** Рынок быстро насыщается. Каждый месяц без landing = упущенные юзеры.
2. **AI costs.** GPT-4o-mini дешёвый, но при масштабе 10K генераций/день = $200-500/день. Нужен контроль.
3. **Image quality.** Pexels — бесплатный, но quality непредсказуем. Нужен fallback.
4. **PPTX fidelity.** PptxGenJS ограничен. Если PPTX не совпадает с превью — юзеры злятся.
5. **Copycats.** Код простой, повторяемый. Moat нужно строить через данные, workflow, templates, brand.

## Moat Strategy (how we become hard to copy)

1. **Template library** — 30+ шаблонов, индустрия-specific. Конкуренту нужно время.
2. **Russian business workflows** — загрузка из Word/PDF отчётов, формат "для совета директоров".
3. **B2B lock-in** — корпоративные шаблоны с логотипами, цвета компании, SSO.
4. **Data flywheel** — анализ: какие промпты дают лучшие презентации → улучшение промптов.
5. **Distribution** — SEO по "генератор презентаций AI", партнёрства с бизнес-сервисами.

## Decisions Made

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-01 | Картинки (EPIC-04) = приоритет #1 | Без них продукт не конкурирует. imageQuery уже генерируется. |
| 2026-04-01 | PPTX fix = приоритет #2 | Broken export = broken trust. |
| 2026-04-01 | Дефолтный шаблон → Минимализм | Sovcombank путает не-корпоративных юзеров. |
| 2026-04-01 | EPIC-03 (Editor) = Done | Замена изображений перенесена в EPIC-04. |
| 2026-04-01 | Kanban пересобран по бизнес-приоритету | Было: Editor → Photos → PDF. Стало: Images → PPTX Fix → Landing → Auth → Billing. |
| 2026-04-02 | UX-бенчмарк = KIMI Agentic Slides | Целевое ощущение: "умный соавтор + дизайнер". См. `docs/KIMI-UX-PLAYBOOK.md` |
| 2026-04-02 | Outline Editor (EPIC-06) → приоритет поднят | Самый большой UX-разрыв с KIMI. onOutline callback уже есть, нужен UI. |
| 2026-04-02 | "Театр прогресса" — новое направление | Видимые шаги мышления AI во время генерации. Чисто фронтенд, высокий ROI. |
| 2026-04-02 | Fix visible streaming gap before any monetization work | Сейчас SSE есть на уровне кода, но UI не превращает это в "живую" генерацию. Это бьёт по wow-effect и perceived quality. |
| 2026-04-02 | Quality-first phase confirmed | До pricing/billing продукт должен пройти через цикл: real outline flow → real live preview → stronger output fidelity. |
| 2026-04-02 | Output fidelity matters as much as generation speed | Разные шаблоны и экспорт должны действительно ощущаться разными и качественными, иначе "AI wow" быстро схлопывается. |
| 2026-04-02 | Added explicit Output Fidelity workstream | Следующий quality ceiling — не только UX потока, но и соответствие preview/export, шрифтов и шаблонной дифференциации. |
| 2026-04-02 | Neutral default experience is mandatory | Дефолтный шаблон, placeholder и стартовый flow должны быть универсальными, иначе продукт сужает себя ещё до первой генерации. |

## Open Questions

- [ ] Домен: slideforge.ru? slideforge.app? другой?
- [ ] Хостинг: Vercel (проще) или свой сервер (дешевле при масштабе)?
- [ ] OpenAI vs YandexGPT: стоит ли тестировать YandexGPT для RU-контента?
- [ ] Pexels vs Unsplash: кто даёт лучшие бизнес-фото для рус. контекста?
- [ ] Нужен ли "режим презентации" (slideshow) или достаточно PPTX/PDF?
- [ ] Насколько сильно live preview и outline approval поднимают completion rate первой генерации?
