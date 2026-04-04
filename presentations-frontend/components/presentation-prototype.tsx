"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import {
  buildPresentationDraft,
  buildWorkingDraft,
  EXAMPLE_PROMPTS,
  SCREEN_FLOW,
} from "@/lib/demo-generator";
import type {
  PresentationDraft,
  PrototypeScreen,
  WorkingDraft,
} from "@/lib/presentation-types";
import { SlideCanvas, SlideThumbnail } from "@/components/slide-canvas";

const AUTO_ADVANCE_MS = 1350;

const screenOrder: PrototypeScreen[] = [
  "start",
  "understanding",
  "outline",
  "building",
  "editor",
];

const START_EXAMPLES = [
  {
    id: "backend-platform",
    title: "Backend platform",
    prompt:
      EXAMPLE_PROMPTS[0] ??
      "Собери квартальный статус backend platform team за Q1 2026: снизили MTTR, мигрировали 18 сервисов и упёрлись в найм QA.",
  },
  {
    id: "product-team",
    title: "Команда продукта",
    prompt:
      EXAMPLE_PROMPTS[1] ??
      "Нужен квартальный статус команды продукта за 1 квартал 2026 для CTO: что сделали, где риски и какое решение нужно сверху.",
  },
  {
    id: "director-review",
    title: "Руководитель направления",
    prompt:
      EXAMPLE_PROMPTS[2] ??
      "Подготовь рабочую презентацию по итогам квартала для руководителя направления: прогресс, блокеры и следующий шаг.",
  },
] as const;

const START_PREVIEW_SLIDES = [
  {
    id: "cover",
    index: "01",
    eyebrow: "Обложка",
    title: "Статус за Q1 2026",
    subtitle: "Период, аудитория и главный фокус разговора.",
    tags: ["Период", "Аудитория", "Фокус"],
  },
  {
    id: "summary",
    index: "02",
    eyebrow: "Главный вывод",
    title: "Один вывод периода и одно решение",
    subtitle: "Короткий тезис, опоры и точка решения.",
    tags: ["Главный тезис", "Опоры", "Решение"],
  },
  {
    id: "metrics",
    index: "03",
    eyebrow: "Ключевые метрики",
    title: "Цифры, по которым видно прогресс",
    subtitle: "Только те метрики, которые помогают быстро понять статус.",
    tags: ["Результат", "Скорость", "Риск"],
  },
] as const;

