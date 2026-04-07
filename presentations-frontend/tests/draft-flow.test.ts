import test from "node:test";
import assert from "node:assert/strict";
import {
  filterMessagesForModel,
  generateDraftSession,
  reviseDraftSession,
} from "@/lib/draft-adapter";
import { DraftApiError } from "@/lib/draft-api";
import { buildDraftFromSlideTexts } from "@/lib/draft-from-slide-texts";
import {
  buildClarifyMissingFacts,
  buildQuickRepliesFromMissingFacts,
  createClarifySession,
  getDraftReadiness,
  normalizeDraftSession,
  syncSessionWithSlideTexts,
} from "@/lib/draft-session";
import type { SlideTextEntry } from "@/lib/presentation-types";

const STRONG_PROMPT =
  "Нужно показать сервис Внятно: как он собирает рабочую презентацию из сырой мысли. Для руководителей и продуктовых команд. Уже видно, что человек получает первый черновик за 90 секунд и быстрее понимает главное и следующий шаг.";

const WEAK_PROMPT = "Нужно показать обновление по сервису.";

function makeSlides(count: number): SlideTextEntry[] {
  const templates: Array<Omit<SlideTextEntry, "id">> = [
    { railTitle: "Обложка", layoutType: "cover", title: "Внятно как рабочий сервис", subtitle: "Что это и кому помогает", bullets: ["Сервис для рабочих презентаций", "Из сырой мысли в понятный черновик"] },
    { railTitle: "Проблема", layoutType: "metrics", title: "Почему презентации буксуют", subtitle: "Слишком много шума до первого результата", bullets: ["1 — сырая мысль без структуры", "2 — лишние решения до пользы", "3 — неясно, что главное"] },
    { railTitle: "Три шага", layoutType: "steps", title: "Как работает поток", subtitle: "От запроса к рабочему черновику", bullets: ["01 Уточняем главное", "02 Собираем черновик", "03 Доводим в редакторе"] },
    { railTitle: "Результат", layoutType: "checklist", title: "Что уже даёт сервис", subtitle: "Путь становится понятнее", bullets: ["Человек быстрее видит структуру", "Главный акцент появляется раньше", "Следующий шаг звучит явно"] },
    { railTitle: "Для кого", layoutType: "personas", title: "Кому это нужно", subtitle: "Три типовых роли", bullets: ["Сотрудник — быстро собрать основу", "Тимлид — показать прогресс без шума", "Руководитель — принять решение по следующему шагу"] },
    { railTitle: "След. шаг", layoutType: "features", title: "Что развиваем дальше", subtitle: "Один рабочий вектор", bullets: ["Согласовать пилот с одной командой", "Усилить верификацию контракта", "Дожать сценарии до editor"] },
    { railTitle: "Детали", layoutType: "checklist", title: "Что ещё важно", subtitle: "", bullets: ["Архитектура масштабируется", "API стабилен"] },
    { railTitle: "Итог", layoutType: "features", title: "Подведём итог", subtitle: "", bullets: ["Один путь", "Один результат", "Один шаг дальше"] },
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `slide-${i + 1}`,
    ...templates[i % templates.length],
  }));
}

const SLIDES = makeSlides(8);

function withMockedFetch<T>(
  mock: typeof fetch,
  run: () => Promise<T>,
) {
  const originalFetch = globalThis.fetch;
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = mock;

  return run().finally(() => {
    globalThis.fetch = originalFetch;
    process.env.OPENAI_API_KEY = previousKey;
  });
}

test("getDraftReadiness отличает сильный запрос от сырого", () => {
  assert.equal(getDraftReadiness(STRONG_PROMPT), true);
  assert.equal(getDraftReadiness(WEAK_PROMPT), false);
});

test("buildClarifyMissingFacts честно называет пробелы", () => {
  const missingFacts = buildClarifyMissingFacts(WEAK_PROMPT);

  assert.equal(missingFacts.length >= 2, true);
  assert.match(missingFacts.join(" "), /кому|факт|следующ/i);
});

test("buildQuickRepliesFromMissingFacts даёт нейтральные быстрые ответы", () => {
  const quickReplies = buildQuickRepliesFromMissingFacts(
    WEAK_PROMPT,
    [
      "Кому вы это показываете.",
      "Какой факт или цифру важно вынести в начало.",
    ],
    false,
  );

  assert.equal(quickReplies.length >= 2, true);
  assert.match(quickReplies.join(" "), /Аудитория|факт|сигнал/i);
  assert.doesNotMatch(quickReplies.join(" "), /сервис Внятно|сырой мысли/i);
});

test("normalizeDraftSession сохраняет kind у сообщений", () => {
  const session = createClarifySession(STRONG_PROMPT);
  const restored = normalizeDraftSession({
    ...session,
    messages: [
      ...session.messages,
      {
        role: "assistant",
        text: "Временная ошибка старта.",
        kind: "error",
      },
    ],
  });

  assert.equal(restored.messages.at(-1)?.kind, "error");
});

test("filterMessagesForModel убирает технические ошибки из истории", () => {
  const filtered = filterMessagesForModel([
    { role: "user", text: "Покажи статус." },
    { role: "assistant", text: "Временная ошибка старта.", kind: "error" },
    { role: "assistant", text: "Не удалось собрать черновик (HTTP 500)." },
    { role: "assistant", text: "Черновик готов." },
  ]);

  assert.deepEqual(
    filtered.map((message) => message.text),
    ["Покажи статус.", "Черновик готов."],
  );
});

