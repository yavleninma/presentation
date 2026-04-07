import type { ColorThemeId, TemplateId } from "@/lib/presentation-types";

export const PRODUCT_DEMO_PROMPT =
  "Нужно показать сервис Внятно: что это за сервис, как мы его создаём и как развиваем дальше. Аудитория: команды и руководители, которым нужно быстро собирать рабочие презентации из сырой мысли. Важно показать главный сценарий, пользу и следующий шаг в развитии.";

export const EXAMPLE_PROMPTS = [PRODUCT_DEMO_PROMPT] as const;

export const SCENARIO_CHIPS: ReadonlyArray<{
  id: "product";
  label: string;
  prompt: string;
  description?: string;
}> = [
  {
    id: "product",
    label: "Показ продукта",
    prompt: PRODUCT_DEMO_PROMPT,
  },
];

export const START_SCREEN_ENABLED_SCENARIO_ID: (typeof SCENARIO_CHIPS)[number]["id"] =
  "product";

export const TEMPLATE_OPTIONS: Array<{ id: TemplateId; label: string }> = [
  { id: "strict", label: "Строгий" },
  { id: "cards", label: "Карточки" },
  { id: "briefing", label: "Брифинг" },
  { id: "modern", label: "Модерн" },
  { id: "corporate", label: "Корпоративный" },
];

export const COLOR_OPTIONS: Array<{ id: ColorThemeId; label: string }> = [
  { id: "slate", label: "Графит" },
  { id: "indigo", label: "Кобальт" },
  { id: "teal", label: "Изумруд" },
  { id: "sand", label: "Янтарь" },
  { id: "rose", label: "Роза" },
  { id: "emerald", label: "Малахит" },
  { id: "violet", label: "Фиалка" },
  { id: "zinc", label: "Цинк" },
];
