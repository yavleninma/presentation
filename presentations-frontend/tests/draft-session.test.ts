import test from "node:test";
import assert from "node:assert/strict";
import { DraftApiError } from "@/lib/draft-api";
import {
  createClarifySession,
  normalizeDraftSession,
  syncSessionWithSlideTexts,
} from "@/lib/draft-session";
import type { SlideTextEntry } from "@/lib/presentation-types";

function makeSlides(count: number): SlideTextEntry[] {
  const templates: Array<Omit<SlideTextEntry, "id">> = [
    { railTitle: "Обложка", title: "Тема презентации", subtitle: "Для команды", bullets: ["Пункт обложки"] },
    { railTitle: "Проблема", title: "Узкое место", subtitle: "Почему важно", bullets: ["1 — один", "2 — два", "3 — три"] },
    { railTitle: "Три шага", title: "Как идём", subtitle: "План", bullets: ["01 А", "02 Б", "03 В"] },
    { railTitle: "Результат", title: "Итог", subtitle: "Вывод", bullets: ["Факт один", "Факт два"] },
    { railTitle: "Для кого", layoutType: "personas", title: "Роли", subtitle: "Кому", bullets: ["Роль А — задача", "Роль Б — задача", "Роль В — задача"] },
    { railTitle: "След. шаг", title: "Дальше", subtitle: "Финал", bullets: ["Сделать шаг один", "Шаг два", "Шаг три"] },
    { railTitle: "Детали", title: "Подробнее", subtitle: "", bullets: ["Деталь 1", "Деталь 2"] },
    { railTitle: "Данные", title: "Цифры", subtitle: "", bullets: ["10% рост", "5 проектов"] },
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `slide-${i + 1}`,
    ...templates[i % templates.length],
  }));
}

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
  const slides = makeSlides(8);
  const synced = syncSessionWithSlideTexts(session, slides);

  assert.match(synced.summary, /Тема:|Кому:/);
  assert.equal(synced.slideTexts.length, 8);
  assert.equal(synced.readyToGenerate, true);
});

test("syncSessionWithSlideTexts работает с разным количеством слайдов", () => {
  const session = createClarifySession("Квартальный отчёт по ИИ-сервисам.");
  for (const count of [6, 10, 15]) {
    const slides = makeSlides(count);
    const synced = syncSessionWithSlideTexts(session, slides);
    assert.equal(synced.slideTexts.length, count);
    assert.equal(synced.readyToGenerate, true);
  }
});