export function PresentationPrototype() {
  const [prompt, setPrompt] = useState("");
  const [screen, setScreen] = useState<PrototypeScreen>("start");
  const [workingDraft, setWorkingDraft] = useState<WorkingDraft | null>(null);
  const [draft, setDraft] = useState<PresentationDraft | null>(null);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [buildStageIndex, setBuildStageIndex] = useState(0);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [autoAdvanceReview, setAutoAdvanceReview] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);

  const activeSlide =
    draft?.slides.find((slide) => slide.id === selectedSlideId) ??
    draft?.slides[0] ??
    null;

  const canReset =
    prompt.trim().length > 0 ||
    workingDraft !== null ||
    draft !== null ||
    screen !== "start";

  useEffect(() => {
    if (screen === "start" && prompt.trim()) {
      promptInputRef.current?.focus();
    }
  }, [prompt, screen]);

  const beginBuilding = useEffectEvent(() => {
    if (!workingDraft) {
      return;
    }

    const nextDraft = buildPresentationDraft(workingDraft);
    setDraft(nextDraft);
    setSelectedSlideId(nextDraft.slides[0]?.id ?? null);
    setBuildStageIndex(0);
    setScreen("building");
  });

  useEffect(() => {
    if (!workingDraft || !autoAdvanceReview) {
      return;
    }

    if (screen !== "understanding" && screen !== "outline") {
      return;
    }

    const timer = window.setTimeout(() => {
      if (screen === "understanding") {
        startTransition(() => {
          setScreen("outline");
        });
        return;
      }

      setAutoAdvanceReview(false);
      startTransition(() => {
        beginBuilding();
      });
    }, AUTO_ADVANCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoAdvanceReview, beginBuilding, screen, startTransition, workingDraft]);

  useEffect(() => {
    if (screen !== "building" || !draft) {
      return;
    }

    setBuildStageIndex(0);

    const timers: number[] = draft.buildStages.map((_, index) =>
      window.setTimeout(() => {
        setBuildStageIndex(index);
      }, 260 + index * 820)
    );

    const finalTimer = window.setTimeout(() => {
      startTransition(() => {
        setScreen("editor");
        setSelectedSlideId(draft.slides[0]?.id ?? null);
      });
    }, 260 + draft.buildStages.length * 820);

    timers.push(finalTimer);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [draft, screen, startTransition]);

  function buildFromPrompt() {
    if (!prompt.trim()) {
      setPromptError("Нужен рабочий запрос, иначе не из чего собрать первый черновик.");
      return;
    }

    const nextWorkingDraft = buildWorkingDraft(prompt);
    setWorkingDraft(nextWorkingDraft);
    setDraft(null);
    setSelectedSlideId(null);
    setBuildStageIndex(0);
    setPromptError(null);
    setAutoAdvanceReview(true);
    setScreen("understanding");
  }

  function continueFromReview() {
    setAutoAdvanceReview(false);
    startTransition(() => {
      beginBuilding();
    });
  }

  function editUnderstanding() {
    setAutoAdvanceReview(false);
    setDraft(null);
    setSelectedSlideId(null);
    setBuildStageIndex(0);
    setPromptError(null);
    setScreen("start");
  }

  function goBack() {
    setAutoAdvanceReview(false);

    const previousScreen: Record<PrototypeScreen, PrototypeScreen> = {
      start: "start",
      understanding: "start",
      outline: "understanding",
      building: "outline",
      editor: "outline",
    };

    setScreen(previousScreen[screen]);
  }

  function resetFlow() {
    setPrompt("");
    setWorkingDraft(null);
    setDraft(null);
    setSelectedSlideId(null);
    setBuildStageIndex(0);
    setPromptError(null);
    setAutoAdvanceReview(false);
    setScreen("start");
  }

  return (
    <main className="app-shell">
      <div className="app-backdrop" />

      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">
            <FileText aria-hidden="true" />
          </div>
          <div>
            <div className="brand-title">Рабочая презентация</div>
            <div className="brand-subtitle">Квартальный статус команды</div>
          </div>
        </div>

        <div className="header-actions">
          {screen !== "start" ? (
            <button type="button" className="ghost-button" onClick={goBack}>
              <ArrowLeft aria-hidden="true" />
              Назад
            </button>
          ) : null}

          {canReset ? (
            <button type="button" className="ghost-button" onClick={resetFlow}>
              <RefreshCcw aria-hidden="true" />
              Новый запрос
            </button>
          ) : null}
        </div>
      </header>

      <StepRail currentScreen={screen} />

      <section className="content-shell">
        {screen === "start" ? (
          <StartScreen
            prompt={prompt}
            promptError={promptError}
            textareaRef={promptInputRef}
            onChangePrompt={setPrompt}
            onGenerate={buildFromPrompt}
            onUseExample={(value) => {
              setPrompt(value);
              setPromptError(null);
            }}
          />
        ) : null}

        {(screen === "understanding" || screen === "outline") && workingDraft ? (
          <WorkingDraftScreen
            phase={screen}
            prompt={prompt}
            workingDraft={workingDraft}
            onEditUnderstanding={editUnderstanding}
            onContinue={continueFromReview}
          />
        ) : null}

        {screen === "building" && draft ? (
          <BuildingScreen
            draft={draft}
            stageIndex={buildStageIndex}
            isTransitionPending={isTransitionPending}
          />
        ) : null}

        {screen === "editor" && draft && activeSlide ? (
          <EditorScreen
            draft={draft}
            activeSlideId={selectedSlideId}
            onSelectSlide={setSelectedSlideId}
          />
        ) : null}
      </section>
    </main>
  );
}

function StepRail({ currentScreen }: { currentScreen: PrototypeScreen }) {
  const currentIndex = screenOrder.indexOf(currentScreen);

  if (currentScreen === "start") {
    const [activeStep, ...upcomingSteps] = SCREEN_FLOW;

    return (
      <nav className="step-rail step-rail-start" aria-label="Этапы сборки">
        <div className="step-focus-chip">
          <div className="step-chip-icon">01</div>
          <div className="step-chip-title">{activeStep.title}</div>
        </div>

        <div className="step-progress-rail">
          {upcomingSteps.map((item) => (
            <div key={item.id} className="step-mini-chip">
              {item.title}
            </div>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="step-rail" aria-label="Этапы сборки">
      {SCREEN_FLOW.map((item, index) => {
        const state =
          index < currentIndex
            ? "done"
            : index === currentIndex
              ? "active"
              : "idle";

        return (
          <div key={item.id} className={`step-chip is-${state}`}>
            <div className="step-chip-icon">
              {state === "done" ? <Check aria-hidden="true" /> : index + 1}
            </div>
            <div className="step-chip-title">{item.title}</div>
          </div>
        );
      })}
    </nav>
  );
}

function StartScreen({
  prompt,
  promptError,
  textareaRef,
  onChangePrompt,
  onGenerate,
  onUseExample,
}: {
  prompt: string;
  promptError: string | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChangePrompt: (value: string) => void;
  onGenerate: () => void;
  onUseExample: (value: string) => void;
}) {
  const trimmedPrompt = prompt.trim();

  return (
    <div className="start-shell">
      <div className="start-workspace">
        <div className="start-main-column">
          <section className="stage-card start-intro-block">
            <h1>Соберите рабочий квартальный статус</h1>
            <p className="start-intro">
              Напишите как есть. Сначала покажем понимание и план, потом соберём
              первый черновик слайдов.
            </p>
          </section>

          <section className="stage-card composer-panel">
            <form
              className="composer-form"
              onSubmit={(event) => {
                event.preventDefault();
                onGenerate();
              }}
            >
              <div className="composer-box">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(event) => onChangePrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      onGenerate();
                    }
                  }}
                  rows={5}
                  className="prompt-input"
                  placeholder="Напишите, что произошло за квартал, где прогресс, какие риски и какое решение нужно сейчас."
                />

                <div className="composer-box-footer">
                  <p className="composer-helper">
                    5-7 слайдов • сначала проверим понимание, потом покажем план
                  </p>
                  <button type="submit" className="primary-button composer-submit">
                    Собрать рабочий черновик
                    <ArrowRight aria-hidden="true" />
                  </button>
                </div>
              </div>

              {promptError ? <p className="inline-error">{promptError}</p> : null}
            </form>
          </section>

          <section className="stage-card start-examples-panel">
            <div className="support-label">Примеры</div>
            <div className="example-card-grid">
              {START_EXAMPLES.map((example) => (
                <button
                  key={example.id}
                  type="button"
                  className={`example-card${
                    trimmedPrompt === example.prompt ? " is-selected" : ""
                  }`}
                  onClick={() => onUseExample(example.prompt)}
                >
                  <span className="example-card-title">{example.title}</span>
                  <span className="example-card-copy">{example.prompt}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="stage-card start-preview-rail">
          <div className="preview-rail-head">
            <h2>Что получится</h2>
          </div>

          <div className="preview-slide-list">
            {START_PREVIEW_SLIDES.map((slide) => (
              <article key={slide.id} className="preview-slide-card">
                <div className="preview-slide-topline">
                  <span className="preview-slide-index">{slide.index}</span>
                  <span className="preview-slide-eyebrow">{slide.eyebrow}</span>
                </div>
                <h3>{slide.title}</h3>
                <p>{slide.subtitle}</p>

                <div className="preview-slide-tags">
                  {slide.tags.map((tag) => (
                    <span key={tag} className="preview-slide-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function WorkingDraftScreen({
  phase,
  prompt,
  workingDraft,
  onEditUnderstanding,
  onContinue,
}: {
  phase: Extract<PrototypeScreen, "understanding" | "outline">;
  prompt: string;
  workingDraft: WorkingDraft;
  onEditUnderstanding: () => void;
  onContinue: () => void;
}) {
  const chips = [
    { label: "Аудитория", value: workingDraft.audience },
    { label: "Период", value: workingDraft.period },
    { label: "Цель", value: workingDraft.goal },
    workingDraft.decisionNeeded
      ? { label: "Решение", value: workingDraft.decisionNeeded }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="single-stage-layout">
      <section
        className={`stage-card compact-stage-card review-stage-card is-${phase}-phase`}
      >
        <div className="review-stage-head">
          <div>
            <div className="support-label">
              {phase === "understanding" ? "Понимание" : "План"}
            </div>
            <h2>Понимание и план</h2>
          </div>

          <blockquote className="prompt-quote">“{prompt}”</blockquote>
        </div>

        <article className="understanding-focus-card">
          <div className="support-label">Понял задачу так</div>
          <p className="working-core-message">{workingDraft.coreMessage}</p>

          <div className="working-chip-row">
            {chips.map((item) => (
              <div key={item.label} className="working-chip">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <section className="working-outline-section">
          <div className="support-label">План презентации</div>

          <div className="working-outline-grid">
            {workingDraft.outline.map((item, index) => (
              <article key={item.id} className="outline-card">
                <div className="working-outline-head">
                  <div className="outline-index">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.purpose}</p>
                  </div>
                </div>

                <ul>
                  {item.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {workingDraft.openQuestions.length ? (
          <section className="working-open-questions">
            <div className="support-label">Нужно уточнить</div>
            <div className="missing-facts-row">
              {workingDraft.openQuestions.map((question) => (
                <span key={question} className="missing-fact-chip">
                  {question}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div className="stage-actions">
          <button type="button" className="ghost-button" onClick={onEditUnderstanding}>
            Поправить понимание
          </button>

          <button type="button" className="primary-button" onClick={onContinue}>
            Продолжить сборку
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}

function BuildingScreen({
  draft,
  stageIndex,
  isTransitionPending,
}: {
  draft: PresentationDraft;
  stageIndex: number;
  isTransitionPending: boolean;
}) {
  const previewSlide = draft.slides[Math.min(stageIndex, draft.slides.length - 1)];

  return (
    <div className="build-layout">
      <section className="stage-card compact-stage-card">
        <h2>Собираю черновик</h2>

        <div className="build-list">
          {draft.buildStages.map((item, index) => {
            const state =
              index < stageIndex
                ? "done"
                : index === stageIndex
                  ? "active"
                  : "idle";

            return (
              <article key={item.id} className={`build-card is-${state}`}>
                <div className="build-card-icon">
                  {state === "done" ? (
                    <Check aria-hidden="true" />
                  ) : state === "active" ? (
                    <Loader2 aria-hidden="true" className="spin-icon" />
                  ) : (
                    index + 1
                  )}
                </div>
                <h3>{item.title}</h3>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="build-preview">
        <div className="build-preview-head">
          <span>Мини-превью</span>
          <strong>{previewSlide.shortLabel}</strong>
        </div>
        <div className="build-preview-card">
          <div className="build-preview-eyebrow">{previewSlide.eyebrow}</div>
          <div className="build-preview-title">{previewSlide.title}</div>
          <div className="build-preview-copy">{previewSlide.lead}</div>
        </div>
        {isTransitionPending ? (
          <div className="build-preview-note">Открываю черновик.</div>
        ) : null}
      </aside>
    </div>
  );
}

function EditorScreen({
  draft,
  activeSlideId,
  onSelectSlide,
}: {
  draft: PresentationDraft;
  activeSlideId: string | null;
  onSelectSlide: (value: string) => void;
}) {
  const activeSlide =
    draft.slides.find((slide) => slide.id === activeSlideId) ?? draft.slides[0];
  const factLabel =
    draft.missingFacts.length === 1
      ? "1 место требует уточнения"
      : `${draft.missingFacts.length} места требуют уточнения`;

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <div>
          <h2>{draft.documentTitle}</h2>
          <p>{draft.documentSubtitle}</p>
        </div>

        <div className="editor-header-meta">
          <span>{draft.slides.length} слайдов</span>
          {draft.missingFacts.length ? <span>{factLabel}</span> : null}
        </div>
      </header>

      <div className="editor-grid">
        <aside className="thumbnail-rail-wrap">
          <div className="thumbnail-rail-head">Слайды</div>
          <div className="thumbnail-rail">
            {draft.slides.map((slide) => (
              <SlideThumbnail
                key={slide.id}
                slide={slide}
                active={slide.id === activeSlide.id}
                onClick={() => onSelectSlide(slide.id)}
              />
            ))}
          </div>
        </aside>

        <section className="canvas-stage">
          <div className="canvas-frame">
            <SlideCanvas slide={activeSlide} />
          </div>
        </section>
      </div>
    </div>
  );
}
