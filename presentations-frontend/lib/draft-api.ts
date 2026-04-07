import type {
  DraftChatMessage,
  SlideId,
  SlideTextEntry,
} from "@/lib/presentation-types";

export const DRAFT_API_MODEL = "gpt-5.4-mini";

export type DraftApiErrorCode =
  | "INVALID_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMIT_EXCEEDED"
  | "GENERATE_TIMEOUT"
  | "REVISE_TIMEOUT"
  | "CHAT_TIMEOUT"
  | "OPENAI_HTTP_ERROR"
  | "OPENAI_EMPTY_RESPONSE"
  | "MODEL_INVALID_JSON"
  | "MODEL_INVALID_RESPONSE"
  | "MODEL_INVALID_SLIDES"
  | "INTERNAL_ERROR";

export type DraftOpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class DraftApiError extends Error {
  constructor(
    readonly code: DraftApiErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DraftApiError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeBullets(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractJsonCandidate(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new DraftApiError(
      "OPENAI_EMPTY_RESPONSE",
      "Модель не вернула содержимое для черновика.",
      502,
    );
  }

  const withoutFences = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const firstObject = withoutFences.indexOf("{");
  const firstArray = withoutFences.indexOf("[");
  const firstIndex =
    firstObject === -1
      ? firstArray
      : firstArray === -1
        ? firstObject
        : Math.min(firstObject, firstArray);

  if (firstIndex === -1) {
    throw new DraftApiError(
      "MODEL_INVALID_JSON",
      "Модель вернула ответ без JSON-объекта.",
      502,
    );
  }

  const openingChar = withoutFences[firstIndex];
  const closingChar = openingChar === "[" ? "]" : "}";
  const lastIndex = withoutFences.lastIndexOf(closingChar);
  if (lastIndex === -1 || lastIndex < firstIndex) {
    throw new DraftApiError(
      "MODEL_INVALID_JSON",
      "Модель вернула JSON, который не удалось выделить из ответа.",
      502,
    );
  }

  return withoutFences.slice(firstIndex, lastIndex + 1);
}

export function parseDraftModelJson(text: string): unknown {
  const candidate = extractJsonCandidate(text);

  try {
    return JSON.parse(candidate);
  } catch {
    throw new DraftApiError(
      "MODEL_INVALID_JSON",
      "Модель вернула JSON, который не удалось разобрать.",
      502,
    );
  }
}

export function validateSlides(raw: unknown): SlideTextEntry[] {
  if (!Array.isArray(raw)) {
    throw new DraftApiError(
      "MODEL_INVALID_SLIDES",
      "Модель вернула slides не в виде массива.",
      502,
    );
  }

  if (raw.length < 4) {
    throw new DraftApiError(
      "MODEL_INVALID_SLIDES",
      `Модель вернула слишком мало слайдов: ${raw.length}. Нужно минимум 4.`,
      502,
    );
  }

  if (raw.length > 25) {
    throw new DraftApiError(
      "MODEL_INVALID_SLIDES",
      `Модель вернула слишком много слайдов: ${raw.length}. Максимум 25.`,
      502,
    );
  }

  const seen = new Set<string>();
  const result: SlideTextEntry[] = [];

  for (let i = 0; i < raw.length; i++) {
    const rawItem = raw[i];
    if (!isObject(rawItem)) {
      throw new DraftApiError(
        "MODEL_INVALID_SLIDES",
        "В slides найден элемент неверного формата.",
        502,
      );
    }

    const rawId = typeof rawItem.id === "string" ? rawItem.id.trim() : "";
    const slideId: SlideId = rawId || `slide-${i + 1}`;

    if (seen.has(slideId)) {
      throw new DraftApiError(
        "MODEL_INVALID_SLIDES",
        `Модель вернула дубликат для ${slideId}.`,
        502,
      );
    }
    seen.add(slideId);

    const rawRailTitle = typeof rawItem.railTitle === "string" ? rawItem.railTitle.trim() : "";
    const rawLayoutType = typeof rawItem.layoutType === "string" ? rawItem.layoutType.trim() : "";

    const title = typeof rawItem.title === "string" ? rawItem.title.trim() : "";
    if (!title && !rawRailTitle) {
      throw new DraftApiError(
        "MODEL_INVALID_SLIDES",
        `Слайд ${slideId} не имеет ни title, ни railTitle.`,
        502,
      );
    }

    const rawImageQuery = typeof rawItem.imageQuery === "string" ? rawItem.imageQuery.trim() : "";

    result.push({
      id: slideId,
      railTitle: rawRailTitle || `Слайд ${i + 1}`,
      layoutType: rawLayoutType || undefined,
      title,
      subtitle: typeof rawItem.subtitle === "string" ? rawItem.subtitle.trim() : "",
      bullets: normalizeBullets(rawItem.bullets),
      ...(rawImageQuery ? { imageQuery: rawImageQuery } : {}),
    });
  }

  return result;
}

export function parseDraftModelResponse(
  text: string,
  fallbackAssistantMessage = "Черновик готов.",
) {
  const parsed = parseDraftModelJson(text);

  if (!isObject(parsed)) {
    throw new DraftApiError(
      "MODEL_INVALID_RESPONSE",
      "Модель вернула ответ не в формате объекта.",
      502,
    );
  }

  const slides = validateSlides(parsed.slides);
  const assistantMessage =
    typeof parsed.assistantMessage === "string" && parsed.assistantMessage.trim()
      ? parsed.assistantMessage.trim()
      : fallbackAssistantMessage;

  return { slides, assistantMessage };
}

export function buildSlidesContext(slides: SlideTextEntry[]) {
  return JSON.stringify(slides, null, 2);
}

export function buildChatMessages({
  systemPrompt,
  slides,
  history,
  userMessage,
}: {
  systemPrompt: string;
  slides: SlideTextEntry[];
  history: DraftChatMessage[];
  userMessage: string;
}): DraftOpenAIMessage[] {
  const cleanUserMessage = userMessage.trim();
  if (!cleanUserMessage) {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "Нужно сообщение для правки черновика.",
      400,
    );
  }

  const normalizedHistory = history
    .map((message) => ({
      role: message.role,
      text: message.text.trim(),
    }))
    .filter((message) => message.text.length > 0);

  const dedupedHistory =
    normalizedHistory.at(-1)?.role === "user" &&
    normalizedHistory.at(-1)?.text === cleanUserMessage
      ? normalizedHistory.slice(0, -1)
      : normalizedHistory;

  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Текущие слайды:\n${buildSlidesContext(slides)}`,
    },
    ...dedupedHistory.slice(-6).map(
      (message): DraftOpenAIMessage => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.text,
      }),
    ),
    { role: "user", content: cleanUserMessage },
  ];
}

export function readDraftApiErrorMessage(payload: unknown) {
  if (!isObject(payload)) {
    return null;
  }

  return typeof payload.error === "string" && payload.error.trim()
    ? payload.error.trim()
    : null;
}
