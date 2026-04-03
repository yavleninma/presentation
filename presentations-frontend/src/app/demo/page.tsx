"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import {
  SlideRenderer,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "@/components/slides/SlideRenderer";
import { archetypeLabels, slideRoleLabels } from "@/lib/decision-package";
import { getTemplate } from "@/lib/templates";
import {
  MeetingScenarioId,
  Slide,
  SlideArchetype,
  SlideLayoutType,
  SlideMeta,
} from "@/types/presentation";

interface DemoDraft {
  id: MeetingScenarioId;
  name: string;
  audience: string;
  promise: string;
  summary: string;
  templateId: string;
  slides: Slide[];
}

function createMeta(
  headlineVerdict: string,
  role: SlideMeta["role"],
  archetype: SlideArchetype,
  managementQuestion: string,
  whyThisSlide: string,
  decisionIntent: string
): SlideMeta {
  return {
    role,
    archetype,
    audience: "",
    headlineVerdict,
    managementQuestion,
    decisionIntent,
    evidence: [],
    confidence: "high",
    whyThisSlide,
    regenerationIntents: [
      "keep-meaning",
      "make-shorter",
      "make-more-visual",
      "make-stricter",
    ],
  };
}

function createSlide(
  id: string,
  order: number,
  layout: SlideLayoutType,
  content: Slide["content"],
  meta: SlideMeta,
  notes: string
): Slide {
  return { id, order, layout, content, meta, notes };
}

