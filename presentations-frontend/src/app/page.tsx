"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exportToPptx } from "@/lib/export/pptx-export";
import {
  generateOutline,
  generateSlides,
  regenerateSlide,
} from "@/lib/generation/client";
import {
  archetypeLabels,
  createEmptyBrief,
  DEFAULT_REGEN_INTENTS,
  getScenarioDefinition,
  regenerationIntentLabels,
  scenarioDefinitions,
  slideRoleLabels,
} from "@/lib/decision-package";
import { usePresentationStore } from "@/lib/store/presentation-store";
import { getTemplate, templateList } from "@/lib/templates";
import {
  SlideRenderer,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "@/components/slides/SlideRenderer";
import {
  GenerationPhase,
  GenerationStatusEvent,
  MeetingScenarioId,
  OutlineSlide,
  Presentation,
  PresentationBrief,
  SlideLayoutType,
  SlideRegenerationIntent,
} from "@/types/presentation";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FilePlus2,
  Loader2,
  Palette,
  Sparkles,
  Trash2,
} from "lucide-react";

const layouts: { value: SlideLayoutType; label: string }[] = [
  { value: "title", label: "Verdict" },
  { value: "section", label: "Раздел" },
  { value: "content", label: "Вывод" },
  { value: "two-columns", label: "Сравнение" },
  { value: "image-text", label: "Контекст" },
  { value: "kpi", label: "KPI" },
  { value: "timeline", label: "Таймлайн" },
];

type FeedItem = GenerationStatusEvent & { id: string };

function TextField({
  label,
  value,
  placeholder,
  multiline = false,
  rows = 3,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-300 focus:outline-none"
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-300 focus:outline-none"
        />
      )}
    </label>
  );
}

function phaseLabel(phase: GenerationPhase) {
  switch (phase) {
    case "briefing":
      return "Бриф";
    case "outline-review":
      return "Структура";
    case "generating":
      return "Пакет";
    case "polishing":
      return "Доработка";
    case "complete":
      return "Готово";
    case "error":
      return "Ошибка";
    default:
      return "Ожидание";
  }
}

