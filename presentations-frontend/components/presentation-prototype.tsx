"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  buildDraftFromSlideTexts,
  buildPresentationDraft,
  buildWorkingDraft,
  regenerateSlide,
  updateDraftAppearance,
} from "../lib/demo-generator";
import {
  beginClarification,
  continueClarification,
} from "../lib/clarification-flow";
import type {
  ClarificationSession,
  ColorThemeId,
  DraftChatMessage,
  EditorDrawerState,
  EntryPhase,
  HiddenTransformId,
  PresentationDraft,
  PrototypeScreen,
  SlideTextEntry,
  TemplateId,
} from "../lib/presentation-types";
import { BrandMark } from "./brand-mark";
import { DraftScreen } from "./prototype/draft-screen";
import { EditorScreen } from "./prototype/editor-screen";
import { MiniClarificationChat } from "./prototype/mini-clarification-chat";
import { StartScreen } from "./prototype/start-screen";

const BUILD_STEPS = [
  "Анализ задачи",
  "Структурирование",
  "Генерация слайдов",
  "Проверка читаемости",
] as const;

const BUILD_SLIDE_LABELS = [
  "Обложка",
  "Проблема",
  "Три шага",
  "Результат",
  "Для кого",
  "CTA",
] as const;

const BUILD_SLIDES_READY_BY_STEP = [2, 4, 5, 6] as const;

const BUILD_STEP_COUNT = BUILD_STEPS.length;

const BUILD_FINISH_MS = 2200;
const BUILD_STEP_DELAYS_MS = [450, 900, 1350] as const;

