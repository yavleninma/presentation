# SlideForge — Design Standards & Aesthetics Reference

> **Зачем этот файл:** Эталон вкуса для инженера. Читать ПЕРЕД любой задачей, касающейся шаблонов, UI приложения или промптов генерации. Предотвращает "AI slop" — предсказуемые, одинаковые решения, которые выглядят сгенерированными.

---

## Правило #1: Никакого AI Slop

**Что такое AI slop в UI:**
- Inter/Roboto/Arial на всех heading и body — нет иерархии
- Фиолетовые / сине-фиолетово-розовые градиенты на тёмном фоне (`#6366F1` + `#8B5CF6` + `#EC4899`)
- Предсказуемые card layouts с border-radius: 8px и box-shadow
- Одинаковые цвета кнопок — синие #3B82F6 на белом
- Отсутствие атмосферы: чистый белый фон без характера

**Как избежать:**
- Каждый шаблон = отдельная эстетическая концепция, не вариация одного
- Heading-шрифт отличается от body-шрифта всегда
- Каждый шаблон имеет 1-2 signature color с конкретным настроением
- Фон несёт атмосферу: паттерн, текстура, или нетривиальный цвет

---

## Инструменты для лучшего дизайна в Claude Code

### Установка (один раз на проект)

**1. Skill `frontend-design` (официальный Anthropic):**
```bash
# В Claude Code (web или CLI):
/install-github-app anthropics/claude-code frontend-design
```
Решает: AI slop. Содержит 8 эстетических режимов (Brutally minimal, Maximalist, Retro-futuristic, Art deco...). При работе над UI вызывать: `/frontend-design`

**2. shadcn/ui MCP (предотвращает галлюцинации пропсов):**
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

**3. Skill chain для UI задач:**
```
/frontend-design → /baseline-ui → /fixing-accessibility
```

**4. Figma MCP (POST-MVP, когда будет дизайн-система):**
- Официальный, февраль 2026. Bidirectional.
- Code→Canvas эксклюзив Claude Code (не Cursor/Windsurf).
- Требует: Figma Desktop + Dev seat. Подключать когда будет дизайн-система.

### `<frontend_aesthetics>` сниппет для промптов

Вставлять в system prompt при работе над app UI (НЕ слайды — они используют template):
```xml
<frontend_aesthetics>
You tend to converge toward generic "on distribution" outputs. Make creative, 
distinctive frontends that surprise and delight.
Typography: Choose beautiful, unique fonts. Avoid Arial, Inter as default. 
  Each heading font must differ from body font. Use CSS variables.
Color: Commit to cohesive aesthetics with dominant colors and sharp accents. 
  Avoid: purple gradients, indigo+violet+pink combos, generic blue buttons.
  Draw from IDE themes, cultural aesthetics, editorial design.
Motion: Use animations for micro-interactions. Staggered reveals on page load.
Backgrounds: Create atmosphere with CSS gradients, geometric patterns, or 
  contextual effects — not just plain white.
Avoid: Overused fonts, purple gradients, predictable layouts, generic AI aesthetics.
No two templates should look alike.
</frontend_aesthetics>
```

---

## Шаблоны SlideForge: эстетические концепции

Каждый шаблон = отдельный характер. Не вариация синего.

### Минимализм (существующий, требует обновления)
**Концепция:** Editorial Swiss Design. Спокойный, профессиональный, universal.
**Аудитория:** Любой бизнес без корпоративных ограничений.
**Шрифты:**
- Heading: `'Bricolage Grotesque'` — editorial, distinctive, modern grotesque
- Body: `'Inter'` — нейтральный, readable
```
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
```
**Цвета:** Остаются `#18181B` / `#FFFFFF` / `#3B82F6` — чистота не трогать.
**Паттерн фона:** none — работает.

### Modern Dark (существующий, ТРЕБУЕТ переделки)
**Проблема:** `#6366F1 + #8B5CF6 + #EC4899` = типичный AI slop. Нужно выбросить.
**Новая концепция:** Tech Editorial Dark. Teal + Amber на угольном фоне.
**Аудитория:** Стартапы, tech-компании, IT-команды.
**Шрифты:**
- Heading: `'Space Grotesk'` — технологичный, угловатый, запоминающийся
- Body: `'Inter'` — нейтральный
```
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
```
**Новые цвета:**
```ts
primary: "#0EA5E9",        // sky blue — технологичный, не "фиолетовый AI"
secondary: "#10B981",      // emerald — рост, данные
accent: "#F59E0B",         // amber — энергия, контраст
background: "#09090B",     // почти чёрный — глубже чем #0F172A
foreground: "#F8FAFC",
muted: "#18181B",
mutedForeground: "#71717A",
surface: "#141414",
surfaceForeground: "#E2E8F0",
```
**Паттерн:** `dots` — оставить.

