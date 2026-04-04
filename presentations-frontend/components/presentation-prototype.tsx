"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { ArrowLeft, ArrowRight, FileText, RefreshCcw, X } from "lucide-react";
import {
  buildPresentationDraft,
  buildWorkingDraft,
  CLARIFY_FOCUS_OPTIONS,
  COLOR_OPTIONS,
  EXAMPLE_PROMPTS,
  getClarifyDepthOptions,
  getClarifyQuestion,
  regenerateSlide,
  runFitPassOnDraft,
  SCENARIO_CHIPS,
  TEMPLATE_OPTIONS,
} from "@/lib/demo-generator";
import type {
  ClarifyDepthId,
  ClarifyFocusId,
  ColorId,
  EditorDrawerState,
  HiddenBuildStage,
  PresentationDraft,
  PrototypeScreen,
  TemplateId,
  WorkingDraft,
} from "@/lib/presentation-types";
import { SlideCanvas, SlideThumbnail } from "@/components/slide-canvas";

const DEFAULT_TEMPLATE: TemplateId = "strict";
const DEFAULT_COLOR: ColorId = "cobalt";

export function PresentationPrototype() {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0] ?? "");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [screen, setScreen] = useState<PrototypeScreen>("start");
  const [hiddenBuildStage, setHiddenBuildStage] =
    useState<HiddenBuildStage>("idle");
  const [focusChoice, setFocusChoice] = useState<ClarifyFocusId | null>(null);
  const [depthChoice, setDepthChoice] = useState<ClarifyDepthId | null>(null);
  const [workingDraft, setWorkingDraft] = useState<WorkingDraft | null>(null);
  const [draft, setDraft] = useState<PresentationDraft | null>(null);
  const [selectedSlideId, setSelectedSlideId] =
    useState<PresentationDraft["slides"][number]["id"] | null>(null);
  const [drawerState, setDrawerState] =
    useState<EditorDrawerState>("closed");
  const [templateId, setTemplateId] = useState<TemplateId>(DEFAULT_TEMPLATE);
  const [colorId, setColorId] = useState<ColorId>(DEFAULT_COLOR);
  const [, startTransition] = useTransition();
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (screen === "start") {
      promptInputRef.current?.focus();
    }
  }, [screen]);

  const finishHiddenBuild = useEffectEvent(() => {
    if (!focusChoice || !depthChoice) {
      setHiddenBuildStage("idle");
      return;
    }

    const nextWorkingDraft = buildWorkingDraft(prompt, {
      focus: focusChoice,
      depth: depthChoice,
    });
    const nextDraft = runFitPassOnDraft(
      buildPresentationDraft(nextWorkingDraft, focusChoice)
    );

    setWorkingDraft(nextWorkingDraft);
    setDraft(nextDraft);
    setSelectedSlideId(nextDraft.slides[0]?.id ?? null);
    setDrawerState("closed");
    setHiddenBuildStage("idle");

    startTransition(() => {
      setScreen("editor");
    });
  });

  useEffect(() => {
    if (hiddenBuildStage !== "fit-pass") {
      return;
    }

    const timer = window.setTimeout(() => {
      finishHiddenBuild();
    }, 320);

    return () => {
      window.clearTimeout(timer);
    };
  }, [finishHiddenBuild, hiddenBuildStage]);

  function beginClarify() {
    if (!prompt.trim()) {
      setPromptError("Нужен рабочий запрос.");
      return;
    }

    setPromptError(null);
    setFocusChoice(null);
    setDepthChoice(null);

    startTransition(() => {
      setScreen("clarify");
    });
  }

  function startBuild() {
    if (!focusChoice || !depthChoice) {
      return;
    }

    setHiddenBuildStage("fit-pass");
  }

  function resetFlow() {
    setPrompt(EXAMPLE_PROMPTS[0] ?? "");
    setPromptError(null);
    setScreen("start");
    setHiddenBuildStage("idle");
    setFocusChoice(null);
    setDepthChoice(null);
    setWorkingDraft(null);
    setDraft(null);
    setSelectedSlideId(null);
    setDrawerState("closed");
    setTemplateId(DEFAULT_TEMPLATE);
    setColorId(DEFAULT_COLOR);
  }

  function regenerateActiveSlide(variant: ClarifyFocusId) {
    if (!draft || !selectedSlideId) {
      return;
    }

    setDraft(regenerateSlide(draft, selectedSlideId, variant));
  }

  const activeSlide =
    draft?.slides.find((slide) => slide.id === selectedSlideId) ??
    draft?.slides[0] ??
    null;

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="brand-block">
          <span className="brand-mark">
            <FileText aria-hidden="true" />
          </span>
          <span className="brand-name">Внятно</span>
        </div>

        <div className="topbar-actions">
          {screen === "clarify" ? (
            <button
              type="button"
              className="ghost-button"
              onClick={() => setScreen("start")}
            >
              <ArrowLeft aria-hidden="true" />
              Назад
            </button>
          ) : null}

          {(screen !== "start" || draft || workingDraft) && (
            <button type="button" className="ghost-button" onClick={resetFlow}>
              <RefreshCcw aria-hidden="true" />
              Новый запрос
            </button>
          )}
        </div>
      </header>

      {screen === "start" ? (
        <StartScreen
          prompt={prompt}
          promptError={promptError}
          textareaRef={promptInputRef}
          onChangePrompt={setPrompt}
          onUseScenario={(value) => {
            if (value) {
              setPrompt(value);
            }
            setPromptError(null);
            promptInputRef.current?.focus();
          }}
          onSubmit={beginClarify}
        />
      ) : null}

      {screen === "clarify" ? (
        <ClarifyScreen
          prompt={prompt}
          hiddenBuildStage={hiddenBuildStage}
          focusChoice={focusChoice}
          depthChoice={depthChoice}
          onSelectFocus={(value) => {
            setFocusChoice(value);
            setDepthChoice(null);
          }}
          onSelectDepth={setDepthChoice}
          onSubmit={startBuild}
        />
      ) : null}

      {screen === "editor" && draft && activeSlide ? (
        <EditorScreen
          draft={draft}
          activeSlideId={selectedSlideId}
          drawerState={drawerState}
          templateId={templateId}
          colorId={colorId}
          onSelectSlide={setSelectedSlideId}
          onOpenDrawer={() => setDrawerState("open")}
          onCloseDrawer={() => setDrawerState("closed")}
          onSelectTemplate={setTemplateId}
          onSelectColor={setColorId}
          onRegenerateSlide={regenerateActiveSlide}
        />
      ) : null}
    </main>
  );
}