test("syncSessionWithSlideTexts пересобирает semantic snapshot из слайдов", () => {
  const session = createClarifySession(STRONG_PROMPT);
  const slideTexts = SLIDES.map((slide) => ({
    ...slide,
    bullets: [...slide.bullets],
  }));

  const synced = syncSessionWithSlideTexts(
    {
      ...session,
      slideTexts,
    },
    slideTexts,
  );

  assert.match(synced.workingDraft.audience, /Сотрудник/);
  assert.equal(synced.readyToGenerate, true);
  assert.deepEqual(synced.missingFacts, []);
  assert.match(synced.summary, /Тема: Внятно как рабочий сервис/);
});

test("buildDraftFromSlideTexts не теряет workingDraft и переносит текущие тексты в editor", () => {
  const session = createClarifySession(STRONG_PROMPT);
  const slideTexts = SLIDES.map((slide) => ({
    ...slide,
    bullets: [...slide.bullets],
  }));
  const draft = buildDraftFromSlideTexts(slideTexts, session.workingDraft);

  assert.equal(draft.workingDraft.audience, session.workingDraft.audience);
  assert.equal(
    draft.workingDraft.desiredOutcome,
    session.workingDraft.desiredOutcome,
  );
  assert.deepEqual(
    draft.workingDraft.knownFacts,
    session.workingDraft.knownFacts,
  );
  assert.equal(draft.slides[0].title, SLIDES[0].title);
  assert.equal(draft.slides.length, 8);
});

test("buildDraftFromSlideTexts не обрезает длинные строки как strict fit-pass", () => {
  const session = createClarifySession(STRONG_PROMPT);
  const slideTexts = SLIDES.map((slide) => ({
    ...slide,
    bullets: [...slide.bullets],
  })) as SlideTextEntry[];
  const probe = buildDraftFromSlideTexts(slideTexts, session.workingDraft);
  const featuresIdx = probe.slides.findIndex((s) => s.canvasLayoutId === "features");
  assert.ok(featuresIdx >= 0, "ожидался layout features");
  const longLine = "а".repeat(90);
  const target = slideTexts[featuresIdx];
  slideTexts[featuresIdx] = {
    ...target,
    bullets: [longLine, ...target.bullets.slice(1)],
  };
  const draft = buildDraftFromSlideTexts(slideTexts, session.workingDraft);
  assert.equal(draft.fitPassStrength, "editor");
  assert.equal(draft.slides[featuresIdx].blocks[0].title, longLine);
});

test("reviseDraftSession не смешивает sourcePrompt с командами правки и не шлёт error-history в модель", async () => {
  const baseSession = createClarifySession(STRONG_PROMPT);
  const slideTexts = SLIDES.map((slide) => ({
    ...slide,
    bullets: [...slide.bullets],
  }));
  const session = syncSessionWithSlideTexts(
    {
      ...baseSession,
      slideTexts,
      messages: [
        ...baseSession.messages,
        {
          role: "assistant" as const,
          text: "Временная ошибка старта.",
          kind: "error" as const,
        },
      ],
    },
    slideTexts,
  );
  let requestBody: { messages?: Array<{ content?: string }> } | null = null;

  await withMockedFetch(
    (async (_input, init) => {
      requestBody = JSON.parse(String(init?.body ?? "{}"));
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  slides: SLIDES,
                  assistantMessage: "Усилил проблемный акцент.",
                }),
              },
            },
          ],
        }),
      } as Response;
    }) as typeof fetch,
    async () => {
      const revised = await reviseDraftSession(
        session,
        "Сделай второй слайд жёстче.",
      );

      assert.equal(
        revised.workingDraft.sourcePrompt,
        session.workingDraft.sourcePrompt,
      );
      assert.equal(revised.messages.at(-1)?.text, "Усилил проблемный акцент.");
    },
  );

  const serializedMessages = JSON.stringify(
    ((requestBody ?? {}) as { messages?: Array<{ content?: string }> }).messages ?? [],
  );
  assert.doesNotMatch(serializedMessages, /Временная ошибка старта/);
});

test("generateDraftSession отдаёт MODEL_INVALID_SLIDES на плохом ответе модели", async () => {
  const session = createClarifySession(STRONG_PROMPT);

  await withMockedFetch(
    (async () =>
      ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"assistantMessage":"ok"}' } }],
        }),
      }) as Response) as typeof fetch,
    async () => {
      await assert.rejects(() => generateDraftSession(session), (error) => {
        assert.ok(error instanceof DraftApiError);
        assert.equal(error.code, "MODEL_INVALID_SLIDES");
        return true;
      });
    },
  );
});

test("generateDraftSession переводит AbortError в GENERATE_TIMEOUT", async () => {
  const session = createClarifySession(STRONG_PROMPT);

  await withMockedFetch(
    (async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    }) as typeof fetch,
    async () => {
      await assert.rejects(() => generateDraftSession(session), (error) => {
        assert.ok(error instanceof DraftApiError);
        assert.equal(error.code, "GENERATE_TIMEOUT");
        return true;
      });
    },
  );
});
