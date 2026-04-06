import test from "node:test";
import assert from "node:assert/strict";
import { DraftApiError } from "@/lib/draft-api";
import {
  createClarifySession,
  normalizeDraftSession,
  syncSessionWithSlideTexts,
} from "@/lib/draft-session";

const SIX_SLIDES = [
  {
    id: "slide-1" as const,
    railTitle: "Обложка",
    title: "Тема презентации",
    subtitle: "Для команды",
    bullets: ["Пункт обложки"],
  },
  {
    id: "slide-2" as const,
    railTitle: "Проблема",
    title: "Узкое место",
    subtitle: "Почему важно",
    bullets: ["1 — один", "2 — два", "3 — три"],
  },
  {
    id: "slide-3" as const,
    railTitle: "Три шага",
    title: "Как идём",
    subtitle: "План",
    bullets: ["01 А", "02 Б", "03 В"],
  },
  {
    id: "slide-4" as const,
    railTitle: "Результат",
    title: "Итог",
    subtitle: "Вывод",
    bullets: ["Факт один", "Факт два"],
  },
  {
    id: "slide-5" as const,
    railTitle: "Для кого",
    title: "Роли",
    subtitle: "Кому",
    bullets: ["Роль А — задача", "Роль Б — задача", "Роль В — задача"],
  },
  {
    id: "slide-6" as const,
    railTitle: "След. шаг",
    title: "Дальше",
    subtitle: "Финал",
    bullets: ["Сделать шаг один", "Шаг два", "Шаг три"],
  },
];

test("normalizeDraftSession отклоняет не-объект", () => {
  assert.throws(
    () => normalizeDraftSession(null),
    (e: unknown) => e instanceof DraftApiError && e.code === "INVALID_REQUEST",
  );
});

test("normalizeDraftSession отклоняет сессию без workingDraft.sourcePrompt", () => {
  assert.throws(
    () => normalizeDraftSession({ workingDraft: {} }),
    (e: unknown) => e instanceof DraftApiError && e.code === "INVALID_REQUEST",
  );
});

test("syncSessionWithSlideTexts обновляет summary при непустых слайдах", () => {
  const session = createClarifySession("Показать статус платформы за квартал.");
  const synced = syncSessionWithSlideTexts(session, [...SIX_SLIDES]);

  assert.match(synced.summary, /Тема:|Кому:/);
  assert.equal(synced.slideTexts.length, 6);
  assert.equal(synced.readyToGenerate, true);
});
