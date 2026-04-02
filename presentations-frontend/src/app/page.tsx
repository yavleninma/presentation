"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { usePresentationStore } from "@/lib/store/presentation-store";
import { generatePresentation } from "@/lib/generation/client";
import { getTemplate, templateList } from "@/lib/templates";
import { exportToPptx } from "@/lib/export/pptx-export";
import {
  SlideRenderer,
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
} from "@/components/slides/SlideRenderer";
import {
  Presentation,
  PresentationOutline,
  Slide,
  GenerationPhase,
  SlideLayoutType,
  GenerationStatusEvent,
} from "@/types/presentation";
import {
  Sparkles,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Palette,
  LayoutGrid,
  Plus,
  Trash2,
  FilePlus2,
  CheckCircle2,
} from "lucide-react";

const SLIDE_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const PROMPT_SUGGESTIONS = [
  {
    label: "Питч-дек",
    prompt:
      "Питч-дек для SaaS-сервиса автоматизации продаж: проблема рынка, решение, бизнес-модель, traction, экономика и план привлечения инвестиций",
  },
  {
    label: "Квартальный отчёт",
    prompt:
      "Квартальный отчёт по продажам за 2026 год: динамика выручки, каналы роста, проблемные зоны и план следующего квартала",
  },
  {
    label: "Стратегия",
    prompt:
      "Стратегия развития компании на 2027–2029 годы: ключевые инициативы, рынок, приоритеты, KPI и roadmap внедрения",
  },
  {
    label: "Обучение",
    prompt:
      "Обучающая презентация для новых менеджеров по продажам: этапы воронки, лучшие практики, скрипты и метрики эффективности",
  },
  {
    label: "Продажи",
    prompt:
      "Презентация для клиента о запуске нового B2B-продукта: ценность решения, кейсы, ROI и предложение по пилоту",
  },
  {
    label: "Запуск продукта",
    prompt:
      "План запуска нового цифрового продукта: сегменты аудитории, GTM-стратегия, маркетинговый план, команда и KPI первого квартала",
  },
] as const;

const LAYOUT_OPTIONS: { value: SlideLayoutType; label: string }[] = [
  { value: "title", label: "Титульный" },
  { value: "section", label: "Раздел" },
  { value: "content", label: "Контент" },
  { value: "two-columns", label: "Две колонки" },
  { value: "image-text", label: "Изображение + текст" },
  { value: "kpi", label: "KPI / Метрики" },
  { value: "timeline", label: "Таймлайн" },
  { value: "quote", label: "Цитата" },
  { value: "full-image", label: "Фон-изображение" },
  { value: "thank-you", label: "Финальный" },
];

const LAYOUT_LABELS = Object.fromEntries(
  LAYOUT_OPTIONS.map((option) => [option.value, option.label])
) as Record<SlideLayoutType, string>;

type StatusFeedItem = GenerationStatusEvent & { id: string };

function slideCountLabel(n: number): string {
  if (n === 1) return "1 слайд";
  if (n >= 2 && n <= 4) return `${n} слайда`;
  return `${n} слайдов`;
}

function getPhaseBadgeLabel(phase: GenerationPhase): string {
  switch (phase) {
    case "outline-review":
      return "План";
    case "generating":
      return "Генерация";
    case "polishing":
      return "Полировка";
    case "complete":
      return "Готово";
    case "error":
      return "Ошибка";
    default:
      return "Черновик";
  }
}

function getProgressValue(
  phase: GenerationPhase,
  status: GenerationStatusEvent | null,
  outline: PresentationOutline | null,
  completedSlides: number,
  requestedSlideCount: number
): number {
  if (typeof status?.progress === "number") return status.progress;
  if (phase === "complete") return 100;
  if (phase === "polishing") return 96;
  if (phase === "outline-review") return outline ? 22 : 10;
  if (phase === "generating") {
    const totalSlides = outline?.slides.length ?? requestedSlideCount;
    if (!totalSlides) return 30;
    return Math.min(92, 24 + Math.round((completedSlides / totalSlides) * 66));
  }
  return 0;
}

