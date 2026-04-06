import type { ColorThemeId, TemplateId } from "@/lib/presentation-types";

export const EXAMPLE_PROMPTS = [
  "Нужно собрать квартальный статус для руководителя: что уже сдвинули, где риск и какой следующий шаг важен сейчас.",
  "Показываем итоги пилота поиска для продуктового руководителя: что уже работает, что пока не доказано и что нужно решить по следующему этапу.",
  "Нужен запрос на ресурс по platform team: что успели сделать, где упёрлись и зачем нужен следующий слот на найм.",
  "Нужно показать клиентам наш сервис Внятно - помогает собрать рабочую презентацию из описания задачи за 90 секунд. Аудитория: команды и руководители, которые часто готовят презентации.",
] as const;

export const SCENARIO_CHIPS = [
  { id: "quarter", label: "Квартальный статус", prompt: EXAMPLE_PROMPTS[0] },
  { id: "pilot", label: "Итоги пилота", prompt: EXAMPLE_PROMPTS[1] },
  { id: "resource", label: "Запрос на ресурс", prompt: EXAMPLE_PROMPTS[2] },
  { id: "pokaz", label: "Показ продукта", prompt: EXAMPLE_PROMPTS[3] },
] as const;

export const START_SCREEN_ENABLED_SCENARIO_ID: (typeof SCENARIO_CHIPS)[number]["id"] =
  "pokaz";

export const TEMPLATE_OPTIONS: Array<{ id: TemplateId; label: string }> = [
  { id: "strict", label: "Строгий" },
  { id: "cards", label: "Карточки" },
  { id: "briefing", label: "Брифинг" },
];

export const COLOR_OPTIONS: Array<{ id: ColorThemeId; label: string }> = [
  { id: "slate", label: "Графит" },
  { id: "indigo", label: "Кобальт" },
  { id: "teal", label: "Изумруд" },
  { id: "sand", label: "Янтарь" },
];