function StartScreen({
  prompt,
  promptError,
  textareaRef,
  onChangePrompt,
  onUseScenario,
  onSubmit,
}: {
  prompt: string;
  promptError: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChangePrompt: (value: string) => void;
  onUseScenario: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="entry-stage">
      <div className="entry-card">
        <h1>О чём презентация?</h1>
        <p className="entry-sub">
          Напиши как есть. Дальше коротко зафиксируем фокус разговора и сразу
          соберём черновик.
        </p>

        <form
          className="composer-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="composer-box">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(event) => onChangePrompt(event.target.value)}
              rows={6}
              placeholder="Нужно собрать презентацию для руководителя по итогам квартала: что реально сдвинули, где риск, и какое решение нужно сверху."
            />

            <div className="composer-footer">
              <div className="scenario-row">
                {SCENARIO_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className="scenario-chip"
                    onClick={() => onUseScenario(chip.prompt)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <button type="submit" className="primary-button">
                Продолжить
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>

          {promptError ? <p className="inline-error">{promptError}</p> : null}
        </form>
      </div>
    </section>
  );
}

function ClarifyScreen({
  prompt,
  hiddenBuildStage,
  focusChoice,
  depthChoice,
  onSelectFocus,
  onSelectDepth,
  onSubmit,
}: {
  prompt: string;
  hiddenBuildStage: HiddenBuildStage;
  focusChoice: ClarifyFocusId | null;
  depthChoice: ClarifyDepthId | null;
  onSelectFocus: (value: ClarifyFocusId) => void;
  onSelectDepth: (value: ClarifyDepthId) => void;
  onSubmit: () => void;
}) {
  const focusLabel =
    CLARIFY_FOCUS_OPTIONS.find((option) => option.id === focusChoice)?.label ?? "";
  const depthOptions = getClarifyDepthOptions(focusChoice);
  const depthLabel =
    depthOptions.find((option) => option.id === depthChoice)?.label ?? "";
  const canSubmit = Boolean(focusChoice && depthChoice);

  return (
    <section className="chat-stage">
      <div className="chat-card">
        <div className="chat-stream">
          <ChatMessage role="user">{prompt}</ChatMessage>

          <ChatMessage role="assistant">
            <p>Это больше апдейт, объяснение или разговор на решение?</p>
            <div className="choice-row">
              {CLARIFY_FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`choice-chip${
                    focusChoice === option.id ? " is-active" : ""
                  }`}
                  onClick={() => onSelectFocus(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </ChatMessage>

          {focusChoice ? <ChatMessage role="user">{focusLabel}</ChatMessage> : null}

          {focusChoice ? (
            <ChatMessage role="assistant">
              <p>{getClarifyQuestion(focusChoice)}</p>
              <div className="choice-row">
                {depthOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`choice-chip${
                      depthChoice === option.id ? " is-active" : ""
                    }`}
                    onClick={() => onSelectDepth(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </ChatMessage>
          ) : null}

          {depthChoice ? <ChatMessage role="user">{depthLabel}</ChatMessage> : null}
        </div>

        <div className="chat-footer">
          <button
            type="button"
            className="primary-button"
            onClick={onSubmit}
            disabled={!canSubmit || hiddenBuildStage === "fit-pass"}
          >
            {hiddenBuildStage === "fit-pass" ? "Собираю черновик..." : "Собрать черновик"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ChatMessage({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  return (
    <div className={`chat-message is-${role}`}>
      <span className={`chat-avatar is-${role}`}>{role === "user" ? "ТЫ" : "В"}</span>
      <div className={`chat-bubble is-${role}`}>{children}</div>
    </div>
  );
}

function EditorScreen({
  draft,
  activeSlideId,
  drawerState,
  templateId,
  colorId,
  onSelectSlide,
  onOpenDrawer,
  onCloseDrawer,
  onSelectTemplate,
  onSelectColor,
  onRegenerateSlide,
}: {
  draft: PresentationDraft;
  activeSlideId: PresentationDraft["slides"][number]["id"] | null;
  drawerState: EditorDrawerState;
  templateId: TemplateId;
  colorId: ColorId;
  onSelectSlide: (value: PresentationDraft["slides"][number]["id"]) => void;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  onSelectTemplate: (value: TemplateId) => void;
  onSelectColor: (value: ColorId) => void;
  onRegenerateSlide: (variant: ClarifyFocusId) => void;
}) {
  const activeSlide =
    draft.slides.find((slide) => slide.id === activeSlideId) ?? draft.slides[0];

  return (
    <section className="editor-stage">
      <div className="editor-shell">
        <aside className="editor-rail">
          <div className="rail-title">Структура</div>
          <div className="rail-list">
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

        <section className="editor-main">
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <span>Шаблон</span>
              <div className="segmented">
                {TEMPLATE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`seg${templateId === option.id ? " is-active" : ""}`}
                    onClick={() => onSelectTemplate(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="toolbar-group">
              <span>Цвет</span>
              <div className="segmented">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`seg${colorId === option.id ? " is-active" : ""}`}
                    onClick={() => onSelectColor(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="canvas-wrap">
            <SlideCanvas
              slide={activeSlide}
              templateId={templateId}
              colorId={colorId}
            />
          </div>
        </section>

        {drawerState === "open" ? (
          <aside className="editor-drawer">
            <div className="drawer-head">
              <h2>Пересобрать слайд</h2>
              <button type="button" className="icon-button" onClick={onCloseDrawer}>
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="drawer-actions">
              {CLARIFY_FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`regen-button${
                    draft.activeVariant === option.id ? " is-active" : ""
                  }`}
                  onClick={() => onRegenerateSlide(option.id)}
                >
                  {option.id === "update" ? "Сделать как апдейт" : null}
                  {option.id === "explain" ? "Сделать как объяснение" : null}
                  {option.id === "decision" ? "Сделать под решение" : null}
                </button>
              ))}
            </div>
          </aside>
        ) : (
          <button type="button" className="drawer-trigger" onClick={onOpenDrawer}>
            Пересобрать слайд
          </button>
        )}
      </div>
    </section>
  );
}