const drafts: DemoDraft[] = [
  {
    id: "steering-committee",
    name: "Новый продукт",
    audience: "Команда, партнёры, руководство",
    promise: "Идея быстро читается, а визуальный тон уже выглядит как живой черновик, а не пустой шаблон.",
    summary:
      "Пример для режима «Идея»: цепляющий вход, понятная структура и финальный шаг без перегруза.",
    templateId: "startup",
    slides: [
      createSlide(
        "idea-1",
        0,
        "title",
        {
          heading: "Один экран бронирования сокращает путь клиента с 7 шагов до 2",
          subheading: "Идея сервиса для быстрых локальных бронирований",
        },
        createMeta(
          "Один экран бронирования сокращает путь клиента с 7 шагов до 2",
          "inform",
          "headline-verdict",
          "Почему этой идее хочется дать шанс уже после первого слайда?",
          "Сразу ставит ставку: не просто новый сервис, а заметное упрощение жизни пользователя.",
          "Открыть историю сильным тезисом"
        ),
        "Первый слайд должен моментально объяснять выгоду, а не пересказывать вводную."
      ),
      createSlide(
        "idea-2",
        1,
        "two-columns",
        {
          heading: "Сейчас бронирование утомляет, а новый сценарий ощущается почти мгновенным",
          leftColumn: {
            heading: "Как сейчас",
            bullets: [
              "Много экранов и повторных действий",
              "Слабая уверенность, что бронь прошла",
              "Слишком много мелких решений по пути",
            ],
          },
          rightColumn: {
            heading: "Как будет",
            bullets: [
              "Короткая цепочка без лишних полей",
              "Подтверждение в один понятный момент",
              "Чёткий визуальный фокус на выборе и оплате",
            ],
          },
        },
        createMeta(
          "Сейчас бронирование утомляет, а новый сценарий ощущается почти мгновенным",
          "compare",
          "options-matrix",
          "Что именно становится лучше для пользователя?",
          "Сравнение делает обещание с первого слайда осязаемым.",
          "Показать разницу между старым и новым опытом"
        ),
        "Контраст между двумя состояниями помогает идее выглядеть реальной, а не абстрактной."
      ),
      createSlide(
        "idea-3",
        2,
        "content",
        {
          heading: "Дальше нужен быстрый прототип и тест на 20 реальных пользователях",
          body:
            "Черновик идеи уже понятен. Следующий шаг — собрать прототип и проверить, действительно ли новый сценарий экономит время и снижает отказы.",
          bullets: [
            "Собрать кликабельный прототип за 1 неделю",
            "Проверить сценарий на первых 20 пользователях",
            "Зафиксировать, где ещё остаётся трение",
          ],
        },
        createMeta(
          "Дальше нужен быстрый прототип и тест на 20 реальных пользователях",
          "decide",
          "decision-slide",
          "Что делать после презентации?",
          "Финал оставляет ощущение движения, а не красивой картинки без продолжения.",
          "Закрыть презентацию конкретным следующим шагом"
        ),
        "Завершайте даже творческую презентацию ясным действием."
      ),
    ],
  },
  {
    id: "budget-defense",
    name: "Квартальный отчёт",
    audience: "Команда, руководитель, заказчик",
    promise: "Спокойный отчёт может выглядеть современно и ясно, если не прятать выводы за сухими формулировками.",
    summary:
      "Пример для режима «Отчёт»: цифры, выводы и следующий шаг без ощущения бюрократии.",
    templateId: "consulting",
    slides: [
      createSlide(
        "report-1",
        0,
        "title",
        {
          heading: "Команда ускорилась: релизы стали чаще, а входящих блокеров заметно меньше",
          subheading: "Квартальный обзор продуктовой команды",
        },
        createMeta(
          "Команда ускорилась: релизы стали чаще, а входящих блокеров заметно меньше",
          "inform",
          "executive-summary",
          "Какой главный итог квартала нужно унести с собой?",
          "Хороший отчёт тоже начинается с вывода, а не с нейтрального заголовка.",
          "Открыть отчёт коротким итогом"
        ),
        "Даже в отчёте первый слайд должен давать ощущение понятной картины."
      ),
      createSlide(
        "report-2",
        1,
        "kpi",
        {
          heading: "Частота релизов выросла, а время на исправление заметных проблем сократилось почти вдвое",
          subheading: "Три показателя, которые лучше всего объясняют квартал",
          kpiValues: [
            { value: "18", label: "Релизов за квартал", trend: "up" },
            { value: "1.8 дня", label: "Среднее время до исправления", trend: "down" },
            { value: "92%", label: "Задач, закрытых в срок", trend: "up" },
          ],
        },
        createMeta(
          "Частота релизов выросла, а время на исправление заметных проблем сократилось почти вдвое",
          "justify",
          "kpi-dashboard-commentary",
          "Какие цифры лучше всего подтверждают итог квартала?",
          "Цифры поддерживают основной вывод и не живут отдельно от него.",
          "Подкрепить вывод краткой метрикой"
        ),
        "Показывайте только те метрики, которые реально двигают историю."
      ),
      createSlide(
        "report-3",
        2,
        "content",
        {
          heading: "Следующий квартал стоит посвятить стабильности и ускорению обратной связи",
          body:
            "База уже выглядит уверенно. Теперь сильнее всего повлияет работа над стабильностью и более коротким циклом получения обратной связи от пользователей.",
          bullets: [
            "Поддержать текущий ритм релизов",
            "Выделить время на стабилизацию двух узких мест",
            "Запустить более быстрый цикл сбора обратной связи",
          ],
        },
        createMeta(
          "Следующий квартал стоит посвятить стабильности и ускорению обратной связи",
          "recommend",
          "decision-slide",
          "Что делать после такого отчёта?",
          "Финал отчёта переводит факты в фокус на следующий период.",
          "Закрыть отчёт понятным ориентиром"
        ),
        "Отчёт становится сильнее, когда даёт не только ретроспективу, но и вектор дальше."
      ),
    ],
  },
  {
    id: "incident-risk-update",
    name: "Обучение",
    audience: "Слушатели, новая команда, стажёры",
    promise: "Даже обучающий материал можно собрать как аккуратную визуальную историю, а не как сплошной лист текста.",
    summary:
      "Пример для режима «Обучение»: одна тема, три понятных блока и мягкая подача.",
    templateId: "minimal",
    slides: [
      createSlide(
        "edu-1",
        0,
        "title",
        {
          heading: "Нейросети полезны не тогда, когда знают всё, а когда экономят время на рутине",
          subheading: "Короткое введение в практическое использование ИИ",
        },
        createMeta(
          "Нейросети полезны не тогда, когда знают всё, а когда экономят время на рутине",
          "inform",
          "headline-verdict",
          "Как сформулировать тему без тяжёлого вводного блока?",
          "Первый слайд задаёт спокойную, но живую рамку всей теме.",
          "Сделать тему понятной с первой секунды"
        ),
        "Начинайте обучение с ясной идеи, а не с длинного определения."
      ),
      createSlide(
        "edu-2",
        1,
        "timeline",
        {
          heading: "Освоение ИИ проще всего проходит в три шага: понять задачу, подобрать инструмент, проверить результат",
          timelineItems: [
            { year: "1", title: "Понять задачу", description: "Где именно уходит лишнее время" },
            { year: "2", title: "Подобрать инструмент", description: "Какой формат помогает лучше всего" },
            { year: "3", title: "Проверить результат", description: "Что сработало, а что нет" },
          ],
        },
        createMeta(
          "Освоение ИИ проще всего проходит в три шага: понять задачу, подобрать инструмент, проверить результат",
          "explain",
          "roadmap-milestones",
          "Как разложить тему по шагам без сложной схемы?",
          "Таймлайн помогает сделать обучение последовательным и спокойным.",
          "Показать порядок действий"
        ),
        "В обучении хорошо работают простые последовательности, которые можно удержать в голове."
      ),
      createSlide(
        "edu-3",
        2,
        "content",
        {
          heading: "Начать стоит с одного повторяющегося процесса, а не с попытки автоматизировать всё сразу",
          body:
            "Лучший вход в тему — выбрать одну задачу, где ИИ уже сегодня сэкономит время, и проверить это на практике.",
          bullets: [
            "Выберите один повторяющийся процесс",
            "Попробуйте 2-3 формулировки запроса",
            "Оцените результат и зафиксируйте выводы",
          ],
        },
        createMeta(
          "Начать стоит с одного повторяющегося процесса, а не с попытки автоматизировать всё сразу",
          "decide",
          "decision-slide",
          "Какой первый шаг сделать после мини-урока?",
          "Финал переводит теорию в простое действие.",
          "Закончить обучение практическим шагом"
        ),
        "Обучение лучше заканчивать маленьким практическим действием, а не абстрактным выводом."
      ),
    ],
  },
];

