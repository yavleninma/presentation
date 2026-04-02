import { SlideLayoutType } from "@/types/presentation";

export const SYSTEM_PROMPT = `Ты — профессиональный дизайнер корпоративных презентаций. Твоя задача — создавать структурированные, убедительные презентации для руководителей российских компаний.

Правила:
- Каждый слайд должен содержать только ключевые мысли (не стены текста)
- Буллет-поинты: максимум 4-5 на слайд, каждый — одна идея в 1-2 строки
- Язык: деловой русский, без канцелярита
- Числа и факты — вместо общих фраз
- Заголовки: ёмкие, до 6 слов`;

export function buildOutlinePrompt(
  topic: string,
  slideCount: number,
  language: string
): string {
  const layouts: SlideLayoutType[] = [
    "title",
    "section",
    "content",
    "two-columns",
    "image-text",
    "kpi",
    "timeline",
    "quote",
    "full-image",
    "thank-you",
  ];

  return `Создай структуру презентации на тему: "${topic}"

Количество слайдов: ${slideCount}
Язык: ${language === "ru" ? "русский" : "английский"}

Доступные типы слайдов (layout):
${layouts.map((l) => `- "${l}"`).join("\n")}

Требования:
${
  slideCount === 1
    ? `- Ровно один слайд: только layout "title" (заголовок презентации + подзаголовок/тезисы в keyPoints, без отдельного thank-you)`
    : slideCount === 2
      ? `- Ровно два слайда: первый "title", второй "thank-you"`
      : `- Первый слайд ВСЕГДА "title"
- Последний слайд ВСЕГДА "thank-you"
- Используй разнообразные типы: section для разделов, content для текста, kpi для цифр, image-text для визуальных, timeline для хронологии, quote для цитат, two-columns для сравнений`
}
- LAYOUT DIVERSITY RULE: используй минимум 5 разных типов лейаутов
- Не повторяй один тип лейаута 2 раза подряд
- Тип "content" — не более 40% слайдов (максимум ${Math.floor(slideCount * 0.4)} из ${slideCount})
- Предпочитай: mix из content, kpi, image-text, two-columns, quote, timeline

Ответь СТРОГО в формате JSON (без markdown, без \`\`\`):
{
  "title": "Заголовок презентации",
  "slides": [
    {
      "title": "Заголовок слайда",
      "layout": "title",
      "keyPoints": ["ключевая мысль 1", "ключевая мысль 2"],
      "speakerNotes": "Заметки для выступающего"
    }
  ]
}`;
}

export function buildSlideContentPrompt(
  slideTitle: string,
  layout: SlideLayoutType,
  keyPoints: string[] | undefined,
  presentationTitle: string,
  slideIndex: number,
  totalSlides: number
): string {
  const layoutInstructions: Record<string, string> = {
    title: `Это титульный слайд. Заполни:
- heading: мощный заголовок презентации (до 8 слов)
- subheading: подзаголовок/описание (до 15 слов)`,

    section: `Это разделитель секции. Заполни:
- heading: название раздела (до 5 слов)
- subheading: краткое описание раздела (до 12 слов)`,

    content: `Это слайд с контентом. Заполни:
- heading: заголовок (до 6 слов)
- bullets: массив из 3-5 ключевых пунктов (каждый до 15 слов)
- body: опционально — вступительное предложение`,

    "two-columns": `Это слайд с двумя колонками. Заполни:
- heading: заголовок сравнения (до 6 слов)
- leftColumn: { heading: "Название левой", bullets: ["пункт 1", "пункт 2", "пункт 3"] }
- rightColumn: { heading: "Название правой", bullets: ["пункт 1", "пункт 2", "пункт 3"] }`,

    "image-text": `Это слайд с изображением и текстом. Заполни:
- heading: заголовок (до 6 слов)
- bullets: 2-4 ключевых пункта
- imageQuery: описание нужного изображения на АНГЛИЙСКОМ для стокового поиска (например "business team meeting office")`,

    kpi: `Это слайд с ключевыми показателями. Заполни:
- heading: заголовок (до 6 слов)
- kpiValues: массив из 3-4 объектов { value: "число/метрика", label: "подпись", trend: "up"|"down"|"neutral" }
Используй реалистичные бизнес-метрики.`,

    timeline: `Это слайд с хронологией. Заполни:
- heading: заголовок (до 6 слов)
- timelineItems: массив из 3-5 объектов { year: "2024", title: "Событие", description: "Краткое описание" }`,

    quote: `Это слайд с цитатой. Заполни:
- quoteText: вдохновляющая или релевантная цитата (1-2 предложения)
- quoteAuthor: автор цитаты
- quoteRole: должность/роль автора`,

    "full-image": `Это визуальный слайд с изображением на весь фон. Заполни:
- heading: мощный заголовок (до 6 слов)
- subheading: пояснение (до 12 слов)
- imageQuery: описание фонового изображения на АНГЛИЙСКОМ (например "modern city skyline sunset")`,

    "thank-you": `Это финальный слайд. Заполни:
- heading: "Спасибо!" или подходящий финальный заголовок
- contactEmail: email (придумай реалистичный)
- contactPhone: телефон
- contactWebsite: сайт`,
  };

  return `Презентация: "${presentationTitle}"
Слайд ${slideIndex + 1} из ${totalSlides}: "${slideTitle}"
Тип слайда: ${layout}

${keyPoints?.length ? `Ключевые мысли: ${keyPoints.join("; ")}` : ""}

${layoutInstructions[layout] || layoutInstructions.content}

Ответь СТРОГО в формате JSON (без markdown, без \`\`\`). Верни ТОЛЬКО поля, указанные выше.`;
}