function getStatusTitle(
  phase: GenerationPhase,
  status: GenerationStatusEvent | null,
  outline: PresentationOutline | null
): string {
  if (status?.message) return status.message;
  if (phase === "outline-review") {
    return outline
      ? "План готов — скоро начну сборку слайдов"
      : "Готовлю структуру презентации";
  }
  if (phase === "generating") return "Собираю слайды в реальном времени";
  if (phase === "polishing") return "Финализирую презентацию";
  if (phase === "complete") return "Презентация готова";
  return "Создайте презентацию";
}

function getStatusDetail(
  phase: GenerationPhase,
  status: GenerationStatusEvent | null,
  outline: PresentationOutline | null,
  completedSlides: number,
  requestedSlideCount: number
): string {
  if (status?.detail) return status.detail;
  if (phase === "outline-review" && outline) {
    return `${outline.slides.length} ${slideCountLabel(outline.slides.length)} в плане — можно следить за сборкой с первого слайда.`;
  }
  if (phase === "generating") {
    return `Уже готово ${completedSlides} из ${requestedSlideCount} слайдов.`;
  }
  if (phase === "polishing") {
    return "Проверяю порядок слайдов, speaker notes и общую целостность выдачи.";
  }
  return "";
}

function getProgressCaption(
  status: GenerationStatusEvent | null,
  outline: PresentationOutline | null,
  completedSlides: number,
  requestedSlideCount: number
): string {
  if (status?.slideIndex && status.totalSlides) {
    return `${status.slideIndex} из ${status.totalSlides}${
      status.slideTitle ? ` · ${status.slideTitle}` : ""
    }`;
  }
  if (outline) return `${outline.slides.length} ${slideCountLabel(outline.slides.length)} в outline`;
  return `${completedSlides} из ${requestedSlideCount}`;
}