export function PresentationPrototype() {
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [screen, setScreen] = useState<PrototypeScreen>("start");
  const [entryPhase, setEntryPhase] = useState<EntryPhase>("idle");
  const [buildStepIndex, setBuildStepIndex] = useState<number | null>(null);
  const [session, setSession] = useState<ClarificationSession | null>(null);
  const [chatReply, setChatReply] = useState("");
  const [draft, setDraft] = useState<PresentationDraft | null>(null);
  const [slideTexts, setSlideTexts] = useState<SlideTextEntry[]>([]);
  const [draftMessages, setDraftMessages] = useState<DraftChatMessage[]>([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [selectedSlideId, setSelectedSlideId] =
    useState<PresentationDraft["slides"][number]["id"] | null>(null);
  const [drawerState, setDrawerState] =
    useState<EditorDrawerState>("closed");
  const [, startTransition] = useTransition();
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const buildSessionRef = useRef<ClarificationSession | null>(null);
  const buildTimerRefs = useRef<number[]>([]);
  const debugLayerEnabled = process.env.NEXT_PUBLIC_VNYATNO_DEBUG === "1";

  useEffect(() => {
    if (screen === "start" && entryPhase === "idle") {
      promptInputRef.current?.focus();
    }
  }, [entryPhase, screen]);

  useEffect(() => {
    if (
      screen === "start" &&
      entryPhase === "chat" &&
      session &&
      !session.readyToBuild
    ) {
      chatInputRef.current?.focus();
    }
  }, [entryPhase, screen, session]);

  useEffect(() => {
    return () => {
      clearBuildTimers();
    };
  }, []);

  function clearBuildTimers() {
    for (const timerId of buildTimerRefs.current) {
      window.clearTimeout(timerId);
    }

    buildTimerRefs.current = [];
  }

  function resetEntryFlow(nextPrompt?: string) {
    clearBuildTimers();
    setBuildStepIndex(null);
    buildSessionRef.current = null;

    if (typeof nextPrompt === "string") {
      setPrompt(nextPrompt);
    }

    setPromptError(null);
    setEntryPhase("idle");
    setSession(null);
    setChatReply("");
  }

  function handlePromptChange(value: string) {
    setPrompt(value);
    setPromptError(null);

    if (screen === "start" && entryPhase !== "idle") {
      resetEntryFlow();
      setPrompt(value);
    }
  }

  function handleUseScenario(value: string) {
    resetEntryFlow(value);
    promptInputRef.current?.focus();
  }

  function beginClarify() {
    if (!prompt.trim()) {
      setPromptError("Нужен рабочий запрос.");
      return;
    }

    setPromptError(null);
    setChatReply("");
    setSession(beginClarification(prompt));
    setEntryPhase("chat");
  }

  async function beginDraft() {
    if (!prompt.trim()) {
      setPromptError("Нужен рабочий запрос.");
      return;
    }

    setPromptError(null);
    setSlideTexts([]);
    setDraftMessages([]);
    setDraftLoading(true);
    setScreen("draft");

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate", prompt }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as {
        slides: SlideTextEntry[];
        assistantMessage: string;
      };

      setSlideTexts(data.slides);
      setDraftMessages([{ role: "assistant", text: data.assistantMessage }]);
    } catch {
      setDraftMessages([
        {
          role: "assistant",
          text: "Не удалось сгенерировать слайды. Попробуйте ещё раз.",
        },
      ]);
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleDraftChatSend(userMessage: string) {
    if (!userMessage.trim() || draftLoading) return;

    const userMsg: DraftChatMessage = { role: "user", text: userMessage };
    const nextMessages = [...draftMessages, userMsg];
    setDraftMessages(nextMessages);
    setDraftLoading(true);

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          userMessage,
          history: draftMessages,
          slides: slideTexts,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as {
        slides: SlideTextEntry[];
        assistantMessage: string;
      };

      setSlideTexts(data.slides);
      setDraftMessages([
        ...nextMessages,
        { role: "assistant", text: data.assistantMessage },
      ]);
    } catch {
      setDraftMessages([
        ...nextMessages,
        { role: "assistant", text: "Не удалось обработать запрос. Попробуйте ещё раз." },
      ]);
    } finally {
      setDraftLoading(false);
    }
  }

  function handleUpdateSlideText(
    id: SlideTextEntry["id"],
    field: "title" | "subtitle" | "bullets",
    value: string | string[]
  ) {
    setSlideTexts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  function handleBuildFromDraft() {
    if (slideTexts.length === 0) return;

    const presentationDraft = buildDraftFromSlideTexts(slideTexts, prompt);
    setDraft(presentationDraft);
    setSelectedSlideId(presentationDraft.slides[0]?.id ?? null);
    setDrawerState("closed");

    startTransition(() => {
      setScreen("editor");
    });
  }

  function handleSubmitReply(directValue?: string) {
    const value = directValue ?? chatReply;
    if (!session || !value.trim()) {
      return;
    }

    setSession(continueClarification(session, value));
    setChatReply("");
  }

  function startBuild() {
    if (!session?.readyToBuild) {
      return;
    }

    clearBuildTimers();
    buildSessionRef.current = session;
    setEntryPhase("building");
    setBuildStepIndex(0);

    const timers: number[] = [];
    for (let i = 0; i < BUILD_STEP_DELAYS_MS.length; i++) {
      const nextStep = i + 1;
      timers.push(
        window.setTimeout(() => {
          setBuildStepIndex(nextStep);
        }, BUILD_STEP_DELAYS_MS[i]),
      );
    }

    timers.push(
      window.setTimeout(() => {
        const held = buildSessionRef.current;
        if (!held) {
          return;
        }

        const nextWorkingDraft = buildWorkingDraft(prompt, held);
        const nextDraft = buildPresentationDraft(nextWorkingDraft);

        setDraft(nextDraft);
        setSelectedSlideId(nextDraft.slides[0]?.id ?? null);
        setDrawerState("closed");
        setBuildStepIndex(null);
        setEntryPhase("idle");
        buildSessionRef.current = null;
        clearBuildTimers();

        startTransition(() => {
          setScreen("editor");
        });
      }, BUILD_FINISH_MS),
    );

    buildTimerRefs.current = timers;
  }

  function updateDocumentTitle(value: string) {
    setDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            documentTitle: value,
          }
        : currentDraft
    );
  }

  function updateDraftTemplate(templateId: TemplateId) {
    setDraft((currentDraft) =>
      currentDraft
        ? updateDraftAppearance(currentDraft, { templateId })
        : currentDraft
    );
  }

  function updateDraftColor(colorThemeId: ColorThemeId) {
    setDraft((currentDraft) =>
      currentDraft
        ? updateDraftAppearance(currentDraft, { colorThemeId })
        : currentDraft
    );
  }

  function handleBackToStart() {
    resetEntryFlow("");
    setDraft(null);
    setSlideTexts([]);
    setDraftMessages([]);
    setDraftLoading(false);
    setSelectedSlideId(null);
    setDrawerState("closed");
    setScreen("start");
  }

  function regenerateActiveSlide(transformId: HiddenTransformId) {
    if (!draft || !selectedSlideId) {
      return;
    }

    setDraft(regenerateSlide(draft, selectedSlideId, transformId));
  }

  function updateSlideSpeakerNote(value: string) {
    if (!draft || !selectedSlideId) {
      return;
    }

    setDraft({
      ...draft,
      slideSpeakerNotes: {
        ...draft.slideSpeakerNotes,
        [selectedSlideId]: value,
      },
    });
  }

  const activeSlide =
    draft?.slides.find((slide) => slide.id === selectedSlideId) ??
    draft?.slides[0] ??
    null;

  return (
    <main className={`app-shell${screen === "start" ? " app-shell--start" : ""}`}>
      {screen === "start" ? (
        <>
          <div className="start-logo">
            <BrandMark />
            <span className="start-logo__name">Внятно</span>
          </div>

          <StartScreen
            prompt={prompt}
            promptError={promptError}
            textareaRef={promptInputRef}
            disabled={entryPhase === "building"}
            onChangePrompt={handlePromptChange}
            onUseScenario={handleUseScenario}
            onSubmit={beginDraft}
          >
            {entryPhase === "building" && buildStepIndex !== null ? (
              <div className="chat-card build-status-card">
                <div className="chat-card-header chat-card-header--stacked">
                  <h3 className="chat-card-title">Собираем черновик</h3>
                  <p className="chat-card-subtitle">
                    6 слайдов по структуре запроса
                  </p>
                </div>
                <div className="chat-card-sep" />
                <BuildStatusPanel stepIndex={buildStepIndex} />
              </div>
            ) : session ? (
              <MiniClarificationChat
                session={session}
                reply={chatReply}
                replyRef={chatInputRef}
                phase={entryPhase}
                onChangeReply={setChatReply}
                onSubmitReply={handleSubmitReply}
                onBuild={startBuild}
              />
            ) : null}
          </StartScreen>
        </>
      ) : null}

      {screen === "draft" ? (
        <DraftScreen
          slides={slideTexts}
          messages={draftMessages}
          isLoading={draftLoading}
          onSendMessage={handleDraftChatSend}
          onUpdateSlide={handleUpdateSlideText}
          onBuild={handleBuildFromDraft}
          onBack={handleBackToStart}
        />
      ) : null}

      {screen === "editor" && draft && activeSlide ? (
        <EditorScreen
          draft={draft}
          activeSlideId={selectedSlideId}
          drawerState={drawerState}
          onSelectSlide={setSelectedSlideId}
          onOpenDrawer={() => setDrawerState("open")}
          onCloseDrawer={() => setDrawerState("closed")}
          onSelectTemplate={updateDraftTemplate}
          onSelectColor={updateDraftColor}
          onRegenerateSlide={regenerateActiveSlide}
          onRenameDocument={updateDocumentTitle}
          onBackToStart={handleBackToStart}
          slideSpeakerNote={
            selectedSlideId
              ? (draft.slideSpeakerNotes[selectedSlideId] ?? "")
              : ""
          }
          onSlideSpeakerNoteChange={updateSlideSpeakerNote}
          debugLayerEnabled={debugLayerEnabled}
        />
      ) : null}
    </main>
  );
}

