"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Download,
  FilePlus2,
  LayoutPanelLeft,
  Layers3,
  Loader2,
  MessageSquareText,
  Palette,
  RefreshCw,
  SendHorizonal,
  Sparkles,
  Wand2,
} from "lucide-react";
import { exportToPptx } from "@/lib/export/pptx-export";
import {
  chatWithPresentation,
  generateOutline,
  generateSlides,
  regenerateSlide,
} from "@/lib/generation/client";
import {
  createEmptyBrief,
  regenerationIntentLabels,
  slideLayoutLabels,
} from "@/lib/decision-package";
import { usePresentationStore } from "@/lib/store/presentation-store";
import { getTemplate } from "@/lib/templates";
import {
  SlideRenderer,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "@/components/slides/SlideRenderer";
import {
  GenerationStatusEvent,
  Presentation,
  PresentationBrief,
  PresentationFormatId,
  PresentationLengthId,
  SlideRegenerationIntent,
} from "@/types/presentation";

type FeedItem = GenerationStatusEvent & { id: string };
type PreviewMode = "slide" | "deck";
type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

const LENGTH_OPTIONS: {
  id: PresentationLengthId;
  label: string;
  description: string;
  slideCount: number;
}[] = [
  {
    id: "short",
    label: "Короткая",
    description: "4-5 слайдов, чтобы быстро донести мысль",
    slideCount: 5,
  },
  {
    id: "medium",
    label: "Средняя",
    description: "6-7 слайдов для уверенной структуры",
    slideCount: 7,
  },
  {
    id: "detailed",
    label: "Развёрнутая",
    description: "8-9 слайдов, если нужно больше аргументов",
    slideCount: 9,
  },
];

const FORMAT_OPTIONS: {
  id: PresentationFormatId;
  label: string;
  description: string;
  audience: string;
  goal: string;
}[] = [
  {
    id: "talk",
    label: "Доклад",
    description: "Сильная основная мысль и ясный ход рассказа",
    audience: "Коллеги, слушатели или клиент",
    goal: "Помочь быстро понять тему и логику выступления",
  },
  {
    id: "report",
    label: "Отчёт",
    description: "Факты, состояние дел и спокойные выводы",
    audience: "Команда, руководитель или заказчик",
    goal: "Коротко показать, что происходит и к чему это ведёт",
  },
  {
    id: "idea",
    label: "Идея",
    description: "Зажечь замыслом и показать потенциал",
    audience: "Команда, партнёр, руководитель или инвестор",
    goal: "Объяснить идею и сделать следующий шаг очевидным",
  },
  {
    id: "education",
    label: "Обучение",
    description: "Спокойно разложить тему по шагам",
    audience: "Слушатели, ученики или новая команда",
    goal: "Помочь понять материал без перегруза",
  },
];

const THEME_OPTIONS = [
  {
    id: "minimal",
    label: "Светлая",
    description: "Чистая, воздушная и универсальная",
  },
  {
    id: "modern-dark",
    label: "Тёмная",
    description: "Глубокая, контрастная и чуть технологичная",
  },
  {
    id: "startup",
    label: "Акцентная",
    description: "Смелая, яркая и более энергичная",
  },
  {
    id: "consulting",
    label: "Строгая",
    description: "Собранная, спокойная и убедительная",
  },
] as const;

const CHAT_SUGGESTIONS = [
  "Сделай подачу живее и чуть смелее.",
  "Сократи текст на всех слайдах, но сохрани смысл.",
  "Добавь ещё один слайд с примером или кейсом.",
  "Усиль аргументацию и сделай выводы точнее.",
];

const QUICK_ACTIONS = [
  {
    id: "shorter",
    label: "Сделать короче",
    prompt: "Сделай всю презентацию короче, плотнее и быстрее для чтения.",
  },
  {
    id: "visual",
    label: "Сделать визуальнее",
    prompt: "Сделай презентацию визуальнее: меньше лишних слов, сильнее композиция и акценты.",
  },
  {
    id: "strict",
    label: "Сделать строже",
    prompt: "Сделай презентацию строже, логичнее и деловее.",
  },
  {
    id: "structure",
    label: "Обновить структуру",
    prompt: "Перестрой структуру презентации так, чтобы история читалась яснее и сильнее.",
  },
];

const SLIDE_REBUILD_OPTIONS: {
  id: SlideRegenerationIntent;
  label: string;
  description: string;
}[] = [
  {
    id: "keep-meaning",
    label: "Сохранить смысл",
    description: "Новая подача без потери замысла",
  },
  {
    id: "make-shorter",
    label: "Сделать короче",
    description: "Уплотнить текст и ускорить чтение",
  },
  {
    id: "make-more-visual",
    label: "Сделать визуальнее",
    description: "Сильнее композиция и акценты",
  },
  {
    id: "make-stricter",
    label: "Сделать строже",
    description: "Спокойнее, деловее, собраннее",
  },
  {
    id: "focus-on-numbers",
    label: "Акцент на цифрах",
    description: "Сместить внимание на показатели и масштаб",
  },
];

function ChoiceCard({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[28px] border px-4 py-4 text-left transition-all ${
        active
          ? "border-neutral-950 bg-neutral-950 text-white shadow-[0_18px_60px_rgba(17,24,39,0.18)]"
          : "border-black/10 bg-white/80 text-neutral-900 hover:border-black/20 hover:bg-white"
      }`}
    >
      <div className="text-sm font-semibold tracking-tight">{label}</div>
      <p
        className={`mt-2 text-sm leading-relaxed ${
          active ? "text-white/78" : "text-neutral-600"
        }`}
      >
        {description}
      </p>
    </button>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const assistant = message.role === "assistant";

  return (
    <div className={`flex ${assistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[92%] rounded-[24px] px-4 py-3 text-sm leading-relaxed shadow-sm ${
          assistant
            ? "bg-white text-neutral-700 ring-1 ring-black/6"
            : "bg-neutral-950 text-white"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:border-black/20 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [selectedLength, setSelectedLength] =
    useState<PresentationLengthId>("medium");
  const [selectedFormat, setSelectedFormat] =
    useState<PresentationFormatId>("talk");
  const [selectedThemeId, setSelectedThemeId] = useState("minimal");
  const [, setSelectedStorylineId] = useState("");
  const [status, setStatus] = useState<GenerationStatusEvent | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [activeBrief, setActiveBrief] = useState<PresentationBrief | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("slide");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Введите тему презентации, выберите пару простых настроек, и я соберу красивый черновик.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [regeneratingIntent, setRegeneratingIntent] =
    useState<SlideRegenerationIntent | null>(null);
  const [customSlideInstruction, setCustomSlideInstruction] = useState("");
  const [scale, setScale] = useState(0.62);
  const [showMaterialsHint, setShowMaterialsHint] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

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
    resetPresentation,
  } = usePresentationStore();

  const isGenerating =
    phase === "briefing" || phase === "generating" || phase === "polishing";
  const workspaceActive = phase !== "idle" || Boolean(presentation) || Boolean(outline);
  const hasSlides = (presentation?.slides.length ?? 0) > 0;
  const currentSlide = presentation?.slides[currentSlideIndex];
  const selectedTheme = useMemo(
    () => THEME_OPTIONS.find((item) => item.id === selectedThemeId) ?? THEME_OPTIONS[0],
    [selectedThemeId]
  );
  const template = getTemplate(presentation?.templateId ?? selectedTheme.id);
  const progress =
    status?.progress ??
    (phase === "briefing"
      ? 10
      : phase === "generating"
        ? 62
        : phase === "polishing"
          ? 96
          : phase === "complete"
            ? 100
            : 0);
  const outlineSlides = outline?.slides ?? [];
  const deckScale = Math.min(scale * 0.72, 0.58);

  useEffect(() => {
    function resize() {
      if (!mainRef.current) return;
      const widthPadding = previewMode === "slide" ? 64 : 96;
      const heightPadding = previewMode === "slide" ? 96 : 56;
      const width = (mainRef.current.clientWidth - widthPadding) / SLIDE_WIDTH;
      const height = (mainRef.current.clientHeight - heightPadding) / SLIDE_HEIGHT;
      setScale(Math.min(width, height, 1));
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [previewMode, phase, presentation?.slides.length]);

  const pushStatus = useCallback((item: GenerationStatusEvent) => {
    setStatus(item);
    setFeed((prev) => [...prev, { ...item, id: crypto.randomUUID() }].slice(-6));
  }, []);

  const addChatMessage = useCallback((role: ChatRole, content: string) => {
    setChatMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content },
    ]);
  }, []);

  const buildBrief = useCallback((): PresentationBrief => {
    const format = FORMAT_OPTIONS.find((item) => item.id === selectedFormat) ?? FORMAT_OPTIONS[0];
    const base = createEmptyBrief("simple-presentation");

    return {
      ...base,
      meetingName: topic.trim(),
      audience: format.audience,
      desiredOutcome: format.goal,
      mainThesis: topic.trim(),
      leadershipAsk: format.goal,
      sourceMaterial: topic.trim(),
      presentationFormat: selectedFormat,
      presentationLength: selectedLength,
      visualTheme: selectedThemeId,
    };
  }, [selectedFormat, selectedLength, selectedThemeId, topic]);

  const resetToStart = useCallback(() => {
    resetPresentation();
    setPhase("idle");
    setOutline(null);
    setStatus(null);
    setFeed([]);
    setActiveBrief(null);
    setSelectedStorylineId("");
    setPreviewMode("slide");
    setChatBusy(false);
    setRegeneratingIntent(null);
    setCustomSlideInstruction("");
    setError(null);
    setChatMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Введите тему презентации, выберите пару простых настроек, и я соберу красивый черновик.",
      },
    ]);
  }, [resetPresentation, setError, setOutline, setPhase]);

  const updateCurrentSlideContent = useCallback(
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

  const focusSlideById = useCallback(
    (nextPresentation: Presentation, slideId?: string) => {
      if (!slideId) {
        setCurrentSlide(
          Math.min(currentSlideIndex, Math.max(nextPresentation.slides.length - 1, 0))
        );
        return;
      }

      const index = nextPresentation.slides.findIndex((slide) => slide.id === slideId);
      setCurrentSlide(index >= 0 ? index : 0);
    },
    [currentSlideIndex, setCurrentSlide]
  );

  const startPresentation = useCallback(async () => {
    if (!topic.trim()) {
      setError("Введите тему презентации, чтобы начать.");
      return;
    }

    const brief = buildBrief();
    const slideCount =
      LENGTH_OPTIONS.find((item) => item.id === selectedLength)?.slideCount ?? 7;

    setActiveBrief(brief);
    setError(null);
    setStatus(null);
    setFeed([]);
    setChatBusy(false);
    setRegeneratingIntent(null);
    setCustomSlideInstruction("");
    setPreviewMode("slide");
    setChatMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Собираю черновик. Как только появятся первые слайды, можно будет сразу смотреть и дорабатывать их здесь же.",
      },
    ]);
    setOutline(null);
    setPresentation(null);
    setCurrentSlide(0);
    setPhase("briefing");
    pushStatus({
      type: "thinking",
      message: "Раскладываю тему по структуре",
      detail: "Ищу лучший ритм истории и распределяю акценты по будущим слайдам.",
      progress: 10,
    });

    try {
      const nextOutline = await generateOutline(brief, {
        language: "ru",
        slideCount,
      });
      const storylineId = nextOutline.package.storylineOptions[0]?.id ?? "";
      const stamp = new Date().toISOString();

      setOutline(nextOutline);
      setSelectedStorylineId(storylineId);
      setPresentation({
        id: crypto.randomUUID(),
        title: nextOutline.title,
        prompt: brief.mainThesis,
        templateId: selectedThemeId,
        language: "ru",
        brief,
        decisionPackage: nextOutline.package,
        slides: [],
        createdAt: stamp,
        updatedAt: stamp,
      });
      setPhase("generating");
      pushStatus({
        type: "researching",
        message: "Собираю слайды черновика",
        detail: "Сейчас появятся первые кадры презентации. Их уже можно будет листать в процессе.",
        progress: 18,
      });

      await generateSlides(
        brief,
        nextOutline,
        {
          language: "ru",
          templateId: selectedThemeId,
          selectedStorylineId: storylineId,
        },
        {
          onPhase: setPhase,
          onStatus: pushStatus,
          onSlide: (slide) => {
            appendSlide(slide);
            const slides = usePresentationStore.getState().presentation?.slides ?? [];
            if (slides.length <= 1) {
              setCurrentSlide(0);
            }
          },
          onComplete: (nextPresentation) => {
            setPresentation(nextPresentation);
            setCurrentSlide(0);
            setChatMessages([
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content:
                  "Черновик готов. Теперь можно попросить сократить текст, перестроить структуру, добавить слайд или доработать конкретный кадр.",
              },
            ]);
          },
          onError: (message) => {
            setError(message);
            setPhase("error");
            setChatMessages([
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: `Не получилось собрать презентацию: ${message}`,
              },
            ]);
          },
        }
      );
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Не удалось собрать структуру презентации";
      setError(message);
      setPhase("error");
      setChatMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Не получилось начать генерацию: ${message}`,
        },
      ]);
    }
  }, [
    appendSlide,
    buildBrief,
    pushStatus,
    selectedLength,
    selectedThemeId,
    setCurrentSlide,
    setError,
    setOutline,
    setPhase,
    setPresentation,
    topic,
  ]);

  const runChatAction = useCallback(
    async (message: string) => {
      if (!presentation || !activeBrief || !message.trim() || chatBusy) return;

      addChatMessage("user", message.trim());
      setChatBusy(true);
      setError(null);

      try {
        const result = await chatWithPresentation(
          presentation,
          activeBrief,
          message.trim(),
          currentSlide?.id
        );
        setPresentation(result.presentation);
        focusSlideById(result.presentation, result.focusSlideId);
        addChatMessage("assistant", result.reply);
      } catch (nextError) {
        const errorMessage =
          nextError instanceof Error
            ? nextError.message
            : "Не удалось обновить презентацию";
        setError(errorMessage);
        addChatMessage("assistant", `Не получилось применить запрос: ${errorMessage}`);
      } finally {
        setChatBusy(false);
      }
    },
    [
      activeBrief,
      addChatMessage,
      chatBusy,
      currentSlide?.id,
      focusSlideById,
      presentation,
      setError,
      setPresentation,
    ]
  );

  const submitChat = useCallback(async () => {
    if (!chatInput.trim()) return;
    const message = chatInput;
    setChatInput("");
    await runChatAction(message);
  }, [chatInput, runChatAction]);

  const cycleTheme = useCallback(() => {
    const currentIndex = THEME_OPTIONS.findIndex((item) => item.id === selectedThemeId);
    const nextTheme = THEME_OPTIONS[(currentIndex + 1) % THEME_OPTIONS.length];

    setSelectedThemeId(nextTheme.id);
    if (presentation) {
      const nextPresentation = {
        ...presentation,
        templateId: nextTheme.id,
        brief: presentation.brief
          ? { ...presentation.brief, visualTheme: nextTheme.id }
          : presentation.brief,
        updatedAt: new Date().toISOString(),
      };
      setPresentation(nextPresentation);
      addChatMessage(
        "assistant",
        `Сменила оформление на тему «${nextTheme.label.toLowerCase()}».`
      );
    }
  }, [addChatMessage, presentation, selectedThemeId, setPresentation]);

  const rebuildCurrentSlide = useCallback(
    async (intent: SlideRegenerationIntent) => {
      if (!currentSlide || !presentation || !activeBrief || regeneratingIntent) return;
      if (intent === "custom" && !customSlideInstruction.trim()) {
        setError("Напишите своё указание для пересборки слайда.");
        return;
      }

      setRegeneratingIntent(intent);
      setError(null);

      try {
        const updated = await regenerateSlide(
          currentSlide,
          presentation,
          activeBrief,
          intent,
          intent === "custom" ? customSlideInstruction.trim() : undefined,
          presentation.slides[currentSlideIndex - 1],
          presentation.slides[currentSlideIndex + 1]
        );
        updateSlide(currentSlide.id, updated);
        addChatMessage(
          "assistant",
          intent === "custom"
            ? "Пересобрала выбранный слайд по вашему указанию."
            : `Пересобрала выбранный слайд: ${regenerationIntentLabels[intent].toLowerCase()}.`
        );
        if (intent === "custom") {
          setCustomSlideInstruction("");
        }
      } catch (nextError) {
        const message =
          nextError instanceof Error
            ? nextError.message
            : "Не удалось пересобрать слайд";
        setError(message);
        addChatMessage("assistant", `Не получилось пересобрать слайд: ${message}`);
      } finally {
        setRegeneratingIntent(null);
      }
    },
    [
      activeBrief,
      addChatMessage,
      currentSlide,
      currentSlideIndex,
      customSlideInstruction,
      presentation,
      regeneratingIntent,
      setError,
      updateSlide,
    ]
  );

  const removeSelectedSlide = useCallback(() => {
    if (!currentSlide || !presentation || presentation.slides.length <= 1) return;
    removeSlide(currentSlide.id);
    addChatMessage("assistant", "Убрала выбранный слайд из черновика.");
  }, [addChatMessage, currentSlide, presentation, removeSlide]);

  const landingView = (
    <main className="relative overflow-hidden px-4 pb-16 pt-8 md:px-6 md:pt-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.16),transparent_26%),linear-gradient(180deg,#fffaf2_0%,#f7f0e4_100%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[40px] border border-black/6 bg-white/78 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white">
              <Sparkles className="h-3.5 w-3.5" />
              Быстрый старт
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl [font-family:var(--font-bricolage-grotesque)]">
              SlideForge собирает красивую презентацию из одной мысли.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 md:text-lg">
              Без длинной анкеты, без ощущения опросника. Просто тема, пара
              настроек и живой черновик, который дальше улучшается прямо в
              диалоге.
            </p>

            <div className="mt-8 rounded-[32px] border border-black/8 bg-white p-4 shadow-sm md:p-5">
              <label className="block">
                <span className="mb-3 block text-sm font-medium text-neutral-700">
                  О чём будет презентация?
                </span>
                <textarea
                  value={topic}
                  rows={4}
                  placeholder="Например: как вывести новый продукт на рынок без лишней сложности"
                  onChange={(event) => setTopic(event.target.value)}
                  className="w-full resize-none rounded-[28px] border border-black/10 bg-[#fcfbf7] px-5 py-4 text-base leading-relaxed text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:bg-white"
                />
              </label>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div>
                  <div className="mb-3 text-sm font-medium text-neutral-700">Объём</div>
                  <div className="grid gap-3">
                    {LENGTH_OPTIONS.map((item) => (
                      <ChoiceCard
                        key={item.id}
                        active={selectedLength === item.id}
                        label={item.label}
                        description={item.description}
                        onClick={() => setSelectedLength(item.id)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-sm font-medium text-neutral-700">Шаблон</div>
                  <div className="grid gap-3">
                    {FORMAT_OPTIONS.map((item) => (
                      <ChoiceCard
                        key={item.id}
                        active={selectedFormat === item.id}
                        label={item.label}
                        description={item.description}
                        onClick={() => setSelectedFormat(item.id)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-sm font-medium text-neutral-700">
                    Тема оформления
                  </div>
                  <div className="grid gap-3">
                    {THEME_OPTIONS.map((item) => (
                      <ChoiceCard
                        key={item.id}
                        active={selectedThemeId === item.id}
                        label={item.label}
                        description={item.description}
                        onClick={() => setSelectedThemeId(item.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
                <button
                  type="button"
                  onClick={startPresentation}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-neutral-950 px-7 text-base font-medium text-white shadow-[0_16px_40px_rgba(17,24,39,0.18)] transition hover:bg-neutral-800"
                >
                  <Wand2 className="h-4 w-4" />
                  Создать презентацию
                </button>

                <button
                  type="button"
                  onClick={() => setShowMaterialsHint((current) => !current)}
                  className="inline-flex h-14 items-center justify-center rounded-full border border-dashed border-black/16 bg-white px-6 text-sm font-medium text-neutral-700 transition hover:border-black/24 hover:bg-neutral-50"
                >
                  Добавить материалы
                </button>
              </div>

              {showMaterialsHint && (
                <div className="mt-4 rounded-[24px] border border-dashed border-black/12 bg-[#fbfaf6] px-4 py-4 text-sm leading-relaxed text-neutral-600">
                  Скоро: документы, заметки, таблицы.
                </div>
              )}
            </div>

            <details className="mt-6 rounded-[28px] border border-black/8 bg-white/72 px-5 py-4 text-sm text-neutral-600">
              <summary className="cursor-pointer list-none font-medium text-neutral-900">
                Расширить возможности
              </summary>
              <p className="mt-3 leading-relaxed">
                Позже здесь появятся более серьёзные сценарии для руководителей
                ИТ и сложных рабочих апдейтов. Сейчас мы держим продукт лёгким:
                быстрый вход, красивый черновик, доработка внутри одной
                презентации.
              </p>
            </details>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[40px] border border-black/6 bg-neutral-950 p-6 text-white shadow-[0_24px_90px_rgba(15,23,42,0.16)]">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/65">
                Что получится сразу
              </div>
              <div className="mt-5 space-y-4">
                {[
                  "Готовый черновик слайдов без длинной анкеты.",
                  "Аккуратная структура, которую не стыдно показать уже на первом проходе.",
                  "Живой чат внутри презентации для всех следующих улучшений.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-amber-300" />
                    <p className="text-sm leading-relaxed text-white/82">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[40px] border border-black/6 bg-white/82 p-6 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                Внутри редактора
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-[28px] bg-[#fff4df] p-4">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
                    Слева
                  </div>
                  <p className="mt-2 text-sm text-neutral-700">
                    Лента слайдов, чтобы быстро прыгать по структуре.
                  </p>
                </div>
                <div className="rounded-[28px] bg-[#eff7ff] p-4">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700">
                    В центре
                  </div>
                  <p className="mt-2 text-sm text-neutral-700">
                    Большой просмотр слайда или всей презентации.
                  </p>
                </div>
                <div className="rounded-[28px] bg-[#f5f0ff] p-4">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-violet-700">
                    Справа
                  </div>
                  <p className="mt-2 text-sm text-neutral-700">
                    Чат-помощник именно для этой презентации и точечная
                    пересборка выбранного слайда.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );

  const leftSidebar = workspaceActive && (
    <aside className="hidden w-[264px] flex-shrink-0 border-r border-black/6 bg-white/82 px-4 py-4 xl:block">
      <div className="mb-4">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          Слайды
        </div>
        <div className="mt-2 text-sm text-neutral-500">
          {hasSlides
            ? `${presentation?.slides.length ?? 0} в черновике`
            : outlineSlides.length
              ? "Структура уже собрана"
              : "Черновик ещё не начат"}
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto pr-1">
        {hasSlides
          ? presentation?.slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentSlide(index)}
                className={`w-full rounded-[24px] border bg-white p-2 text-left transition ${
                  index === currentSlideIndex
                    ? "border-neutral-950 shadow-[0_14px_32px_rgba(15,23,42,0.1)]"
                    : "border-black/8 hover:border-black/16 hover:bg-neutral-50"
                }`}
              >
                <div
                  className="overflow-hidden rounded-[18px] bg-neutral-100"
                  style={{
                    width: 224,
                    height: 224 * (SLIDE_HEIGHT / SLIDE_WIDTH),
                  }}
                >
                  <SlideRenderer
                    slide={slide}
                    template={template}
                    scale={224 / SLIDE_WIDTH}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-500">
                    Слайд {index + 1}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {slideLayoutLabels[slide.layout]}
                  </span>
                </div>
                <div className="mt-2 text-sm font-medium leading-snug text-neutral-900">
                  {slide.content.heading || slide.meta?.headlineVerdict || `Слайд ${index + 1}`}
                </div>
              </button>
            ))
          : outlineSlides.map((slide, index) => (
              <div
                key={`${slide.title}-${index}`}
                className="rounded-[24px] border border-dashed border-black/10 bg-white px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-500">
                    Слайд {index + 1}
                  </span>
                  <span className="text-[11px] text-neutral-400">в работе</span>
                </div>
                <div className="mt-3 text-sm font-medium leading-snug text-neutral-900">
                  {slide.title}
                </div>
              </div>
            ))}
      </div>
    </aside>
  );

  const workspaceToolbar = workspaceActive && (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/6 bg-white/70 px-5 py-4 backdrop-blur">
      <div className="flex items-center gap-2 rounded-full bg-white/92 p-1 ring-1 ring-black/8">
        <button
          type="button"
          onClick={() => setPreviewMode("slide")}
          className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
            previewMode === "slide"
              ? "bg-neutral-950 text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <LayoutPanelLeft className="h-4 w-4" />
          Слайд
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode("deck")}
          className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
            previewMode === "deck"
              ? "bg-neutral-950 text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <Layers3 className="h-4 w-4" />
          Лента
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_ACTIONS.map((action) => (
          <ToolbarButton
            key={action.id}
            label={action.label}
            disabled={!hasSlides || chatBusy || isGenerating}
            onClick={() => void runChatAction(action.prompt)}
            icon={
              chatBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )
            }
          />
        ))}
        <ToolbarButton
          label={`Сменить тему: ${selectedTheme.label}`}
          disabled={!presentation}
          onClick={cycleTheme}
          icon={<Palette className="h-4 w-4" />}
        />
      </div>
    </div>
  );

  const centerStage = workspaceActive && (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {workspaceToolbar}
      <div
        ref={mainRef}
        className="relative flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),transparent_25%),linear-gradient(180deg,#f8f6ef_0%,#f1ebdd_100%)] px-4 py-6 md:px-6"
      >
        {error && (
          <div className="mx-auto mb-4 max-w-5xl rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!hasSlides && (
          <div className="mx-auto max-w-5xl rounded-[36px] border border-black/8 bg-white/88 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {phase === "briefing" ? "Строю структуру" : "Собираю черновик"}
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-950 [font-family:var(--font-bricolage-grotesque)]">
              {status?.message || "Готовлю первый вариант презентации"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-600 md:text-base">
              {status?.detail ||
                "Через несколько секунд здесь появятся первые слайды. Потом их можно будет дорабатывать прямо в чате."}
            </p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-neutral-950 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {feed.slice(-4).map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-black/6 bg-[#fbfaf6] px-4 py-4"
                >
                  <div className="text-sm font-medium text-neutral-900">
                    {item.message}
                  </div>
                  {item.detail && (
                    <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                      {item.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasSlides && currentSlide && previewMode === "slide" && (
          <div className="mx-auto flex max-w-[min(1320px,100%)] flex-col items-center gap-5">
            <div className="w-full rounded-[28px] border border-black/8 bg-white/90 px-5 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                    Текущий слайд
                  </div>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-950">
                    {currentSlide.content.heading || `Слайд ${currentSlideIndex + 1}`}
                  </h2>
                </div>
                <div className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600">
                  {currentSlideIndex + 1} / {presentation?.slides.length ?? 0}
                </div>
              </div>

              {isGenerating && (
                <>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-neutral-950 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {feed.slice(-3).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600"
                      >
                        {item.message}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div
              className="overflow-hidden rounded-[20px] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.16)]"
              style={{
                width: SLIDE_WIDTH * scale,
                height: SLIDE_HEIGHT * scale,
              }}
            >
              <SlideRenderer
                slide={currentSlide}
                template={template}
                scale={scale}
                editable={phase === "complete"}
                onContentChange={updateCurrentSlideContent}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentSlide(Math.max(0, currentSlideIndex - 1))}
                disabled={currentSlideIndex === 0}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
              </button>
              <span className="min-w-[78px] text-center text-sm font-medium tabular-nums text-neutral-500">
                {currentSlideIndex + 1} / {presentation?.slides.length ?? 0}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentSlide(
                    Math.min(
                      (presentation?.slides.length ?? 1) - 1,
                      currentSlideIndex + 1
                    )
                  )
                }
                disabled={currentSlideIndex >= (presentation?.slides.length ?? 1) - 1}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {hasSlides && previewMode === "deck" && (
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6">
            {presentation?.slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  setCurrentSlide(index);
                  setPreviewMode("slide");
                }}
                className={`rounded-[24px] border bg-white p-4 text-left shadow-[0_18px_50px_rgba(15,23,42,0.12)] transition ${
                  index === currentSlideIndex
                    ? "border-neutral-950"
                    : "border-black/8 hover:border-black/18"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
                    Слайд {index + 1}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {slideLayoutLabels[slide.layout]}
                  </span>
                </div>
                <div
                  className="overflow-hidden rounded-[18px] bg-white"
                  style={{
                    width: SLIDE_WIDTH * deckScale,
                    height: SLIDE_HEIGHT * deckScale,
                  }}
                >
                  <SlideRenderer
                    slide={slide}
                    template={template}
                    scale={deckScale}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );

  const rightSidebar = workspaceActive && (
    <aside className="hidden w-[372px] flex-shrink-0 border-l border-black/6 bg-white/82 p-5 xl:block">
      <div className="flex h-full flex-col gap-5">
        <section className="rounded-[28px] border border-black/8 bg-[#fbfaf6] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
            <Bot className="h-4 w-4" />
            Помощник этой презентации
          </div>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Просите сократить текст, добавить слайд, усилить аргументацию,
            поменять тон или перестроить структуру.
          </p>
        </section>

        {currentSlide && (
          <section className="rounded-[28px] border border-black/8 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
              Выбранный слайд
            </div>
            <h3 className="mt-2 text-base font-semibold leading-snug text-neutral-950">
              {currentSlide.content.heading || `Слайд ${currentSlideIndex + 1}`}
            </h3>
            {currentSlide.notes && (
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                {currentSlide.notes}
              </p>
            )}
          </section>
        )}

        <section className="min-h-0 flex-1 rounded-[32px] border border-black/8 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
              <MessageSquareText className="h-4 w-4" />
              Диалог
            </div>
            {chatBusy && (
              <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Думаю
              </div>
            )}
          </div>

          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {chatMessages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}
            </div>

            <div className="mt-4 space-y-3 border-t border-black/6 pt-4">
              <div className="flex flex-wrap gap-2">
                {CHAT_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void runChatAction(suggestion)}
                    disabled={!hasSlides || chatBusy || isGenerating}
                    className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-600 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="rounded-[24px] border border-black/8 bg-[#fbfaf6] p-3">
                <textarea
                  value={chatInput}
                  rows={3}
                  placeholder="Например: добавь слайд с кейсом, сделай подачу строже и сократи заголовки."
                  onChange={(event) => setChatInput(event.target.value)}
                  className="w-full resize-none bg-transparent text-sm leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-400"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-neutral-400">
                    Чат работает внутри этой презентации.
                  </span>
                  <button
                    type="button"
                    onClick={() => void submitChat()}
                    disabled={!hasSlides || chatBusy || isGenerating || !chatInput.trim()}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <SendHorizonal className="h-4 w-4" />
                    Отправить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {currentSlide && (
          <section className="rounded-[32px] border border-black/8 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-900">
              <RefreshCw className="h-4 w-4" />
              Пересобрать слайд
            </div>
            <div className="grid gap-2">
              {SLIDE_REBUILD_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void rebuildCurrentSlide(item.id)}
                  disabled={regeneratingIntent !== null || isGenerating}
                  className={`rounded-[22px] border px-4 py-3 text-left transition ${
                    regeneratingIntent === item.id
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-black/8 bg-[#fbfaf6] text-neutral-700 hover:border-black/16"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <div className="text-sm font-medium">
                    {regenerationIntentLabels[item.id]}
                  </div>
                  <div
                    className={`mt-1 text-xs leading-relaxed ${
                      regeneratingIntent === item.id
                        ? "text-white/72"
                        : "text-neutral-500"
                    }`}
                  >
                    {item.description}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-[24px] border border-dashed border-black/10 bg-[#fbfaf6] p-3">
              <div className="mb-2 text-sm font-medium text-neutral-900">
                Своё указание
              </div>
              <textarea
                value={customSlideInstruction}
                rows={3}
                onChange={(event) => setCustomSlideInstruction(event.target.value)}
                placeholder="Например: сделай этот слайд похожим на короткий визуальный итог с акцентом на две цифры."
                className="w-full resize-none bg-transparent text-sm leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={() => void rebuildCurrentSlide("custom")}
                disabled={
                  regeneratingIntent !== null ||
                  isGenerating ||
                  !customSlideInstruction.trim()
                }
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Sparkles className="h-4 w-4" />
                Пересобрать по указанию
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={removeSelectedSlide}
                disabled={!presentation || presentation.slides.length <= 1}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Удалить слайд
              </button>
            </div>
          </section>
        )}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f7f1e7] text-neutral-950">
      <header className="sticky top-0 z-20 border-b border-black/6 bg-[#f8f2e8]/88 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-950 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[15px] font-semibold tracking-tight text-neutral-950">
                SlideForge
              </div>
              <div className="text-xs text-neutral-500">
                Русскоязычный черновик презентации с ИИ
              </div>
            </div>
          </div>

          <div className="hidden h-6 w-px bg-black/8 md:block" />

          {workspaceActive && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-neutral-500">
                {presentation?.title || topic || "Новая презентация"}
              </div>
            </div>
          )}

          {!workspaceActive && <div className="flex-1" />}

          <div className="flex items-center gap-2">
            <Link
              href="/demo"
              className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Примеры
            </Link>
            {workspaceActive && (
              <button
                type="button"
                onClick={resetToStart}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                <FilePlus2 className="h-4 w-4" />
                Новая
              </button>
            )}
            {hasSlides && presentation && (
              <button
                type="button"
                onClick={() =>
                  void exportToPptx(presentation, getTemplate(presentation.templateId))
                }
                className="inline-flex h-10 items-center gap-2 rounded-full bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                <Download className="h-4 w-4" />
                Экспорт в PPTX
              </button>
            )}
          </div>
        </div>
      </header>

      {!workspaceActive && landingView}

      {workspaceActive && (
        <div className="flex h-[calc(100vh-73px)] overflow-hidden">
          {leftSidebar}
          {centerStage}
          {rightSidebar}
        </div>
      )}
    </div>
  );
}