function renderStatusFeed(items: StatusFeedItem[], compact = false) {
  if (!items.length) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => {
          const isLatest = index === items.length - 1;
          return (
            <div
              key={item.id}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                isLatest
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isLatest ? "bg-white animate-pulse" : "bg-neutral-400"
                }`}
              />
              <span className="max-w-[220px] truncate">{item.message}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isLatest = index === items.length - 1;
        return (
          <div key={item.id} className="flex items-start gap-3">
            <span
              className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                isLatest ? "bg-neutral-900 animate-pulse" : "bg-neutral-300"
              }`}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900">
                {item.message}
              </p>
              {item.detail && (
                <p className="mt-0.5 text-sm leading-relaxed text-neutral-500">
                  {item.detail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState(10);
  const [selectedTemplate, setSelectedTemplate] = useState("minimal");
  const [showTemplates, setShowTemplates] = useState(false);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatusEvent | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusFeedItem[]>([]);
  const [freshSlideId, setFreshSlideId] = useState<string | null>(null);

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
    updateSlideContent,
    updateSlide,
    removeSlide,
    addSlide,
    resetPresentation,
  } = usePresentationStore();

  const mainRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [slideScale, setSlideScale] = useState(0.5);

  const template = getTemplate(presentation?.templateId ?? selectedTemplate);
  const currentSlide = presentation?.slides[currentSlideIndex];
  const completedSlides = presentation?.slides.length ?? 0;
  const hasPresentation = completedSlides > 0;
  const isGenerating =
    phase === "outline-review" ||
    phase === "generating" ||
    phase === "polishing";
  const layoutVariety = outline
    ? new Set(outline.slides.map((slide) => slide.layout)).size
    : 0;
  const progressValue = getProgressValue(
    phase,
    generationStatus,
    outline,
    completedSlides,
    slideCount
  );
  const statusTitle = getStatusTitle(phase, generationStatus, outline);
  const statusDetail = getStatusDetail(
    phase,
    generationStatus,
    outline,
    completedSlides,
    slideCount
  );
  const progressCaption = getProgressCaption(
    generationStatus,
    outline,
    completedSlides,
    slideCount
  );
  const phaseBadgeLabel = getPhaseBadgeLabel(phase);
  const visibleStatusFeed = statusHistory.slice(-4);

  useEffect(() => {
    function updateScale() {
      if (!mainRef.current) return;
      const container = mainRef.current;
      const maxW = container.clientWidth - 48;
      const maxH = container.clientHeight - 48;
      const scaleW = maxW / SLIDE_WIDTH;
      const scaleH = maxH / SLIDE_HEIGHT;
      setSlideScale(Math.min(scaleW, scaleH, 1));
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [presentation, currentSlide, phase]);

  useEffect(() => {
    if (!freshSlideId) return;
    const timeout = window.setTimeout(() => setFreshSlideId(null), 650);
    return () => window.clearTimeout(timeout);
  }, [freshSlideId]);

  useEffect(() => {
    if (!isGenerating || !currentSlide) return;
    const activeThumbnail = thumbnailRefs.current[currentSlide.id];
    activeThumbnail?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [currentSlide, isGenerating]);

  const pushStatus = useCallback((status: GenerationStatusEvent) => {
    setGenerationStatus(status);
    setStatusHistory((prev) =>
      [...prev, { ...status, id: crypto.randomUUID() }].slice(-5)
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    if (
      !topic.trim() ||
      phase === "outline-review" ||
      phase === "generating" ||
      phase === "polishing"
    ) {
      return;
    }

    const normalizedTopic = topic.trim();
    const timestamp = new Date().toISOString();
    const draftPresentation: Presentation = {
      id: crypto.randomUUID(),
      title: normalizedTopic,
      prompt: normalizedTopic,
      templateId: selectedTemplate,
      language: "ru",
      slides: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setShowTemplates(false);
    setError(null);
    setOutline(null);
    setGenerationStatus({
      type: "thinking",
      message: "Разбираю запрос и выбираю лучший narrative",
      detail:
        "Сначала соберу outline, затем начну показывать готовые слайды в реальном времени.",
      progress: 2,
    });
    setStatusHistory([
      {
        id: crypto.randomUUID(),
        type: "thinking",
        message: "Разбираю запрос и выбираю лучший narrative",
        detail:
          "Сначала соберу outline, затем начну показывать готовые слайды в реальном времени.",
        progress: 2,
      },
    ]);
    setFreshSlideId(null);
    setCurrentSlide(0);
    setPresentation(draftPresentation);
    setPhase("outline-review");

    await generatePresentation(
      normalizedTopic,
      { slideCount, language: "ru", templateId: selectedTemplate },
      {
        onPhase: (nextPhase) => setPhase(nextPhase),
        onOutline: (nextOutline) => {
          setOutline(nextOutline);
          setPhase("outline-review");

          const currentPresentation =
            usePresentationStore.getState().presentation;
          if (currentPresentation) {
            setPresentation({
              ...currentPresentation,
              title: nextOutline.title?.trim() || currentPresentation.title,
              updatedAt: new Date().toISOString(),
            });
          }
        },
        onStatus: (status) => {
          pushStatus(status);
        },
        onSlide: (slide: Slide) => {
          appendSlide(slide);
          const nextSlides =
            usePresentationStore.getState().presentation?.slides ?? [];
          setCurrentSlide(Math.max(0, nextSlides.length - 1));
          setFreshSlideId(slide.id);
        },
        onComplete: (pres: Presentation) => {
          const nextSlideIndex = Math.min(
            usePresentationStore.getState().currentSlideIndex,
            pres.slides.length - 1
          );

          setPresentation(pres);
          setCurrentSlide(Math.max(0, nextSlideIndex));
        },
        onError: (err: string) => {
          const currentPresentation =
            usePresentationStore.getState().presentation;
          if ((currentPresentation?.slides.length ?? 0) === 0) {
            setPresentation(null);
          }
          setError(err);
          setPhase("error");
        },
      }
    );
  }, [
    topic,
    slideCount,
    selectedTemplate,
    phase,
    setError,
    setOutline,
    setCurrentSlide,
    setPresentation,
    setPhase,
    pushStatus,
    appendSlide,
  ]);

  const handleResetPresentation = useCallback(() => {
    resetPresentation();
    setOutline(null);
    setError(null);
    setGenerationStatus(null);
    setStatusHistory([]);
    setFreshSlideId(null);
  }, [resetPresentation, setOutline, setError]);

  const handleExportPptx = useCallback(async () => {
    if (!presentation) return;
    const exportTemplate = getTemplate(presentation.templateId);
    await exportToPptx(presentation, exportTemplate);
  }, [presentation]);

  const handleContentChange = useCallback(
    (field: string, value: string) => {
      const state = usePresentationStore.getState();
      const slide = state.presentation?.slides[state.currentSlideIndex];
      if (!slide) return;

      const slideId = slide.id;
      const parts = field.split(".");

      if (parts.length === 1) {
        updateSlideContent(slideId, { [field]: value });
      } else if (parts[0] === "bullets" && parts.length === 2) {
        const idx = parseInt(parts[1]);
        const newBullets = [...(slide.content.bullets || [])];
        newBullets[idx] = value;
        updateSlideContent(slideId, { bullets: newBullets });
      } else if (
        (parts[0] === "leftColumn" || parts[0] === "rightColumn") &&
        parts.length >= 2
      ) {
        const column = parts[0] as "leftColumn" | "rightColumn";
        const existingColumn = slide.content[column] || {};

        if (parts[1] === "heading") {
          updateSlideContent(slideId, {
            [column]: { ...existingColumn, heading: value },
          });
        } else if (parts[1] === "bullets" && parts.length === 3) {
          const idx = parseInt(parts[2]);
          const newBullets = [...(existingColumn.bullets || [])];
          newBullets[idx] = value;
          updateSlideContent(slideId, {
            [column]: { ...existingColumn, bullets: newBullets },
          });
        }
      }
    },
    [updateSlideContent]
  );

  const handleAddSlide = useCallback(() => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      order: currentSlideIndex + 1,
      layout: "content",
      content: {
        heading: "Новый слайд",
        bullets: ["Пункт 1", "Пункт 2", "Пункт 3"],
      },
      notes: "Добавьте тезисы, которые спикер должен проговорить устно.",
    };

    addSlide(newSlide, currentSlideIndex);
    setCurrentSlide(currentSlideIndex + 1);
  }, [currentSlideIndex, addSlide, setCurrentSlide]);

  const handleDeleteSlide = useCallback(() => {
    if (!presentation || presentation.slides.length <= 1) return;
    const slideId = presentation.slides[currentSlideIndex].id;
    removeSlide(slideId);
  }, [presentation, currentSlideIndex, removeSlide]);

  const handleLayoutChange = useCallback(
    (layout: SlideLayoutType) => {
      if (!presentation) return;
      const slideId = presentation.slides[currentSlideIndex].id;
      updateSlide(slideId, { layout });
    },
    [presentation, currentSlideIndex, updateSlide]
  );

  const handleSuggestionClick = useCallback((prompt: string) => {
    setTopic(prompt);
  }, []);

  const promptScreen = (
    <div className="w-full max-w-2xl px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/20">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-neutral-900">
          Создайте презентацию
        </h1>
        <p className="text-[15px] text-neutral-500">
          Опишите тему — AI сначала покажет план, а затем соберёт слайды вживую
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Например: Квартальный отчёт по продажам за 2026 год — динамика выручки, проблемные зоны, план роста и ключевые KPI"
          className="h-28 w-full resize-none text-[15px] leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleGenerate();
            }
          }}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.label}
              onClick={() => handleSuggestionClick(suggestion.prompt)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                topic === suggestion.prompt
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 hover:bg-white"
              }`}
            >
              {suggestion.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-neutral-100 pt-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-neutral-400" />
            <select
              value={slideCount}
              onChange={(e) =>
                setSlideCount(
                  Number(e.target.value) as (typeof SLIDE_COUNT_OPTIONS)[number]
                )
              }
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300"
              aria-label="Количество слайдов"
            >
              {SLIDE_COUNT_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {slideCountLabel(count)}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowTemplates((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
            >
              <Palette className="h-4 w-4" />
              <span
                className="h-3 w-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: template.colors.primary }}
              />
              {template.name}
            </button>

            {showTemplates && (
              <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
                {templateList.map((nextTemplate) => (
                  <button
                    key={nextTemplate.id}
                    onClick={() => {
                      setSelectedTemplate(nextTemplate.id);
                      setShowTemplates(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      selectedTemplate === nextTemplate.id
                        ? "bg-neutral-100"
                        : "hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span
                          className="h-4 w-4 rounded"
                          style={{
                            backgroundColor: nextTemplate.colors.primary,
                          }}
                        />
                        <span
                          className="h-4 w-4 rounded"
                          style={{
                            backgroundColor: nextTemplate.colors.secondary,
                          }}
                        />
                        <span
                          className="h-4 w-4 rounded"
                          style={{
                            backgroundColor: nextTemplate.colors.accent,
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {nextTemplate.name}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {nextTemplate.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          <button
            onClick={handleGenerate}
            disabled={!topic.trim()}
            className="flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" />
            Создать
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-neutral-400">
        Ctrl+Enter для быстрого запуска
      </p>
    </div>
  );

  const generationStageScreen = (
    <div className="w-full max-w-6xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
              {phase === "complete" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-500" />
              )}
              {phaseBadgeLabel}
            </div>
            <span className="text-sm font-medium tabular-nums text-neutral-500">
              {progressValue}%
            </span>
          </div>

          <div className="mb-3">
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
              {statusTitle}
            </h2>
            {statusDetail && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
                {statusDetail}
              </p>
            )}
          </div>

          <div className="mb-3 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all duration-500 ease-out"
              style={{ width: `${progressValue}%` }}
            />
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
            <span className="rounded-full bg-neutral-100 px-3 py-1">
              {progressCaption}
            </span>
            <span className="rounded-full bg-neutral-100 px-3 py-1">
              Шаблон: {template.name}
            </span>
            {outline && (
              <span className="rounded-full bg-neutral-100 px-3 py-1">
                {layoutVariety} типов layout
              </span>
            )}
          </div>

          {renderStatusFeed(visibleStatusFeed)}
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
              Outline Review
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900">
              {outline?.title || "Собираю план презентации"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              {outline
                ? "План уже виден до финальной выдачи — можно наблюдать, как он превращается в готовую деку."
                : "Сначала формирую структуру и speaker notes, затем начну показывать готовые слайды по одному."}
            </p>
          </div>

          {outline ? (
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {outline.slides.map((outlineSlide, index) => (
                <div
                  key={`${outlineSlide.title}-${index}`}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
                        Слайд {index + 1}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-neutral-900">
                        {outlineSlide.title}
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-500 ring-1 ring-neutral-200">
                      {LAYOUT_LABELS[outlineSlide.layout]}
                    </span>
                  </div>

                  {outlineSlide.keyPoints?.length ? (
                    <ul className="mt-3 space-y-1.5 text-sm text-neutral-600">
                      {outlineSlide.keyPoints.slice(0, 3).map((point) => (
                        <li key={point} className="flex gap-2">
                          <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-neutral-300" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {outlineSlide.speakerNotes && (
                    <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                      {outlineSlide.speakerNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 text-center">
              <Loader2 className="mb-4 h-6 w-6 animate-spin text-neutral-400" />
              <p className="text-sm font-medium text-neutral-700">
                План ещё собирается
              </p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-500">
                Через пару секунд здесь появятся заголовки слайдов, тезисы и первые notes для спикера.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );

  const previewScreen = (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-5 px-6 py-8">
      {(isGenerating || phase === "error") && (
        <div
          className={`w-full max-w-[min(1180px,100%)] rounded-2xl border p-4 shadow-sm backdrop-blur ${
            phase === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-neutral-200 bg-white/95"
          }`}
        >
          {phase === "error" ? (
            <div>
              <div className="text-sm font-semibold">Генерация остановилась</div>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-500" />
                  {phaseBadgeLabel}
                </div>
                <div className="text-sm font-medium tabular-nums text-neutral-500">
                  {progressValue}%
                </div>
              </div>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold tracking-tight text-neutral-900">
                    {statusTitle}
                  </p>
                  {statusDetail && (
                    <p className="mt-1 text-sm text-neutral-500">
                      {statusDetail}
                    </p>
                  )}
                </div>
                <div className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600">
                  {progressCaption}
                </div>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-neutral-900 transition-all duration-500 ease-out"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              {renderStatusFeed(visibleStatusFeed, true)}
            </>
          )}
        </div>
      )}

      <div
        key={`${currentSlide?.id}-${freshSlideId === currentSlide?.id ? "fresh" : "stable"}`}
        className={`overflow-hidden rounded-lg bg-white shadow-2xl ${
          freshSlideId === currentSlide?.id
            ? "animate-in fade-in zoom-in-95 duration-500"
            : ""
        }`}
        style={{
          width: SLIDE_WIDTH * slideScale,
          height: SLIDE_HEIGHT * slideScale,
        }}
      >
        {currentSlide && (
          <SlideRenderer
            slide={currentSlide}
            template={template}
            scale={slideScale}
            editable={phase === "complete"}
            onContentChange={handleContentChange}
          />
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlideIndex - 1))}
          disabled={currentSlideIndex === 0}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-all hover:bg-neutral-50 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="min-w-[70px] text-center text-sm font-medium tabular-nums text-neutral-500">
          {currentSlideIndex + 1} / {presentation?.slides.length ?? 0}
        </span>

        <button
          onClick={() =>
            setCurrentSlide(
              Math.min(
                (presentation?.slides.length ?? 1) - 1,
                currentSlideIndex + 1
              )
            )
          }
          disabled={currentSlideIndex >= (presentation?.slides.length ?? 1) - 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-all hover:bg-neutral-50 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {generationStatus?.slideIndex && generationStatus.totalSlides
            ? `Генерирую слайд ${generationStatus.slideIndex} из ${generationStatus.totalSlides}${
                generationStatus.slideTitle
                  ? `: «${generationStatus.slideTitle}»`
                  : ""
              }`
            : `Готово ${completedSlides} из ${slideCount} слайдов`}
        </div>
      )}
    </div>
  );

  const leftSidebar =
    hasPresentation && presentation ? (
      <aside className="w-[208px] flex-shrink-0 overflow-y-auto border-r border-neutral-200 bg-white px-3 py-3">
        <div className="space-y-2">
          {presentation.slides.map((slide, index) => {
            const thumbScale = 160 / SLIDE_WIDTH;
            const isActive = index === currentSlideIndex;
            const isFresh = slide.id === freshSlideId;

            return (
              <button
                key={slide.id}
                ref={(node) => {
                  thumbnailRefs.current[slide.id] = node;
                }}
                onClick={() => setCurrentSlide(index)}
                className={`relative w-full overflow-hidden rounded-lg transition-all ${
                  isActive
                    ? "ring-2 ring-red-500 ring-offset-2"
                    : "ring-1 ring-neutral-200 hover:ring-neutral-300"
                } ${isFresh ? "animate-in fade-in zoom-in-95 duration-500" : ""}`}
              >
                <div
                  style={{
                    width: 160,
                    height: 160 * (SLIDE_HEIGHT / SLIDE_WIDTH),
                    overflow: "hidden",
                  }}
                >
                  <SlideRenderer
                    slide={slide}
                    template={template}
                    scale={thumbScale}
                  />
                </div>
                <div className="absolute bottom-1 left-1.5 rounded bg-white/85 px-1 text-[10px] font-medium text-neutral-400">
                  {index + 1}
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    ) : null;

  const rightSidebar =
    hasPresentation && presentation && currentSlide ? (
      <aside className="w-[296px] flex-shrink-0 overflow-y-auto border-l border-neutral-200 bg-white p-5">
        <div className="space-y-6">
          <div className="flex gap-2">
            <button
              onClick={handleAddSlide}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Добавить
            </button>
            <button
              onClick={handleDeleteSlide}
              disabled={presentation.slides.length <= 1}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-red-500 transition-colors hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-px bg-neutral-100" />

          <div>
            <div className="mb-3 flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-neutral-400" />
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Тип слайда
              </span>
            </div>
            <select
              value={currentSlide.layout}
              onChange={(e) => handleLayoutChange(e.target.value as SlideLayoutType)}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300"
            >
              {LAYOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-px bg-neutral-100" />

          <div>
            <span className="mb-3 block text-xs font-medium uppercase tracking-wider text-neutral-500">
              Содержимое
            </span>
            <div className="space-y-3">
              {currentSlide.content.heading && (
                <div>
                  <label className="mb-1 block text-xs text-neutral-400">
                    Заголовок
                  </label>
                  <p className="text-sm text-neutral-700">
                    {currentSlide.content.heading}
                  </p>
                </div>
              )}

              {currentSlide.content.bullets && (
                <div>
                  <label className="mb-1 block text-xs text-neutral-400">
                    Пункты
                  </label>
                  <ul className="space-y-1 text-sm text-neutral-600">
                    {currentSlide.content.bullets.map((bullet, index) => (
                      <li key={index} className="flex gap-1.5">
                        <span className="text-neutral-400">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-neutral-100" />

          <div>
            <span className="mb-3 block text-xs font-medium uppercase tracking-wider text-neutral-500">
              Шаблон
            </span>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <span
                  className="h-6 w-6 rounded"
                  style={{ backgroundColor: template.colors.primary }}
                />
                <span
                  className="h-6 w-6 rounded"
                  style={{ backgroundColor: template.colors.secondary }}
                />
                <span
                  className="h-6 w-6 rounded"
                  style={{ backgroundColor: template.colors.accent }}
                />
              </div>
              <span className="text-sm text-neutral-700">{template.name}</span>
            </div>
          </div>

          {currentSlide.notes && (
            <>
              <div className="h-px bg-neutral-100" />
              <div>
                <span className="mb-3 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Спикер-ноуты
                </span>
                <p className="text-sm leading-relaxed text-neutral-600">
                  {currentSlide.notes}
                </p>
              </div>
            </>
          )}

          {phase === "complete" && (
            <>
              <div className="h-px bg-neutral-100" />
              <p className="text-xs leading-relaxed text-neutral-400">
                Кликните на текст слайда для редактирования.
                Enter — сохранить, Escape — отменить.
              </p>
            </>
          )}
        </div>
      </aside>
    ) : null;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-neutral-200 bg-white px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-neutral-900">
            SlideForge
          </span>
        </div>

        <div className="mx-1 h-5 w-px bg-neutral-200" />

        {presentation && (
          <span className="max-w-[320px] truncate text-sm text-neutral-500">
            {presentation.title}
          </span>
        )}

        <div className="flex-1" />

        {presentation && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetPresentation}
              className="flex h-8 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              Новая
            </button>
            {hasPresentation && (
              <button
                onClick={handleExportPptx}
                className="flex h-8 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
              >
                <Download className="h-3.5 w-3.5" />
                PPTX
              </button>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {leftSidebar}

        <main
          ref={mainRef}
          className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-neutral-100"
        >
          {!hasPresentation && !isGenerating
            ? promptScreen
            : !currentSlide
              ? generationStageScreen
              : previewScreen}
        </main>

        {rightSidebar}
      </div>
    </div>
  );
}
