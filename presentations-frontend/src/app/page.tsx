"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { usePresentationStore } from "@/lib/store/presentation-store";
import { generatePresentation } from "@/lib/generation/client";
import { getTemplate, templateList } from "@/lib/templates";
import { exportToPptx } from "@/lib/export/pptx-export";
import { SlideRenderer, SLIDE_WIDTH, SLIDE_HEIGHT } from "@/components/slides/SlideRenderer";
import { Presentation, Slide, GenerationPhase, SlideLayoutType } from "@/types/presentation";
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
} from "lucide-react";

const SLIDE_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function slideCountLabel(n: number): string {
  if (n === 1) return "1 слайд";
  if (n >= 2 && n <= 4) return `${n} слайда`;
  return `${n} слайдов`;
}

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

export default function Home() {
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState(10);
  const [selectedTemplate, setSelectedTemplate] = useState("minimal");
  const [showTemplates, setShowTemplates] = useState(false);

  const {
    presentation,
    currentSlideIndex,
    phase,
    setPresentation,
    setCurrentSlide,
    setPhase,
    appendSlide,
    setError,
    updateSlideContent,
    updateSlide,
    removeSlide,
    addSlide,
    resetPresentation,
  } = usePresentationStore();

  const mainRef = useRef<HTMLDivElement>(null);
  const [slideScale, setSlideScale] = useState(0.5);

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
  }, [presentation]);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim() || phase === "generating" || phase === "outline") return;
    setPhase("outline");
    setPresentation(null as unknown as Presentation);

    await generatePresentation(
      topic,
      { slideCount, language: "ru", templateId: selectedTemplate },
      {
        onPhase: (p) => setPhase(p as GenerationPhase),
        onOutline: () => {
          // reserved for outline editor (EPIC-06)
        },
        onSlide: (slide: Slide) => {
          appendSlide(slide);
        },
        onComplete: (pres: Presentation) => {
          setPresentation(pres);
          setCurrentSlide(0);
        },
        onError: (err: string) => {
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
    setPhase,
    setPresentation,
    appendSlide,
    setCurrentSlide,
    setError,
  ]);

  const handleExportPptx = useCallback(async () => {
    if (!presentation) return;
    const template = getTemplate(presentation.templateId);
    await exportToPptx(presentation, template);
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
        const col = parts[0] as "leftColumn" | "rightColumn";
        const existing = slide.content[col] || {};
        if (parts[1] === "heading") {
          updateSlideContent(slideId, {
            [col]: { ...existing, heading: value },
          });
        } else if (parts[1] === "bullets" && parts.length === 3) {
          const idx = parseInt(parts[2]);
          const newBullets = [...(existing.bullets || [])];
          newBullets[idx] = value;
          updateSlideContent(slideId, {
            [col]: { ...existing, bullets: newBullets },
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

  const template = getTemplate(selectedTemplate);
  const currentSlide = presentation?.slides[currentSlideIndex];
  const isGenerating = phase === "outline" || phase === "generating";
  const hasPresentation = presentation && presentation.slides.length > 0;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex-shrink-0 h-14 border-b border-neutral-200 bg-white flex items-center px-5 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[15px] text-neutral-900 tracking-tight">
            SlideForge
          </span>
        </div>

        <div className="h-5 w-px bg-neutral-200 mx-1" />

        {hasPresentation && (
          <span className="text-sm text-neutral-500 truncate max-w-[300px]">
            {presentation.title}
          </span>
        )}

        <div className="flex-1" />

        {hasPresentation && (
          <div className="flex items-center gap-2">
            <button
              onClick={resetPresentation}
              className="flex items-center gap-2 px-3 h-8 rounded-lg border border-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              Новая
            </button>
            <button
              onClick={handleExportPptx}
              className="flex items-center gap-2 px-3 h-8 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              PPTX
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — slide thumbnails */}
        {hasPresentation && (
          <aside className="w-[200px] flex-shrink-0 border-r border-neutral-200 bg-white overflow-y-auto py-3 px-3">
            <div className="space-y-2">
              {presentation.slides.map((slide, i) => {
                const thumbScale = 160 / SLIDE_WIDTH;
                return (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-full relative rounded-lg overflow-hidden transition-all ${
                      i === currentSlideIndex
                        ? "ring-2 ring-red-500 ring-offset-2"
                        : "ring-1 ring-neutral-200 hover:ring-neutral-300"
                    }`}
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
                    <div className="absolute bottom-1 left-1.5 text-[10px] font-medium text-neutral-400 bg-white/80 px-1 rounded">
                      {i + 1}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Main content area */}
        <main ref={mainRef} className="flex-1 flex flex-col items-center justify-center overflow-hidden relative bg-neutral-100">
          {!hasPresentation && !isGenerating ? (
            /* Prompt input screen */
            <div className="max-w-xl w-full px-6">
              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-500/20">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-neutral-900 tracking-tight mb-2">
                  Создайте презентацию
                </h1>
                <p className="text-neutral-500 text-[15px]">
                  Опишите тему — AI создаст профессиональную презентацию за минуты
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5">
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Например: Стратегия развития цифровых сервисов банка на 2026 год — ключевые показатели, план внедрения, ожидаемые результаты"
                  className="w-full h-28 resize-none text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleGenerate();
                    }
                  }}
                />

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-neutral-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <select
                      value={slideCount}
                      onChange={(e) =>
                        setSlideCount(Number(e.target.value) as (typeof SLIDE_COUNT_OPTIONS)[number])
                      }
                      className="text-sm text-neutral-600 bg-neutral-50 rounded-lg px-2 py-1.5 border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-300"
                      aria-label="Количество слайдов"
                    >
                      {SLIDE_COUNT_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {slideCountLabel(n)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="flex items-center gap-2 text-sm text-neutral-600 bg-neutral-50 rounded-lg px-3 py-1.5 border border-neutral-200 hover:bg-neutral-100 transition-colors"
                    >
                      <Palette className="w-4 h-4" />
                      <span
                        className="w-3 h-3 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: template.colors.primary }}
                      />
                      {template.name}
                    </button>

                    {showTemplates && (
                      <div className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-lg border border-neutral-200 p-2 z-50 w-56">
                        {templateList.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSelectedTemplate(t.id);
                              setShowTemplates(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                              selectedTemplate === t.id
                                ? "bg-neutral-100"
                                : "hover:bg-neutral-50"
                            }`}
                          >
                            <div className="flex gap-1">
                              <span
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: t.colors.primary }}
                              />
                              <span
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: t.colors.secondary }}
                              />
                              <span
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: t.colors.accent }}
                              />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-neutral-900">
                                {t.name}
                              </div>
                              <div className="text-xs text-neutral-400">
                                {t.description}
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
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Создать
                  </button>
                </div>
              </div>

              <p className="text-center text-xs text-neutral-400 mt-4">
                Ctrl+Enter для быстрого запуска
              </p>
            </div>
          ) : isGenerating && !currentSlide ? (
            /* Loading state */
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-neutral-900">
                  {phase === "outline"
                    ? "Создаю структуру..."
                    : "Генерирую слайды..."}
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  {phase === "outline"
                    ? "AI анализирует тему и строит план"
                    : `Готово ${presentation?.slides.length ?? 0} из ${slideCount} слайдов`}
                </p>
              </div>
            </div>
          ) : currentSlide ? (
            /* Slide preview */
            <div className="flex flex-col items-center justify-center flex-1 w-full">
              <div
                className="shadow-2xl rounded-lg overflow-hidden bg-white"
                style={{
                  width: SLIDE_WIDTH * slideScale,
                  height: SLIDE_HEIGHT * slideScale,
                }}
              >
                <SlideRenderer
                  slide={currentSlide}
                  template={template}
                  scale={slideScale}
                  editable={phase === "complete"}
                  onContentChange={handleContentChange}
                />
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={() =>
                    setCurrentSlide(Math.max(0, currentSlideIndex - 1))
                  }
                  disabled={currentSlideIndex === 0}
                  className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-sm font-medium text-neutral-500 tabular-nums min-w-[60px] text-center">
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
                  disabled={
                    currentSlideIndex >=
                    (presentation?.slides.length ?? 1) - 1
                  }
                  className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {isGenerating && (
                <div className="flex items-center gap-2 mt-4 text-sm text-neutral-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Генерирую: {presentation?.slides.length ?? 0} из{" "}
                  {slideCount}...
                </div>
              )}
            </div>
          ) : null}
        </main>

        {/* Right panel — slide info/actions */}
        {hasPresentation && currentSlide && (
          <aside className="w-[280px] flex-shrink-0 border-l border-neutral-200 bg-white overflow-y-auto p-5">
            <div className="space-y-6">
              {/* Slide actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleAddSlide}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить
                </button>
                <button
                  onClick={handleDeleteSlide}
                  disabled={presentation.slides.length <= 1}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-red-500 hover:bg-red-50 hover:border-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-px bg-neutral-100" />

              {/* Layout switcher */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <LayoutGrid className="w-4 h-4 text-neutral-400" />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Тип слайда
                  </span>
                </div>
                <select
                  value={currentSlide.layout}
                  onChange={(e) =>
                    handleLayoutChange(e.target.value as SlideLayoutType)
                  }
                  className="w-full text-sm text-neutral-700 bg-neutral-50 rounded-lg px-3 py-2 border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-300"
                >
                  {LAYOUT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-px bg-neutral-100" />

              {/* Content summary */}
              <div>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider block mb-3">
                  Содержимое
                </span>
                <div className="space-y-3">
                  {currentSlide.content.heading && (
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">
                        Заголовок
                      </label>
                      <p className="text-sm text-neutral-700">
                        {currentSlide.content.heading}
                      </p>
                    </div>
                  )}
                  {currentSlide.content.bullets && (
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">
                        Пункты
                      </label>
                      <ul className="text-sm text-neutral-600 space-y-1">
                        {currentSlide.content.bullets.map((b, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="text-neutral-400">•</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-neutral-100" />

              {/* Template info */}
              <div>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider block mb-3">
                  Шаблон
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <span
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: template.colors.primary }}
                    />
                    <span
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: template.colors.secondary }}
                    />
                    <span
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: template.colors.accent }}
                    />
                  </div>
                  <span className="text-sm text-neutral-700">
                    {template.name}
                  </span>
                </div>
              </div>

              {currentSlide.notes && (
                <>
                  <div className="h-px bg-neutral-100" />
                  <div>
                    <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider block mb-3">
                      Заметки
                    </span>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      {currentSlide.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Editing hint */}
              {phase === "complete" && (
                <>
                  <div className="h-px bg-neutral-100" />
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Кликните на текст слайда для редактирования.
                    Enter — сохранить, Escape — отменить.
                  </p>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