export default function DemoPage() {
  const [selectedDraftId, setSelectedDraftId] =
    useState<MeetingScenarioId>("steering-committee");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [scale, setScale] = useState(0.62);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeDraft = useMemo(
    () => drafts.find((item) => item.id === selectedDraftId) ?? drafts[0],
    [selectedDraftId]
  );
  const activeSlide = activeDraft.slides[currentSlideIndex];
  const template = getTemplate(activeDraft.templateId);

  useEffect(() => {
    function recalc() {
      if (!containerRef.current) return;
      const width = (containerRef.current.clientWidth - 48) / SLIDE_WIDTH;
      const height = (containerRef.current.clientHeight - 32) / SLIDE_HEIGHT;
      setScale(Math.min(width, height, 0.82));
    }

    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),transparent_26%),linear-gradient(180deg,#fffaf3_0%,#f6eee1_100%)] px-4 py-8 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
            Примеры
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-5xl [font-family:var(--font-bricolage-grotesque)]">
            Три примера того, как может выглядеть первый черновик.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-600 md:text-lg">
            SlideForge не заставляет начинать со сложной анкеты. Ниже можно
            посмотреть, как одна тема превращается в уже приятную для работы
            презентацию.
          </p>
        </div>

        <div className="mb-8 grid gap-3 lg:grid-cols-3">
          {drafts.map((item) => {
            const active = item.id === selectedDraftId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedDraftId(item.id);
                  setCurrentSlideIndex(0);
                }}
                className={`rounded-[28px] border p-5 text-left transition-all ${
                  active
                    ? "border-neutral-950 bg-neutral-950 text-white shadow-lg"
                    : "border-black/8 bg-white text-neutral-900 hover:border-black/16"
                }`}
              >
                <div className="text-xs font-medium uppercase tracking-[0.16em] opacity-70">
                  {item.name}
                </div>
                <p className="mt-3 text-sm leading-relaxed">{item.summary}</p>
                <div
                  className={`mt-4 rounded-full px-3 py-1 text-xs ${
                    active ? "bg-white/10 text-white" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {item.audience}
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-[28px] border border-black/8 bg-white p-6 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                Что в этом примере важно
              </div>
              <p className="mt-3 text-base leading-relaxed text-neutral-900">
                {activeDraft.promise}
              </p>
            </section>

            <section className="rounded-[28px] border border-black/8 bg-white p-6 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                Текущий слайд
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-white">
                  {slideRoleLabels[activeSlide.meta?.role ?? "inform"]}
                </span>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                  {archetypeLabels[activeSlide.meta?.archetype ?? "headline-verdict"]}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-neutral-600">
                {activeSlide.meta?.whyThisSlide}
              </p>
            </section>
          </aside>

          <section className="rounded-[32px] border border-black/8 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                  Превью черновика
                </div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
                  {activeDraft.name}
                </h2>
              </div>
              <div className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600">
                {currentSlideIndex + 1} / {activeDraft.slides.length}
              </div>
            </div>

            <div
              ref={containerRef}
              className="flex min-h-[520px] items-center justify-center rounded-[28px] bg-neutral-100 px-4 py-6"
            >
              <div
                className="overflow-hidden rounded-lg bg-white shadow-2xl"
                style={{ width: SLIDE_WIDTH * scale, height: SLIDE_HEIGHT * scale }}
              >
                <SlideRenderer slide={activeSlide} template={template} scale={scale} />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setCurrentSlideIndex((current) => Math.max(0, current - 1))}
                disabled={currentSlideIndex === 0}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-neutral-600 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex gap-2 overflow-x-auto py-1">
                {activeDraft.slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                      index === currentSlideIndex
                        ? "bg-neutral-950 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {slide.content.heading || `Слайд ${index + 1}`}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentSlideIndex((current) =>
                    Math.min(activeDraft.slides.length - 1, current + 1)
                  )
                }
                disabled={currentSlideIndex === activeDraft.slides.length - 1}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-neutral-600 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
