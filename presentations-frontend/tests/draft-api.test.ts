import test from "node:test";
import assert from "node:assert/strict";
import {
  buildChatMessages,
  DraftApiError,
  parseDraftModelJson,
  parseDraftModelResponse,
  validateSlides,
} from "@/lib/draft-api";
import type { DraftChatMessage, SlideTextEntry } from "@/lib/presentation-types";

const SLIDES: SlideTextEntry[] = [
  {
    id: "slide-1",
    railTitle: "Обложка",
    title: "Квартальный статус",
    subtitle: "Q1 2026",
    bullets: ["Backend platform"],
  },
  {
    id: "slide-2",
    railTitle: "Проблема",
    title: "Что тормозит",
    subtitle: "Главный узкий участок",
    bullets: ["28% — MTTR", "18 — сервисов", "1 — blocker"],
  },
  {
    id: "slide-3",
    railTitle: "Три шага",
    title: "Как идём",
    subtitle: "Без лишнего шума",
    bullets: ["01 Снять риск", "02 Дожать миграцию", "03 Зафиксировать итог"],
  },
  {
    id: "slide-4",
    railTitle: "Результат",
    title: "Что уже сдвинули",
    subtitle: "Есть измеримый прогресс",
    bullets: ["MTTR ниже", "Миграция идёт", "Команда держит темп"],
  },
  {
    id: "slide-5",
    railTitle: "Для кого",
    title: "Кому это важно",
    subtitle: "Три роли",
    bullets: [
      "Тимлид — видеть статус",
      "Директор — принять решение",
      "Команда — понять следующий шаг",
    ],
  },
  {
    id: "slide-6",
    railTitle: "След. шаг",
    title: "Что решаем дальше",
    subtitle: "Один рабочий выбор",
    bullets: ["Закрыть найм QA", "Дожать хвост миграции", "Убрать один риск"],
  },
];

function expectDraftError(
  fn: () => unknown,
  code: DraftApiError["code"],
  message?: RegExp,
) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof DraftApiError);
    assert.equal(error.code, code);
    if (message) {
      assert.match(error.message, message);
    }
    return true;
  });
}

test("parseDraftModelJson достаёт JSON из fenced ответа", () => {
  const parsed = parseDraftModelJson("```json\n{\"slides\":[]}\n```") as {
    slides: unknown[];
  };

  assert.deepEqual(parsed, { slides: [] });
});

test("parseDraftModelJson достаёт JSON с префиксом", () => {
  const parsed = parseDraftModelJson(
    "Ответ ниже:\n{\"slides\":[],\"assistantMessage\":\"ok\"}",
  ) as { assistantMessage: string };

  assert.equal(parsed.assistantMessage, "ok");
});

test("parseDraftModelResponse падает на ответе не-объекте", () => {
  expectDraftError(
    () => parseDraftModelResponse("[1,2,3]"),
    "MODEL_INVALID_RESPONSE",
  );
});

test("validateSlides собирает порядок по id, а не по позиции", () => {
  const reordered = [SLIDES[1], SLIDES[0], ...SLIDES.slice(2)];
  const validated = validateSlides(reordered);

  assert.equal(validated[0].id, "slide-1");
  assert.equal(validated[0].title, "Квартальный статус");
  assert.equal(validated[1].id, "slide-2");
  assert.equal(validated[1].title, "Что тормозит");
});

test("validateSlides собирает порядок по railTitle, если id отсутствует", () => {
  const withoutIds = SLIDES.map(({ id: _id, ...slide }) => slide);
  const validated = validateSlides(withoutIds);

  assert.equal(validated[0].id, "slide-1");
  assert.equal(validated[5].id, "slide-6");
});

test("validateSlides падает на неполном наборе слайдов", () => {
  expectDraftError(
    () => validateSlides(SLIDES.slice(0, 5)),
    "MODEL_INVALID_SLIDES",
    /не хватает slide-6/i,
  );
});

test("validateSlides падает на дубликате слота", () => {
  const duplicate = [
    ...SLIDES.slice(0, 5),
    {
      ...SLIDES[5],
      id: "slide-5" as const,
      railTitle: "Для кого",
    },
  ];

  expectDraftError(
    () => validateSlides(duplicate),
    "MODEL_INVALID_SLIDES",
    /дубликат/i,
  );
});

test("validateSlides падает на конфликте id и railTitle", () => {
  const conflict = [
    {
      ...SLIDES[0],
      railTitle: "Проблема",
    },
    ...SLIDES.slice(1),
  ];

  expectDraftError(
    () => validateSlides(conflict),
    "MODEL_INVALID_SLIDES",
    /конфликт/i,
  );
});

test("buildChatMessages сохраняет хронологию сообщений", () => {
  const history: DraftChatMessage[] = [
    { role: "assistant", text: "Черновик готов." },
    { role: "user", text: "Сделай слайд 2 резче." },
    { role: "assistant", text: "Усилил проблему." },
  ];

  const messages = buildChatMessages({
    systemPrompt: "SYSTEM",
    slides: SLIDES,
    history,
    userMessage: "Добавь риск в конце.",
  });

  assert.equal(messages.length, 6);
  assert.equal(messages[0].role, "system");
  assert.equal(messages[1].role, "user");
  assert.match(messages[1].content, /Текущие слайды:/);
  assert.equal(messages[2].role, "assistant");
  assert.equal(messages[3].role, "user");
  assert.equal(messages[4].role, "assistant");
  assert.equal(messages[5].role, "user");
  assert.equal(messages[5].content, "Добавь риск в конце.");
});

test("buildChatMessages не дублирует последнее userMessage из history", () => {
  const messages = buildChatMessages({
    systemPrompt: "SYSTEM",
    slides: SLIDES,
    history: [
      { role: "assistant", text: "Черновик готов." },
      { role: "user", text: "Сделай слайд 2 резче." },
    ],
    userMessage: "Сделай слайд 2 резче.",
  });

  assert.equal(
    messages.filter((message) => message.content === "Сделай слайд 2 резче.").length,
    1,
  );
});

test("buildChatMessages фильтрует пустые history entries", () => {
  const messages = buildChatMessages({
    systemPrompt: "SYSTEM",
    slides: SLIDES,
    history: [
      { role: "assistant", text: " " },
      { role: "user", text: "Нужен риск." },
      { role: "assistant", text: "" },
    ],
    userMessage: "Добавь блокер в конец.",
  });

  assert.equal(messages.length, 4);
  assert.equal(messages[2].content, "Нужен риск.");
});
