"use client";

import { useEffect, useState, useTransition } from "react";
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
  EXAMPLE_PROMPTS,
  SCREEN_FLOW,
} from "@/lib/demo-generator";
import type {
  PresentationDraft,
  PrototypeScreen,
} from "@/lib/presentation-types";
import { SlideCanvas, SlideThumbnail } from "@/components/slide-canvas";

const screenOrder: PrototypeScreen[] = [
  "start",
  "understanding",
  "outline",
  "building",
  "editor",
];

export function PresentationPrototype() {
  const [prompt, setPrompt] = useState("");
  const [screen, setScreen] = useState<PrototypeScreen>("start");
  const [draft, setDraft] = useState<PresentationDraft | null>(null);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [buildStageIndex, setBuildStageIndex] = useState(0);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [isTransitionPending, startTransition] = useTransition();

  const activeSlide =
    draft?.slides.find((slide) => slide.id === selectedSlideId) ??
    draft?.slides[0] ??
    null;

  const canReset = prompt.trim().length > 0 || draft !== null || screen !== "start";

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
      setPromptError(
        "Опишите, что произошло за период и что нужно показать руководителю."
      );
      return;
    }

    const nextDraft = buildPresentationDraft(prompt);
    setDraft(nextDraft);
    setSelectedSlideId(nextDraft.slides[0]?.id ?? null);
    setBuildStageIndex(0);
    setPromptError(null);
    setScreen("understanding");
  }

  function goBack() {
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
    setDraft(null);
    setSelectedSlideId(null);
    setBuildStageIndex(0);
    setPromptError(null);
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
            onChangePrompt={setPrompt}
            onGenerate={buildFromPrompt}
            onUseExample={(value) => {
              setPrompt(value);
              setPromptError(null);
            }}
          />
        ) : null}

        {screen === "understanding" && draft ? (
          <UnderstandingScreen
            draft={draft}
            prompt={prompt}
            onContinue={() => setScreen("outline")}
          />
        ) : null}

        {screen === "outline" && draft ? (
          <OutlineScreen
            draft={draft}
            onContinue={() => setScreen("building")}
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
  onChangePrompt,
  onGenerate,
  onUseExample,
}: {
  prompt: string;
  promptError: string | null;
  onChangePrompt: (value: string) => void;
  onGenerate: () => void;
  onUseExample: (value: string) => void;
}) {
  return (
    <div className="start-shell">
      <section className="stage-card start-card">
        <h1>Соберите квартальный статус команды</h1>
        <p className="start-intro">без длинного брифа и пустого листа</p>

        <textarea
          value={prompt}
          onChange={(event) => onChangePrompt(event.target.value)}
          className="prompt-input"
          placeholder="Опишите, что произошло за квартал и что нужно показать руководителю."
        />

        <div className="start-support">
          <div className="support-label">Примеры запроса</div>
          <div className="example-list">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                className="example-chip"
                onClick={() => onUseExample(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="composer-footer">
          {promptError ? <p className="inline-error">{promptError}</p> : <div />}
          <button type="button" className="primary-button" onClick={onGenerate}>
            Собрать черновик
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}

function UnderstandingScreen({
  draft,
  prompt,
  onContinue,
}: {
  draft: PresentationDraft;
  prompt: string;
  onContinue: () => void;
}) {
  const items = [
    { label: "Период", value: draft.understanding.period },
    { label: "Команда", value: draft.understanding.team },
    { label: "Аудитория", value: draft.understanding.audience },
    { label: "Цель", value: draft.understanding.goal },
    { label: "Тон", value: draft.understanding.tone },
  ];

  return (
    <div className="single-stage-layout">
      <section className="stage-card compact-stage-card">
        <h2>Ваш запрос</h2>
        <blockquote className="prompt-quote">“{prompt}”</blockquote>

        <div className="understanding-summary">
          <div className="support-label">Понял задачу так:</div>
          <ul className="understanding-list">
            {items.map((item) => (
              <li key={item.label}>
                <span>{item.label}:</span> {item.value}
              </li>
            ))}
          </ul>
        </div>

        <div className="stage-actions">
          <button type="button" className="primary-button" onClick={onContinue}>
            Собрать план
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}

function OutlineScreen({
  draft,
  onContinue,
}: {
  draft: PresentationDraft;
  onContinue: () => void;
}) {
  return (
    <div className="single-stage-layout">
      <section className="stage-card compact-stage-card">
        <h2>План презентации</h2>

        <div className="outline-plain-list">
          {draft.outline.map((item) => (
            <article key={item.id} className="outline-plain-item">
              <div className="outline-index">{item.index}</div>
              <h3>{item.title}</h3>
            </article>
          ))}
        </div>

        <div className="stage-actions">
          <button type="button" className="primary-button" onClick={onContinue}>
            Подтвердить и собрать черновик
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
      ? "1 место требует фактуры"
      : `${draft.missingFacts.length} места требуют фактуры`;

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