### Совкомбанк (существующий, шрифт улучшить)
**Концепция:** Corporate Authority. Красный + Navy — строго, доверие.
**Шрифты:** (обновить)
- Heading: `'IBM Plex Sans'` — корпоративный, но с характером, не Inter
- Body: `'Inter'`
```
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Inter:wght@400;500&display=swap');
```
**Цвета:** Не трогать — бренд клиента.

### Стартап / Pitch Deck (НОВЫЙ — EPIC-14)
**Концепция:** High Energy. Для питч-деков, инвесторов. Смелый, данные, рост.
**Шрифты:**
- Heading: `'Syne'` — avant-garde, bold, запоминается на первом слайде
- Body: `'DM Sans'` — modern, clean, readable в маленьком кегле
```
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
```
**Цвета:**
```ts
primary: "#FFFFFF",
primaryForeground: "#09090B",
secondary: "#22C55E",       // growth green — рост, деньги
secondaryForeground: "#09090B",
accent: "#F97316",          // orange — энергия, действие
accentForeground: "#FFFFFF",
background: "#09090B",
foreground: "#FAFAFA",
muted: "#141414",
mutedForeground: "#A1A1AA",
surface: "#1A1A1A",
surfaceForeground: "#E4E4E7",
```
**Паттерн:** `geometric` — строгая сетка на тёмном.

### Консалтинг / McKinsey (НОВЫЙ — EPIC-14)
**Концепция:** Authoritative Intelligence. Data-heavy, строгий, доверие C-level.
**Шрифты:**
- Heading: `'Playfair Display'` — авторитет, legacy, editorial authority
- Body: `'Source Sans 3'` — neutral, dense, readable
```
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@400;600&display=swap');
```
**Цвета:**
```ts
primary: "#1E3A5F",         // deep navy — власть, серьёзность
primaryForeground: "#FFFFFF",
secondary: "#2563EB",       // royal blue — данные, действие
secondaryForeground: "#FFFFFF",
accent: "#DC2626",          // red — акценты как в McKinsey-слайдах
accentForeground: "#FFFFFF",
background: "#FFFFFF",
foreground: "#111827",
muted: "#F3F4F6",
mutedForeground: "#6B7280",
surface: "#F9FAFB",
surfaceForeground: "#1F2937",
```
**Паттерн:** `grid` — таблицы, структура, данные.

### IT / Технологии (НОВЫЙ — EPIC-14)
**Концепция:** Terminal Aesthetic. Тёмный, моноширинные акценты, код-культура.
**Шрифты:**
- Heading: `'Space Mono'` — terminal/code feel, instantly recognizable в заголовках
- Body: `'Inter'`
```
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap');
```
**Цвета:**
```ts
primary: "#00FF88",         // terminal green — культурный маркер
primaryForeground: "#0A0A0F",
secondary: "#00D4FF",       // cyan — tech, data
secondaryForeground: "#0A0A0F",
accent: "#FF6B35",          // hot orange — alerts, highlights
accentForeground: "#FFFFFF",
background: "#0A0A0F",      // deep black — terminal
foreground: "#E2FFE8",      // slightly green-tinted white
muted: "#111118",
mutedForeground: "#7A8A7D",
surface: "#111118",
surfaceForeground: "#B8FFC7",
```
**Паттерн:** `dots` — точки как terminal cursor background.

---

## Правила разнообразия лейаутов (для prompts.ts)

Обязательный constraint в каждом промпте генерации:
```
LAYOUT DIVERSITY RULE: Use at least 5 different layout types in the presentation.
Do NOT repeat the same layout type more than 2 times in a row.
Do NOT use 'content' layout for more than 40% of slides.
Prefer: mix of content, kpi, image-text, two-columns, quote, timeline layouts.
```

---

## App UI Aesthetic (page.tsx, не слайды)

Целевое ощущение интерфейса: **"Профессиональный tool, не лендинг"**.
- Sidebar миниатюр: тёмный (#0F0F0F), без border-радиуса карточек
- Header: минимальный, без градиентов, правый блок с кнопками экспорта
- Prompt textarea: крупная, с хорошей типографикой, placeholder с характером
- Цветовая схема app UI: нейтральная (zinc/slate scale), акцент только на CTA

**Запрещено в app UI:**
- Синяя кнопка "Создать" на белом фоне
- Gradient hero sections
- Card shadows everywhere
- Purple/violet в любом виде

---

## Чеклист перед сдачей любого UI-компонента

- [ ] Heading-шрифт отличается от body-шрифта?
- [ ] Нет фиолетового, indigo, violet в основных цветах?
- [ ] Фон имеет характер (не просто `#FFFFFF` или `#0F172A`)?
- [ ] Анимации есть хотя бы на hover и появлении?
- [ ] Этот компонент выглядит иначе чем "стандартный shadcn"?
