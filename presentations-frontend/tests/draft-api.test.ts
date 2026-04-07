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

function makeSlides(count: number): SlideTextEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `slide-${i + 1}`,
    railTitle: `Слайд ${i + 1}`,
    title: `Заголовок ${i + 1}`,
    subtitle: `Подзаголовок ${i + 1}`,
    bullets: [`Пункт ${i + 1}`],
  }));
}

const SLIDES = makeSlides(8);

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

test("validateSlides принимает массив 4-25 слайдов", () => {
  const validated = validateSlides(makeSlides(8));
  assert.equal(validated.length, 8);
  assert.equal(validated[0].id, "slide-1");
  assert.equal(validated[7].id, "slide-8");
});

test("validateSlides присваивает id по порядку если id пустой", () => {
  const noIds = makeSlides(6).map(({ id: _id, ...rest }) => rest);
  const validated = validateSlides(noIds);
  assert.equal(validated[0].id, "slide-1");
  assert.equal(validated[5].id, "slide-6");
});

test("validateSlides падает на слишком коротком массиве", () => {
  expectDraftError(
    () => validateSlides(makeSlides(3)),
    "MODEL_INVALID_SLIDES",
    /слишком мало/i,
  );
});

test("validateSlides падает на дубликате id", () => {
  const slides = makeSlides(6);
  slides[5] = { ...slides[5], id: "slide-1" };

  expectDraftError(
    () => validateSlides(slides),
    "MODEL_INVALID_SLIDES",
    /дубликат/i,
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