function buildStepRowStatus(
  stepRowIndex: number,
  activeStepIndex: number
): string {
  if (stepRowIndex < activeStepIndex) {
    return "Готово";
  }

  if (stepRowIndex > activeStepIndex) {
    return "";
  }

  if (stepRowIndex === 2) {
    return "Генерируем...";
  }

  return "В работе";
}

function BuildStatusPanel({ stepIndex }: { stepIndex: number }) {
  const progressPct = Math.round(((stepIndex + 1) / BUILD_STEP_COUNT) * 100);
  const slidesReady = BUILD_SLIDES_READY_BY_STEP[stepIndex] ?? 0;

  return (
    <section className="build-status" aria-live="polite">
      <p className="build-status__slides-ready">
        {slidesReady} из 6 слайдов готово
      </p>
      <div
        className="build-status__progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPct}
        aria-label="Прогресс сборки черновика"
      >
        <div className="build-status__progress-track">
          <div
            className="build-status__progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="build-status__steps">
        {BUILD_STEPS.map((step, index) => (
          <div
            key={step}
            className={`build-status__step${
              index < stepIndex
                ? " is-done"
                : index === stepIndex
                  ? " is-active"
                  : ""
            }`}
          >
            <span className="build-status__mark" aria-hidden="true">
              {index < stepIndex ? "✓" : index === stepIndex ? "•" : "·"}
            </span>
            <span className="build-status__step-name">{step}</span>
            <span className="build-status__step-status">
              {buildStepRowStatus(index, stepIndex)}
            </span>
          </div>
        ))}
      </div>

      <div className="build-status__slides-head">Слайды</div>
      <ul className="build-status__slides">
        {BUILD_SLIDE_LABELS.map((label, index) => {
          const done = index < slidesReady;
          const active =
            index === slidesReady &&
            slidesReady < BUILD_SLIDE_LABELS.length;
          return (
            <li
              key={label}
              className={`build-status__slide-row${
                done ? " is-done" : active ? " is-active" : ""
              }`}
            >
              <span className="build-status__slide-num" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="build-status__slide-label">{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