export default function Home() {
  const [brief, setBrief] = useState<PresentationBrief>(
    createEmptyBrief("steering-committee")
  );
  const [selectedTemplate, setSelectedTemplate] = useState("consulting");
  const [selectedStorylineId, setSelectedStorylineId] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [isLoadingOutline, setIsLoadingOutline] = useState(false);
  const [status, setStatus] = useState<GenerationStatusEvent | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [freshSlideId, setFreshSlideId] = useState<string | null>(null);
  const [regeneratingIntent, setRegeneratingIntent] =
    useState<SlideRegenerationIntent | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [scale, setScale] = useState(0.52);

  const {
    presentation,
    currentSlideIndex,
    phase,
    outline,
    error,
    setPresentation,
    setCurrentSlide,
    setPhase,
    setOutline,
    appendSlide,
    setError,
    updateSlide,
    updateSlideContent,
    removeSlide,
    addSlide,
    resetPresentation,
  } = usePresentationStore();

  const scenario = getScenarioDefinition(brief.scenarioId);
  const template = getTemplate(presentation?.templateId ?? selectedTemplate);
  const currentSlide = presentation?.slides[currentSlideIndex];
  const hasPresentation = (presentation?.slides.length ?? 0) > 0;
  const isGenerating = phase === "generating" || phase === "polishing";
  const progress =
    status?.progress ??
    (phase === "outline-review"
      ? 18
      : phase === "polishing"
        ? 96
        : phase === "complete"
          ? 100
          : 0);

  const missing = useMemo(() => {
    const labels: string[] = [];
    if (!brief.mainThesis.trim()) labels.push("главный тезис");
    if (!brief.leadershipAsk.trim()) labels.push("ask");
    if (!brief.sourceMaterial.trim()) labels.push("исходный материал");
    return labels;
  }, [brief]);

  useEffect(() => {
    function resize() {
      if (!mainRef.current) return;
      const width = (mainRef.current.clientWidth - 48) / SLIDE_WIDTH;
      const height = (mainRef.current.clientHeight - 56) / SLIDE_HEIGHT;
      setScale(Math.min(width, height, 1));
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [phase, presentation, currentSlide]);

  useEffect(() => {
    if (!freshSlideId) return;
    const timer = window.setTimeout(() => setFreshSlideId(null), 700);
    return () => window.clearTimeout(timer);
  }, [freshSlideId]);

  useEffect(() => {
    if (!currentSlide || !isGenerating) return;
    thumbsRef.current[currentSlide.id]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [currentSlide, isGenerating]);

  const pushStatus = useCallback((item: GenerationStatusEvent) => {
    setStatus(item);
    setFeed((prev) => [...prev, { ...item, id: crypto.randomUUID() }].slice(-5));
  }, []);

  const patchBrief = useCallback(
    <K extends keyof PresentationBrief>(field: K, value: PresentationBrief[K]) =>
      setBrief((prev) => ({ ...prev, [field]: value })),
    []
  );

  const updateOutline = useCallback(
    (
      updater: (
        current: NonNullable<ReturnType<typeof usePresentationStore.getState>["outline"]>
      ) => NonNullable<ReturnType<typeof usePresentationStore.getState>["outline"]>
    ) => {
      const current = usePresentationStore.getState().outline;
      if (!current) return;
      setOutline(updater(current));
    },
    [setOutline]
  );

  const resetToStart = useCallback(() => {
    resetPresentation();
    setStatus(null);
    setFeed([]);
    setError(null);
    setFreshSlideId(null);
  }, [resetPresentation, setError]);

  const selectScenario = useCallback((id: MeetingScenarioId) => {
    const next = createEmptyBrief(id);
    setBrief((prev) => ({
      ...next,
      mainThesis: prev.mainThesis,
      leadershipAsk: prev.leadershipAsk,
      workingWell: prev.workingWell,
      notWorking: prev.notWorking,
      criticalNumbers: prev.criticalNumbers,
      risks: prev.risks,
      dependencies: prev.dependencies,
      sourceMaterial: prev.sourceMaterial,
      deadline: prev.deadline,
    }));
  }, []);

  const requestOutline = useCallback(async () => {
    if (missing.length) {
      setError(`Заполните: ${missing.join(", ")}.`);
      return;
    }
    setIsLoadingOutline(true);
    setPhase("briefing");
    setOutline(null);
    setPresentation(null);
    setError(null);
    pushStatus({
      type: "thinking",
      message: "Разбираю brief и собираю позицию к встрече",
      detail: "Сначала extraction и storyline, потом структура пакета.",
      progress: 6,
    });
    try {
      const nextOutline = await generateOutline(brief, { language: "ru" });
      setOutline(nextOutline);
      setSelectedStorylineId(nextOutline.package.storylineOptions[0]?.id ?? "");
      setPhase("outline-review");
      pushStatus({
        type: "researching",
        message: "Структура готова",
        detail: "Проверьте narrative, findings и роль каждого слайда.",
        progress: 18,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Outline failed");
      setPhase("error");
    } finally {
      setIsLoadingOutline(false);
    }
  }, [brief, missing, pushStatus, setError, setOutline, setPhase, setPresentation]);

  const approveOutline = useCallback(async () => {
    if (!outline) return;
    const stamp = new Date().toISOString();
    const draft: Presentation = {
      id: crypto.randomUUID(),
      title: outline.title,
      prompt: brief.mainThesis,
      templateId: selectedTemplate,
      language: "ru",
      brief,
      decisionPackage: outline.package,
      slides: [],
      createdAt: stamp,
      updatedAt: stamp,
    };
    setPresentation(draft);
    setCurrentSlide(0);
    setPhase("generating");
    setStatus({
      type: "thinking",
      message: "Собираю decision package из утверждённой структуры",
      detail: "Слайды уже строятся вокруг выбранного narrative.",
      progress: 24,
    });
    setFeed([]);
    await generateSlides(
      brief,
      outline,
      { language: "ru", templateId: selectedTemplate, selectedStorylineId },
      {
        onPhase: setPhase,
        onStatus: pushStatus,
        onSlide: (slide) => {
          appendSlide(slide);
          const slides = usePresentationStore.getState().presentation?.slides ?? [];
          setCurrentSlide(Math.max(0, slides.length - 1));
          setFreshSlideId(slide.id);
        },
        onComplete: (nextPresentation) => {
          setPresentation(nextPresentation);
          setCurrentSlide(0);
        },
        onError: (message) => {
          setError(message);
          setPhase("error");
        },
      }
    );
  }, [
    appendSlide,
    brief,
    outline,
    pushStatus,
    selectedStorylineId,
    selectedTemplate,
    setCurrentSlide,
    setError,
    setPhase,
    setPresentation,
    setStatus,
  ]);

  const updateOutlineSlide = useCallback(
    (index: number, updater: (slide: OutlineSlide) => OutlineSlide) =>
      updateOutline((current) => ({
        ...current,
        slides: current.slides.map((slide, i) =>
          i === index ? updater(slide) : slide
        ),
      })),
    [updateOutline]
  );

  const moveOutlineSlide = useCallback(
    (index: number, nextIndex: number) =>
      updateOutline((current) => {
        if (nextIndex < 0 || nextIndex >= current.slides.length) return current;
        const slides = [...current.slides];
        const [moved] = slides.splice(index, 1);
        slides.splice(nextIndex, 0, moved);
        return { ...current, slides };
      }),
    [updateOutline]
  );

  const addOutlineSlide = useCallback(() => {
    updateOutline((current) => ({
      ...current,
      slides: [
        ...current.slides,
        {
          title: "Новый управленческий аргумент усиливает решение",
          layout: "content",
          keyPoints: [
            "Какой факт нужно донести",
            "Почему это важно для руководства",
            "Как это меняет решение",
          ],
          speakerNotes:
            "Добавьте слайд только если он двигает решение, а не просто увеличивает объём пакета.",
          meta: {
            role: "justify",
            archetype: "appendix-detail",
            audience: brief.audience,
            headlineVerdict: "Новый управленческий аргумент усиливает решение",
            managementQuestion: "Какой дополнительный вопрос этот слайд закрывает?",
            decisionIntent: "Усилить package дополнительным доказательством",
            evidence: ["Факт 1", "Факт 2"],
            confidence: "medium",
            whyThisSlide:
              "Используйте его только если без него решение выглядит недостаточно обоснованным.",
            storylinePosition: "appendix",
            regenerationIntents: DEFAULT_REGEN_INTENTS,
          },
        },
      ],
    }));
  }, [brief.audience, updateOutline]);

  const editContent = useCallback(
    (field: string, value: string) => {
      const state = usePresentationStore.getState();
      const slide = state.presentation?.slides[state.currentSlideIndex];
      if (!slide) return;
      const parts = field.split(".");
      if (parts.length === 1) {
        updateSlideContent(slide.id, { [field]: value });
        return;
      }
      if (parts[0] === "bullets") {
        const bullets = [...(slide.content.bullets || [])];
        bullets[Number.parseInt(parts[1], 10)] = value;
        updateSlideContent(slide.id, { bullets });
        return;
      }
      if (parts[0] === "leftColumn" || parts[0] === "rightColumn") {
        const key = parts[0] as "leftColumn" | "rightColumn";
        const current = slide.content[key] || {};
        if (parts[1] === "heading") {
          updateSlideContent(slide.id, { [key]: { ...current, heading: value } });
          return;
        }
        if (parts[1] === "bullets") {
          const bullets = [...(current.bullets || [])];
          bullets[Number.parseInt(parts[2], 10)] = value;
          updateSlideContent(slide.id, { [key]: { ...current, bullets } });
        }
      }
    },
    [updateSlideContent]
  );

  const addAppendixSlide = useCallback(() => {
    if (!presentation) return;
    addSlide(
      {
        id: crypto.randomUUID(),
        order: currentSlideIndex + 1,
        layout: "content",
        content: {
          heading: "Дополнительный аргумент усиливает решение",
          body: "Добавьте факт, который нужен только в режиме вопросов.",
          bullets: [
            "Конкретное доказательство",
            "Значение для бизнеса",
            "Что это меняет в решении",
          ],
        },
        notes: "Используйте как appendix, не ломая main storyline.",
        meta: {
          role: "justify",
          archetype: "appendix-detail",
          audience: brief.audience,
          headlineVerdict: "Дополнительный аргумент усиливает решение",
          managementQuestion: "Какой дополнительный вопрос этот appendix снимает?",
          decisionIntent: "Поддержать основное решение фактами",
          evidence: ["Факт 1", "Факт 2"],
          confidence: "medium",
          whyThisSlide: "Нужен для защиты позиции на сложных вопросах.",
          storylinePosition: "appendix",
          regenerationIntents: DEFAULT_REGEN_INTENTS,
        },
      },
      currentSlideIndex
    );
  }, [addSlide, brief.audience, currentSlideIndex, presentation]);

  const regenerateCurrentSlide = useCallback(
    async (intent: SlideRegenerationIntent) => {
      if (!currentSlide || !presentation?.brief || !presentation) return;
      setRegeneratingIntent(intent);
      setError(null);
      try {
        const updated = await regenerateSlide(
          currentSlide,
          presentation,
          presentation.brief,
          intent,
          presentation.slides[currentSlideIndex - 1],
          presentation.slides[currentSlideIndex + 1]
        );
        updateSlide(currentSlide.id, updated);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Regeneration failed");
      } finally {
        setRegeneratingIntent(null);
      }
    },
    [currentSlide, currentSlideIndex, presentation, setError, updateSlide]
  );

  const promptView = (
    <div className="w-full max-w-7xl px-6 py-10">
      <div className="mb-8 max-w-4xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white">
          <Sparkles className="h-3.5 w-3.5" />
          AI chief of staff
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-950 md:text-5xl">
          Из ИТ-статусов и рисков — в управленческий пакет для руководства.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-600 md:text-lg">
          Guided brief вместо пустого prompt. Сначала AI вытащит пробелы и
          предложит narrative, потом соберёт пакет для CEO, CFO и комитетов.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-[32px] border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {scenarioDefinitions.map((item) => {
              const active = item.id === brief.scenarioId;
              return (
                <button
                  key={item.id}
                  onClick={() => selectScenario(item.id)}
                  className={`rounded-3xl border p-4 text-left transition-all ${
                    active
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-900 hover:border-neutral-300 hover:bg-white"
                  }`}
                >
                  <div className="text-xs font-medium uppercase tracking-[0.18em] opacity-70">
                    {item.shortName}
                  </div>
                  <div className="mt-2 text-base font-semibold">{item.name}</div>
                  <p className={`mt-2 text-sm leading-relaxed ${active ? "text-white/70" : "text-neutral-500"}`}>
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Встреча / пакет" value={brief.meetingName} placeholder={scenario.name} onChange={(v) => patchBrief("meetingName", v)} />
            <TextField label="Аудитория" value={brief.audience} placeholder={scenario.audienceHint} onChange={(v) => patchBrief("audience", v)} />
            <TextField label="Желаемый результат" value={brief.desiredOutcome} placeholder={scenario.desiredOutcomeHint} onChange={(v) => patchBrief("desiredOutcome", v)} />
            <TextField label="Дедлайн" value={brief.deadline || ""} placeholder="Например: Steering 12 апреля, 15:00" onChange={(v) => patchBrief("deadline", v)} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <TextField label="Главный тезис" value={brief.mainThesis} placeholder={scenario.thesisHint} multiline rows={4} onChange={(v) => patchBrief("mainThesis", v)} />
            <TextField label="Что должно решить руководство" value={brief.leadershipAsk} placeholder={scenario.askHint} multiline rows={4} onChange={(v) => patchBrief("leadershipAsk", v)} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TextField label="Что идёт хорошо" value={brief.workingWell} placeholder="milestones, SLA, закрытые блокеры" multiline rows={4} onChange={(v) => patchBrief("workingWell", v)} />
            <TextField label="Что идёт плохо" value={brief.notWorking} placeholder="отставание, ресурсный дефицит, незакрытые зависимости" multiline rows={4} onChange={(v) => patchBrief("notWorking", v)} />
            <TextField label="Критичные цифры" value={brief.criticalNumbers} placeholder="82%, -6 weeks, 120M gap" multiline rows={4} onChange={(v) => patchBrief("criticalNumbers", v)} />
            <TextField label="Риски" value={brief.risks} placeholder="что реально может сорвать решение" multiline rows={4} onChange={(v) => patchBrief("risks", v)} />
            <TextField label="Зависимости" value={brief.dependencies} placeholder="команды, вендоры, бюджеты, комитеты" multiline rows={4} onChange={(v) => patchBrief("dependencies", v)} />
            <TextField label="Исходный материал" value={brief.sourceMaterial} placeholder={scenario.sourceHint} multiline rows={8} onChange={(v) => patchBrief("sourceMaterial", v)} />
          </div>

          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={requestOutline}
              disabled={isLoadingOutline}
              className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              {isLoadingOutline ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              Собрать структуру пакета
            </button>
            <span className="text-sm text-neutral-500">
              Сначала brief и narrative, затем пакет для уверенного разговора с руководством.
            </span>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
              Proof points
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-600">
              <li>guided brief вместо пустого prompt</li>
              <li>AI ловит пробелы и противоречия до генерации</li>
              <li>структура утверждается до слайдов</li>
              <li>каждый слайд имеет управленческую роль</li>
              <li>есть update mode для регулярных пакетов</li>
            </ul>
          </div>
          <div className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm text-sm leading-relaxed text-neutral-600">
            Тон продукта: спокойный, взрослый, точный. Без обещаний “красиво
            за минуты”. Чем дороже ошибка на встрече, тем полезнее продукт.
          </div>
        </aside>
      </div>
    </div>
  );

  const outlineView = outline && (
    <div className="w-full max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
            Проверка структуры
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
            {outline.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600">
            Сначала спорим со структурой и findings, потом запускаем пакет.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <button
              onClick={() => setShowTemplates((v) => !v)}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700"
            >
              <Palette className="h-4 w-4" />
              {template.name}
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-3xl border border-neutral-200 bg-white p-2 shadow-xl">
                {templateList.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedTemplate(item.id);
                      setShowTemplates(false);
                    }}
                    className={`w-full rounded-2xl px-4 py-3 text-left ${
                      item.id === selectedTemplate ? "bg-neutral-100" : "hover:bg-neutral-50"
                    }`}
                  >
                    <div className="text-sm font-medium text-neutral-900">{item.name}</div>
                    <div className="text-xs text-neutral-500">{item.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={resetToStart} className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700">
            Вернуться к brief
          </button>
          <button onClick={approveOutline} className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white">
            Собрать пакет
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
              Executive summary
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neutral-700">
              {outline.package.executiveSummary}
            </p>
          </div>
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
              Варианты narrative
            </div>
            <div className="mt-4 space-y-3">
              {outline.package.storylineOptions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedStorylineId(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left ${
                    item.id === selectedStorylineId
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 hover:bg-white"
                  }`}
                >
                  <div className="text-sm font-semibold">{item.title}</div>
                  <p className={`mt-1 text-sm ${item.id === selectedStorylineId ? "text-white/70" : "text-neutral-500"}`}>
                    {item.rationale}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
              Что требует внимания
            </div>
            <div className="mt-4 space-y-3">
              {outline.package.extractionFindings.map((item) => (
                <div key={`${item.label}-${item.detail}`} className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm leading-relaxed text-neutral-600">
                  <div className="font-medium text-neutral-900">{item.label}</div>
                  <p className="mt-1">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          {outline.slides.map((slide, index) => (
            <div key={`${slide.title}-${index}`} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                    Слайд {index + 1}
                  </div>
                  <input
                    value={slide.title}
                    onChange={(e) =>
                      updateOutlineSlide(index, (current) => ({
                        ...current,
                        title: e.target.value,
                        meta: current.meta ? { ...current.meta, headlineVerdict: e.target.value } : current.meta,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-base font-semibold text-neutral-900"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => moveOutlineSlide(index, index - 1)} disabled={index === 0} className="rounded-xl border border-neutral-200 p-2 text-neutral-500 disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => moveOutlineSlide(index, index + 1)} disabled={index === outline.slides.length - 1} className="rounded-xl border border-neutral-200 p-2 text-neutral-500 disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => updateOutline((current) => current.slides.length > 4 ? { ...current, slides: current.slides.filter((_, i) => i !== index) } : current)} disabled={outline.slides.length <= 4} className="rounded-xl border border-neutral-200 p-2 text-red-500 disabled:opacity-30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {slide.meta && (
                  <>
                    <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
                      {slideRoleLabels[slide.meta.role]}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                      {archetypeLabels[slide.meta.archetype]}
                    </span>
                  </>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <div className="space-y-3 text-sm text-neutral-600">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-neutral-400">Зачем он здесь</div>
                    <p className="mt-1 leading-relaxed">{slide.meta?.whyThisSlide}</p>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-neutral-400">Вопрос руководства</div>
                    <p className="mt-1 leading-relaxed">{slide.meta?.managementQuestion}</p>
                  </div>
                  {slide.keyPoints?.length ? (
                    <ul className="space-y-1.5">
                      {slide.keyPoints.map((point) => (
                        <li key={point} className="flex gap-2">
                          <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-neutral-300" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.16em] text-neutral-400">Формат слайда</div>
                  <select
                    value={slide.layout}
                    onChange={(e) =>
                      updateOutlineSlide(index, (current) => ({ ...current, layout: e.target.value as SlideLayoutType }))
                    }
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
                  >
                    {layouts.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addOutlineSlide}
            className="flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-neutral-300 bg-white px-4 py-4 text-sm font-medium text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
          >
            <FilePlus2 className="h-4 w-4" />
            Добавить слайд в narrative
          </button>
        </section>
      </div>
    </div>
  );

  const stageView = (
    <div className="w-full max-w-6xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {phaseLabel(phase)}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
            {status?.message || "Собираю decision package"}
          </h2>
          {status?.detail && <p className="mt-2 text-sm leading-relaxed text-neutral-600">{status.detail}</p>}
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-neutral-900 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-sm text-neutral-600">
            <span className="rounded-full bg-neutral-100 px-3 py-1">{presentation?.slides.length ?? 0} из {outline?.slides.length ?? 0}</span>
            <span className="rounded-full bg-neutral-100 px-3 py-1">{template.name}</span>
          </div>
          <div className="mt-6 space-y-3">
            {feed.slice(-4).map((item, index, items) => (
              <div key={item.id} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${index === items.length - 1 ? "bg-neutral-900 animate-pulse" : "bg-neutral-300"}`} />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{item.message}</p>
                  {item.detail && <p className="mt-0.5 text-sm text-neutral-500">{item.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
            Executive summary
          </div>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">{outline?.package.executiveSummary}</p>
        </section>
      </div>
    </div>
  );

  const previewView = currentSlide && (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-6 py-8">
      <div className="w-full max-w-[min(1240px,100%)] rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
              {currentSlide.meta ? slideRoleLabels[currentSlide.meta.role] : "Слайд"}
            </span>
            {currentSlide.meta && (
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                {archetypeLabels[currentSlide.meta.archetype]}
              </span>
            )}
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600">
            {currentSlideIndex + 1} / {presentation?.slides.length ?? 0}
          </span>
        </div>
        {isGenerating && (
          <>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-neutral-900 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {feed.slice(-4).map((item, index, items) => (
                <div key={item.id} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${index === items.length - 1 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${index === items.length - 1 ? "bg-white animate-pulse" : "bg-neutral-400"}`} />
                  <span className="max-w-[240px] truncate">{item.message}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={`overflow-hidden rounded-lg bg-white shadow-2xl ${freshSlideId === currentSlide.id ? "animate-in fade-in zoom-in-95 duration-500" : ""}`} style={{ width: SLIDE_WIDTH * scale, height: SLIDE_HEIGHT * scale }}>
        <SlideRenderer slide={currentSlide} template={template} scale={scale} editable={phase === "complete"} onContentChange={editContent} />
      </div>

      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentSlide(Math.max(0, currentSlideIndex - 1))} disabled={currentSlideIndex === 0} className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[70px] text-center text-sm font-medium tabular-nums text-neutral-500">
          {currentSlideIndex + 1} / {presentation?.slides.length ?? 0}
        </span>
        <button onClick={() => setCurrentSlide(Math.min((presentation?.slides.length ?? 1) - 1, currentSlideIndex + 1))} disabled={currentSlideIndex >= (presentation?.slides.length ?? 1) - 1} className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const leftSidebar = hasPresentation && presentation && (
    <aside className="w-[228px] flex-shrink-0 overflow-y-auto border-r border-neutral-200 bg-white px-3 py-3">
      <div className="space-y-3">
        {presentation.slides.map((slide, index) => (
          <button
            key={slide.id}
            ref={(node) => {
              thumbsRef.current[slide.id] = node;
            }}
            onClick={() => setCurrentSlide(index)}
            className={`w-full rounded-2xl border bg-white p-2 text-left ${index === currentSlideIndex ? "border-neutral-900 shadow-sm" : "border-neutral-200 hover:border-neutral-300"}`}
          >
            <div className="overflow-hidden rounded-xl" style={{ width: 176, height: 176 * (SLIDE_HEIGHT / SLIDE_WIDTH) }}>
              <SlideRenderer slide={slide} template={template} scale={176 / SLIDE_WIDTH} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                {index + 1}
              </span>
              {slide.meta && (
                <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-white">
                  {slideRoleLabels[slide.meta.role]}
                </span>
              )}
            </div>
            <div className="mt-2 text-sm font-medium leading-snug text-neutral-900">
              {slide.meta?.headlineVerdict || slide.content.heading || slide.layout}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );

  const rightSidebar = hasPresentation && presentation && currentSlide && (
    <aside className="w-[340px] flex-shrink-0 overflow-y-auto border-l border-neutral-200 bg-white p-5">
      <div className="space-y-6">
        {currentSlide.meta && (
          <section className="rounded-3xl bg-neutral-50 p-4 text-sm text-neutral-600">
            <div className="text-xs uppercase tracking-[0.16em] text-neutral-400">Зачем этот слайд</div>
            <p className="mt-1 leading-relaxed">{currentSlide.meta.whyThisSlide}</p>
            <div className="mt-4 text-xs uppercase tracking-[0.16em] text-neutral-400">Вопрос руководства</div>
            <p className="mt-1 leading-relaxed">{currentSlide.meta.managementQuestion}</p>
            <div className="mt-4 text-xs uppercase tracking-[0.16em] text-neutral-400">Какое решение двигает</div>
            <p className="mt-1 leading-relaxed">{currentSlide.meta.decisionIntent}</p>
          </section>
        )}

        <section>
          <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Осмысленная перегенерация
          </div>
          <div className="grid gap-2">
            {(currentSlide.meta?.regenerationIntents || DEFAULT_REGEN_INTENTS).map((intent) => (
              <button key={intent} onClick={() => regenerateCurrentSlide(intent)} disabled={regeneratingIntent !== null} className={`rounded-2xl border px-3 py-2 text-left text-sm ${regeneratingIntent === intent ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"} disabled:opacity-50`}>
                {regeneratingIntent === intent ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {regenerationIntentLabels[intent]}
                  </span>
                ) : (
                  regenerationIntentLabels[intent]
                )}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Визуальный слой
          </div>
          <select value={currentSlide.layout} onChange={(e) => updateSlide(currentSlide.id, { layout: e.target.value as SlideLayoutType })} className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            {layouts.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </section>

        <section className="flex gap-2">
          <button onClick={addAppendixSlide} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
            <FilePlus2 className="h-3.5 w-3.5" />
            Добавить appendix
          </button>
          <button onClick={() => currentSlide && presentation.slides.length > 1 && removeSlide(currentSlide.id)} disabled={presentation.slides.length <= 1} className="flex items-center justify-center rounded-2xl border border-neutral-200 px-3 py-2 text-sm text-red-500 hover:border-red-200 hover:bg-red-50 disabled:opacity-30">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </section>

        {currentSlide.notes && (
          <section>
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
              Notes для выступления
            </div>
            <p className="rounded-3xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-600">
              {currentSlide.notes}
            </p>
          </section>
        )}

        {presentation.decisionPackage?.followUpQuestions?.length ? (
          <section>
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
              Follow-up Questions
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-neutral-600">
              {presentation.decisionPackage.followUpQuestions.map((question) => (
                <li key={question} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-neutral-300" />
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-neutral-200 bg-white px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-neutral-900">
            SlideForge
          </span>
        </div>
        <div className="mx-1 h-5 w-px bg-neutral-200" />
        {(presentation?.title || outline?.title) && (
          <span className="max-w-[340px] truncate text-sm text-neutral-500">
            {presentation?.title || outline?.title}
          </span>
        )}
        <div className="flex-1" />
        {(presentation || outline) && (
          <div className="flex items-center gap-2">
            <button onClick={resetToStart} className="flex h-8 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50">
              <FilePlus2 className="h-3.5 w-3.5" />
              Новый пакет
            </button>
            {hasPresentation && (
              <button onClick={() => presentation && exportToPptx(presentation, getTemplate(presentation.templateId))} className="flex h-8 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800">
                <Download className="h-3.5 w-3.5" />
                PPTX
              </button>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {leftSidebar}
        <main ref={mainRef} className="relative flex flex-1 flex-col items-center overflow-auto bg-neutral-100">
          {!outline && !hasPresentation && !isLoadingOutline && promptView}
          {isLoadingOutline && stageView}
          {outline && !hasPresentation && phase === "outline-review" && outlineView}
          {hasPresentation && !currentSlide && stageView}
          {hasPresentation && currentSlide && previewView}
        </main>
        {rightSidebar}
      </div>
    </div>
  );
}
