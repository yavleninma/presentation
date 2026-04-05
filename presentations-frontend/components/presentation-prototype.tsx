"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
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
  EditorDrawerState,
  EntryPhase,
  HiddenTransformId,
  PresentationDraft,
  PrototypeScreen,
  TemplateId,
} from "../lib/presentation-types";
import { EditorScreen } from "./prototype/editor-screen";
import { MiniClarificationChat } from "./prototype/mini-clarification-chat";
import { StartScreen } from "./prototype/start-screen";

const BUILD_STATUSES = [
  "Собираем черновик",
  "Проверяем читаемость",
] as const;

type BuildStatus = (typeof BUILD_STATUSES)[number];

export function PresentationPrototype() {
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [screen, setScreen] = useState<PrototypeScreen>("start");
  const [entryPhase, setEntryPhase] = useState<EntryPhase>("idle");
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [session, setSession] = useState<ClarificationSession | null>(null);
  const [chatReply, setChatReply] = useState("");
  const [draft, setDraft] = useState<PresentationDraft | null>(null);
  const [selectedSlideId, setSelectedSlideId] =
    useState<PresentationDraft["slides"][number]["id"] | null>(null);
  const [drawerState, setDrawerState] =
    useState<EditorDrawerState>("closed");
  const [, startTransition] = useTransition();
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
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
    setBuildStatus(null);

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
    setEntryPhase("building");
    setBuildStatus(BUILD_STATUSES[0]);

    buildTimerRefs.current = [
      window.setTimeout(() => {
        setBuildStatus(BUILD_STATUSES[1]);
      }, 220),
      window.setTimeout(() => {
        const nextWorkingDraft = buildWorkingDraft(prompt, session);
        const nextDraft = buildPresentationDraft(nextWorkingDraft);

        setDraft(nextDraft);
        setSelectedSlideId(nextDraft.slides[0]?.id ?? null);
        setDrawerState("closed");
        setBuildStatus(null);
        setEntryPhase("idle");
        clearBuildTimers();

        startTransition(() => {
          setScreen("editor");
        });
      }, 440),
    ];
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

  function regenerateActiveSlide(transformId: HiddenTransformId) {
    if (!draft || !selectedSlideId) {
      return;
    }

    setDraft(regenerateSlide(draft, selectedSlideId, transformId));
  }

  const activeSlide =
    draft?.slides.find((slide) => slide.id === selectedSlideId) ??
    draft?.slides[0] ??
    null;

  return (
    <main className="app-shell">
      {screen === "start" ? (
        <>
          <div className="start-logo">
            <span className="start-logo__mark" aria-hidden="true">В</span>
            <span className="start-logo__name">Внятно</span>
          </div>

          <StartScreen
            prompt={prompt}
            promptError={promptError}
            textareaRef={promptInputRef}
            disabled={entryPhase === "building"}
            onChangePrompt={handlePromptChange}
            onUseScenario={handleUseScenario}
            onSubmit={beginClarify}
          >
            {entryPhase === "building" ? (
              <BuildStatusPanel status={buildStatus} />
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
          debugLayerEnabled={debugLayerEnabled}
        />
      ) : null}
    </main>
  );
}

function BuildStatusPanel({ status }: { status: BuildStatus | null }) {
  const activeIndex = status ? BUILD_STATUSES.indexOf(status) : -1;

  return (
    <section className="build-status" aria-live="polite">
      <div className="build-status__steps">
        {BUILD_STATUSES.map((step, index) => (
          <div
            key={step}
            className={`build-status__step${
              index < activeIndex ? " is-done" : index === activeIndex ? " is-active" : ""
            }`}
          >
            <span className="build-status__mark" aria-hidden="true">
              {index < activeIndex ? "✓" : index === activeIndex ? "•" : "·"}
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
