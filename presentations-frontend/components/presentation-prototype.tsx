"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  buildPresentationDraft,
  buildWorkingDraft,
  regenerateSlide,
  runFitPassOnDraft,
} from "@/lib/demo-generator";
import {
  beginClarification,
  continueClarification,
} from "@/lib/clarification-flow";
import type {
  ClarificationSession,
  ColorId,
  EditorDrawerState,
  EntryPhase,
  HiddenBuildStage,
  PresentationDraft,
  PrototypeScreen,
  StorylineModeId,
  TemplateId,
} from "@/lib/presentation-types";
import { EditorScreen } from "@/components/prototype/editor-screen";
import { MiniClarificationChat } from "@/components/prototype/mini-clarification-chat";
import { StartScreen } from "@/components/prototype/start-screen";

const DEFAULT_TEMPLATE: TemplateId = "strict";
const DEFAULT_COLOR: ColorId = "cobalt";

export function PresentationPrototype() {
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [screen, setScreen] = useState<PrototypeScreen>("start");
  const [entryPhase, setEntryPhase] = useState<EntryPhase>("idle");
  const [hiddenBuildStage, setHiddenBuildStage] =
    useState<HiddenBuildStage>("idle");
  const [session, setSession] = useState<ClarificationSession | null>(null);
  const [chatReply, setChatReply] = useState("");
  const [draft, setDraft] = useState<PresentationDraft | null>(null);
  const [selectedSlideId, setSelectedSlideId] =
    useState<PresentationDraft["slides"][number]["id"] | null>(null);
  const [drawerState, setDrawerState] =
    useState<EditorDrawerState>("closed");
  const [templateId, setTemplateId] = useState<TemplateId>(DEFAULT_TEMPLATE);
  const [colorId, setColorId] = useState<ColorId>(DEFAULT_COLOR);
  const [, startTransition] = useTransition();
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

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

  const finishHiddenBuild = useEffectEvent(() => {
    if (!session) {
      setHiddenBuildStage("idle");
      setEntryPhase("idle");
      return;
    }

    const nextWorkingDraft = buildWorkingDraft(prompt, session);
    const nextDraft = runFitPassOnDraft(buildPresentationDraft(nextWorkingDraft));

    setDraft(nextDraft);
    setSelectedSlideId(nextDraft.slides[0]?.id ?? null);
    setDrawerState("closed");
    setHiddenBuildStage("idle");
    setEntryPhase("idle");

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

  function resetEntryFlow(nextPrompt?: string) {
    if (typeof nextPrompt === "string") {
      setPrompt(nextPrompt);
    }

    setPromptError(null);
    setEntryPhase("idle");
    setHiddenBuildStage("idle");
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

  function handleSubmitReply() {
    if (!session || !chatReply.trim()) {
      return;
    }

    setSession(continueClarification(session, chatReply));
    setChatReply("");
  }

  function startBuild() {
    if (!session?.readyToBuild) {
      return;
    }

    setEntryPhase("building");
    setHiddenBuildStage("fit-pass");
  }

  function resetFlow() {
    setPrompt("");
    setPromptError(null);
    setScreen("start");
    setEntryPhase("idle");
    setHiddenBuildStage("idle");
    setSession(null);
    setChatReply("");
    setDraft(null);
    setSelectedSlideId(null);
    setDrawerState("closed");
    setTemplateId(DEFAULT_TEMPLATE);
    setColorId(DEFAULT_COLOR);
  }

  function regenerateActiveSlide(variant: StorylineModeId) {
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
          <span className="brand-mark" aria-hidden="true">
            В
          </span>
          <span className="brand-name">Внятно</span>
        </div>

        <div className="topbar-actions">
          {screen === "editor" ? (
            <button type="button" className="ghost-button" onClick={resetFlow}>
              Новый запрос
            </button>
          ) : null}
        </div>
      </header>

      {screen === "start" ? (
        <StartScreen
          prompt={prompt}
          promptError={promptError}
          textareaRef={promptInputRef}
          disabled={entryPhase === "building"}
          onChangePrompt={handlePromptChange}
          onUseScenario={handleUseScenario}
          onSubmit={beginClarify}
        >
          {session ? (
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
