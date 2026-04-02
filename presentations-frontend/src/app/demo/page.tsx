"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SlideRenderer, SLIDE_HEIGHT, SLIDE_WIDTH } from "@/components/slides/SlideRenderer";
import { archetypeLabels, slideRoleLabels } from "@/lib/decision-package";
import { getTemplate } from "@/lib/templates";
import { MeetingScenarioId, Slide, SlideArchetype, SlideLayoutType, SlideMeta } from "@/types/presentation";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

interface DemoPackage {
  id: MeetingScenarioId;
  name: string;
  audience: string;
  decision: string;
  summary: string;
  proofPoints: string[];
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
      "strengthen-verdict",
      "shorten-for-execs",
      "rewrite-for-cfo",
      "add-business-impact",
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

const demoPackages: DemoPackage[] = [
  {
    id: "steering-committee",
    name: "Steering Committee",
    audience: "CIO, бизнес-спонсор, PMO",
    decision: "Закрепить owners по двум блокерам и утвердить controlled перенос milestone.",
    summary:
      "Пакет для ежемесячного steering: статус, отклонение, риск и конкретный ask вместо общего status update.",
    proofPoints: [
      "headline начинает с вывода",
      "отклонение объясняется через dependencies, а не через эмоции",
      "финал заканчивается decision slide",
    ],
    templateId: "consulting",
    slides: [
      createSlide(
        "steering-1",
        0,
        "title",
        {
          heading: "Программа держит результат, но два блокера уже сдвигают критичный milestone",
          subheading: "Steering Committee | ERP Transformation | апрель 2026",
        },
        createMeta(
          "Программа держит результат, но два блокера уже сдвигают критичный milestone",
          "recommend",
          "headline-verdict",
          "Что руководство должно понять в первые 30 секунд?",
          "Без этого слайда разговор уйдёт в технические статусы вместо управленческого вывода.",
          "Сразу поставить stakes встречи"
        ),
        "Откройте разговор verdict-слайдом, а не темой встречи."
      ),
      createSlide(
        "steering-2",
        1,
        "two-columns",
        {
          heading: "Отклонение идёт из незакрытых зависимостей, а не из delivery-команды",
          leftColumn: {
            heading: "Что идёт по плану",
            bullets: [
              "Разработка core-модулей завершена на 87%",
              "SIT закрыт без критичных дефектов",
              "Миграция выдерживает throughput",
            ],
          },
          rightColumn: {
            heading: "Что ломает milestone",
            bullets: [
              "Не назначен owner по UAT",
              "Вендор не подтвердил SLA",
              "Юр. контур задерживает интеграцию",
            ],
          },
        },
        createMeta(
          "Отклонение идёт из незакрытых зависимостей, а не из delivery-команды",
          "explain",
          "progress-vs-plan",
          "Что именно создаёт gap к плану?",
          "Этот слайд переводит разговор от blame к причинам и owners.",
          "Подготовить почву для owner-based решений"
        ),
        "Покажите, что проблема лежит в cross-functional execution, а не только в ИТ."
      ),
      createSlide(
        "steering-3",
        2,
        "content",
        {
          heading: "Нужно три решения сегодня: owner, SLA и перенос одного milestone на 3 недели",
          body:
            "Рекомендация: сохранить общий scope и целевой результат, но локально передвинуть integration freeze, чтобы не сорвать go-live.",
          bullets: [
            "Назначить sponsor-level owner по UAT",
            "Подтвердить SLA вендора до пятницы",
            "Утвердить controlled перенос milestone",
          ],
        },
        createMeta(
          "Нужно три решения сегодня: owner, SLA и перенос одного milestone на 3 недели",
          "decide",
          "decision-slide",
          "Что именно комитет должен одобрить сейчас?",
          "Это кульминация пакета: сильный апдейт без ясного ask не имеет управленческой ценности.",
          "Закрыть разговор конкретным набором решений"
        ),
        "Формулируйте ask так, чтобы его можно было принять на встрече без дополнительной декодировки."
      ),
    ],
  },
  {
    id: "budget-defense",
    name: "Budget Defense",
    audience: "CFO, инвесткомитет, CEO",
    decision: "Одобрить CAPEX 240M и выбрать вариант B как preferred option.",
    summary:
      "Пакет на защиту бюджета: не про красоту цифр, а про downside, ROI и честный trade-off между вариантами.",
    proofPoints: [
      "CFO-язык: effect, payback, downside",
      "варианты сравниваются по критериям, а не по вкусу",
      "ask отделён от обоснования",
    ],
    templateId: "minimal",
    slides: [
      createSlide(
        "budget-1",
        0,
        "title",
        {
          heading: "Без CAPEX на data platform программа теряет 40% ожидаемого эффекта уже в 2026 году",
          subheading: "Budget Defense | Enterprise Data Platform",
        },
        createMeta(
          "Без CAPEX на data platform программа теряет 40% ожидаемого эффекта уже в 2026 году",
          "recommend",
          "headline-verdict",
          "Почему это решение нельзя отложить без потери value?",
          "Открывает budget defense через ставку бизнеса, а не через внутренние нужды ИТ.",
          "Поставить финансовую ставку разговора"
        ),
        "Начните с последствий no-decision, а не с детализации затрат."
      ),
      createSlide(
        "budget-2",
        1,
        "kpi",
        {
          heading: "CAPEX окупается за 14 месяцев и снимает 120M руб. операционных потерь в год",
          kpiValues: [
            { value: "14 мес.", label: "Payback", trend: "up" },
            { value: "120M", label: "Потери, которые снимаем", trend: "up" },
            { value: "27%", label: "Снижение ручных операций", trend: "up" },
            { value: "2.3x", label: "ROI за 3 года", trend: "up" },
          ],
        },
        createMeta(
          "CAPEX окупается за 14 месяцев и снимает 120M руб. операционных потерь в год",
          "justify",
          "budget-waterfall",
          "Какая экономика делает ask разумным?",
          "Этот слайд превращает бюджет из расхода в инвестиционное решение.",
          "Подкрепить recommendation цифрами, понятными CFO"
        ),
        "Экономика должна подтверждать решение, а не существовать отдельно от него."
      ),
      createSlide(
        "budget-3",
        2,
        "content",
        {
          heading: "Рекомендуем вариант B и просим одобрить CAPEX 240M с двумя checkpoint по эффекту",
          body:
            "Ask: утвердить preferred option, CAPEX 240M и checkpoint на 90 и 180 день для проверки эффекта.",
          bullets: [
            "Одобрить вариант B как target architecture",
            "Утвердить CAPEX двумя tranche",
            "Зафиксировать KPI-checkpoint на 90 и 180 день",
          ],
        },
        createMeta(
          "Рекомендуем вариант B и просим одобрить CAPEX 240M с двумя checkpoint по эффекту",
          "decide",
          "decision-slide",
          "Что именно комитет должен проголосовать?",
          "Сильный business case без decision slide так и останется хорошим memo.",
          "Сделать решение управляемым и голосуемым"
        ),
        "Финальный ask должен включать не только деньги, но и механику контроля результата."
      ),
    ],
  },
  {
    id: "incident-risk-update",
    name: "Incident / Risk Update",
    audience: "CIO, COO, risk committee",
    decision: "Утвердить remediation-план и funding на закрытие системной причины инцидента.",
    summary:
      "Пакет для эскалации инцидента: честный timeline, business impact и решение, которое снижает риск повторения.",
    proofPoints: [
      "без защитного тона и technical log noise",
      "impact и root cause разведены явно",
      "финал ведёт к remediation ask",
    ],
    templateId: "tech",
    slides: [
      createSlide(
        "incident-1",
        0,
        "title",
        {
          heading: "Инцидент локализован, но корневая причина остаётся и создаёт риск повторения в течение 30 дней",
          subheading: "Incident Update | Core Payments | 02 апреля 2026",
        },
        createMeta(
          "Инцидент локализован, но корневая причина остаётся и создаёт риск повторения в течение 30 дней",
          "escalate",
          "headline-verdict",
          "Насколько ситуация реально под контролем?",
          "Сразу честно разделяет локализацию инцидента и полное закрытие риска.",
          "Вернуть разговор в рамку риска, а не оправданий"
        ),
        "Честный headline усиливает доверие к последующему remediation plan."
      ),
      createSlide(
        "incident-2",
        1,
        "timeline",
        {
          heading: "За 4 часа сервис восстановлен, но timeline показывает системный разрыв в failover-процессе",
          timelineItems: [
            { year: "09:12", title: "Падение primary cluster", description: "Рост ошибок на шлюзе" },
            { year: "09:24", title: "Ручной failover", description: "Автоматический сценарий не сработал" },
            { year: "11:05", title: "Сервис восстановлен", description: "Платежи пошли через резерв" },
            { year: "13:10", title: "Подтверждена root cause", description: "Policy failover не покрывает новый контур" },
          ],
        },
        createMeta(
          "За 4 часа сервис восстановлен, но timeline показывает системный разрыв в failover-процессе",
          "explain",
          "incident-timeline",
          "Что реально произошло и где система дала сбой?",
          "Timeline нужен как доказательство системной проблемы, а не как технический лог.",
          "Перевести эмоции в factual backbone"
        ),
        "Timeline должен объяснять управленческий смысл событий, а не перечислять их."
      ),
      createSlide(
        "incident-3",
        2,
        "content",
        {
          heading: "Просим утвердить remediation-план и funding на автоматизацию failover до конца месяца",
          body:
            "Рекомендация: не ограничиваться локальным фиксoм. Нужен системный remediation-пакет с owner, сроком и финансированием.",
          bullets: [
            "Утвердить funding на автоматизацию failover",
            "Закрепить single owner за resilience roadmap",
            "Провести review после завершения remediation",
          ],
        },
        createMeta(
          "Просим утвердить remediation-план и funding на автоматизацию failover до конца месяца",
          "decide",
          "decision-slide",
          "Какое решение снижает вероятность повторения?",
          "Превращает incident update в контролируемое решение, а не просто отчёт о случившемся.",
          "Закрыть эскалацию remediation ask"
        ),
        "Закрывайте инцидентный пакет не объяснениями, а решением на устранение системной причины."
      ),
    ],
  },
];

export default function DemoPage() {
  const [selectedPackageId, setSelectedPackageId] =
    useState<MeetingScenarioId>("steering-committee");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [scale, setScale] = useState(0.62);
  const containerRef = useRef<HTMLDivElement>(null);

  const activePackage = useMemo(
    () => demoPackages.find((item) => item.id === selectedPackageId) ?? demoPackages[0],
    [selectedPackageId]
  );
  const activeSlide = activePackage.slides[currentSlideIndex];
  const template = getTemplate(activePackage.templateId);

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
    <div className="min-h-screen bg-neutral-100 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
            Публичное демо
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-5xl">
            Демо управленческих пакетов, а не выставка типов слайдов.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-600 md:text-lg">
            SlideForge показывает, как ИТ-руководитель собирает позицию для CEO,
            CFO и комитетов: от verdict и риска до конкретного решения.
          </p>
        </div>

        <div className="mb-8 grid gap-3 lg:grid-cols-3">
          {demoPackages.map((item) => {
            const active = item.id === selectedPackageId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedPackageId(item.id);
                  setCurrentSlideIndex(0);
                }}
                className={`rounded-[28px] border p-5 text-left transition-all ${
                  active
                    ? "border-neutral-900 bg-neutral-900 text-white shadow-lg"
                    : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300"
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
            <section className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                Решение
              </div>
              <p className="mt-3 text-base font-medium leading-relaxed text-neutral-950">
                {activePackage.decision}
              </p>
            </section>

            <section className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                Почему пакет работает
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-neutral-600">
                {activePackage.proofPoints.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-neutral-900" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                Текущий слайд
              </div>
              {activeSlide.meta && (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
                      {slideRoleLabels[activeSlide.meta.role]}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                      {archetypeLabels[activeSlide.meta.archetype]}
                    </span>
                  </div>
                  <div className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                    Зачем он здесь
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    {activeSlide.meta.whyThisSlide}
                  </p>
                  <div className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                    Какой вопрос закрывает
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    {activeSlide.meta.managementQuestion}
                  </p>
                </>
              )}
            </section>
          </aside>

          <section className="rounded-[32px] border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                  Превью пакета
                </div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
                  {activePackage.name}
                </h2>
              </div>
              <div className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600">
                {currentSlideIndex + 1} / {activePackage.slides.length}
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
                onClick={() => setCurrentSlideIndex((current) => Math.max(0, current - 1))}
                disabled={currentSlideIndex === 0}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex gap-2 overflow-x-auto py-1">
                {activePackage.slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                      index === currentSlideIndex
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {slide.meta?.headlineVerdict || slide.content.heading || `Slide ${index + 1}`}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  setCurrentSlideIndex((current) =>
                    Math.min(activePackage.slides.length - 1, current + 1)
                  )
                }
                disabled={currentSlideIndex === activePackage.slides.length - 1}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 disabled:opacity-30"
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
