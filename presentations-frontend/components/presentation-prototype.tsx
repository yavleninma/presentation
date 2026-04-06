"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { readDraftApiErrorMessage } from "../lib/draft-api";
import { buildDraftFromSlideTexts } from "../lib/draft-from-slide-texts";
import { syncSessionWithSlideTexts } from "../lib/draft-session";
import type {
  ColorThemeId,
  DraftSession,
  EditorDrawerState,
  HiddenTransformId,
  PresentationDraft,
  PrototypeScreen,
  SlideTextEntry,
  TemplateId,
} from "../lib/presentation-types";
import { regenerateSlide, updateDraftAppearance } from "../lib/demo-generator";
import { BrandMark, BrandWordmark } from "./brand-mark";
import { BuildingScreen } from "./prototype/building-screen";
import { ClarifyScreen } from "./prototype/clarify-screen";
import { DraftScreen } from "./prototype/draft-screen";
import { EditorScreen } from "./prototype/editor-screen";
import { StartScreen } from "./prototype/start-screen";

type PendingMode = "clarify" | "generate" | "revise" | null;

export function PresentationPrototype() {
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [clarifyError, setClarifyError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [screen, setScreen] = useState<PrototypeScreen>("start");
  const [session, setSession] = useState<DraftSession | null>(null);
  const [draft, setDraft] = useState<PresentationDraft | null>(null);
  const [pendingMode, setPendingMode] = useState<PendingMode>(null);
  const [selectedSlideId, setSelectedSlideId] =
    useState<PresentationDraft["slides"][number]["id"] | null>(null);
  const [drawerState, setDrawerState] = useState<EditorDrawerState>("closed");
  const [, startTransition] = useTransition();
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const debugLayerEnabled = process.env.NEXT_PUBLIC_VNYATNO_DEBUG === "1";

  useEffect(() => {
    if (screen === "start") {
      promptInputRef.current?.focus();
    }
  }, [screen]);

  function handlePromptChange(value: string) {
    setPrompt(value);
    setPromptError(null);
  }

  function handleUseScenario(value: string) {
    setPrompt(value);
    setPromptError(null);
    promptInputRef.current?.focus();
  }

  async function beginClarify() {
    const nextPrompt = prompt.trim();
    if (!nextPrompt) {
      setPromptError("Нужен рабочий запрос.");
      return;
    }

    setPromptError(null);
    setClarifyError(null);
    setDraftError(null);
    setPendingMode("clarify");

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "clarify", prompt: nextPrompt }),
      });
      const payload = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        throw new Error(
          readDraftApiErrorMessage(payload) ??
            `Не удалось начать уточнение (HTTP ${res.status}).`,
        );
      }

      setSession(payload as DraftSession);
      setScreen("clarify");
    } catch (error) {
      setPromptError(
        error instanceof Error
          ? error.message
          : "Не удалось начать уточнение. Попробуйте ещё раз.",
      );
    } finally {
      setPendingMode(null);
    }
  }

  async function handleClarifySend(userMessage: string) {
    if (!session || pendingMode) {
      return false;
    }

    const nextMessage = userMessage.trim();
    if (!nextMessage) {
      return false;
    }

    const currentSession = session;
    setClarifyError(null);
    setPendingMode("clarify");

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "clarify",
          session: currentSession,
          userMessage: nextMessage,
        }),
      });
      const payload = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        throw new Error(
          readDraftApiErrorMessage(payload) ??
            `Не удалось уточнить запрос (HTTP ${res.status}).`,
        );
      }

      setSession(payload as DraftSession);
      return true;
    } catch (error) {
      setSession(currentSession);
      setClarifyError(
        error instanceof Error
          ? error.message
          : "Не удалось уточнить запрос. Попробуйте ещё раз.",
      );
      return false;
    } finally {
      setPendingMode(null);
    }
  }

  async function handleGenerateFromClarify() {
    if (!session || pendingMode) {
      return;
    }

    const currentSession = session;
    setClarifyError(null);
    setScreen("building");
    setPendingMode("generate");

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "generate",
          session: currentSession,
        }),
      });
      const payload = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        throw new Error(
          readDraftApiErrorMessage(payload) ??
            `Не удалось собрать черновик (HTTP ${res.status}).`,
        );
      }

      setSession(payload as DraftSession);
      setDraftError(null);
      setScreen("draft");
    } catch (error) {
      setSession(currentSession);
      setClarifyError(
        error instanceof Error
          ? error.message
          : "Не удалось собрать черновик. Попробуйте ещё раз.",
      );
      setScreen("clarify");
    } finally {
      setPendingMode(null);
    }
  }

  async function handleDraftChatSend(userMessage: string) {
    if (!session || pendingMode) {
      return false;
    }

    const nextMessage = userMessage.trim();
    if (!nextMessage) {
      return false;
    }

    const currentSession = session;
    setDraftError(null);
    setPendingMode("revise");

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "revise",
          session: currentSession,
          userMessage: nextMessage,
        }),
      });

      const payload = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        throw new Error(
          readDraftApiErrorMessage(payload) ??
            `Не удалось обработать сообщение (HTTP ${res.status}).`,
        );
      }

      setSession(payload as DraftSession);
      return true;
    } catch (error) {
      setSession(currentSession);
      setDraftError(
        error instanceof Error
          ? error.message
          : "Не удалось обработать запрос. Попробуйте ещё раз.",
      );
      return false;
    } finally {
      setPendingMode(null);
    }
  }

  function handleUpdateSlideText(
    id: SlideTextEntry["id"],
    field: "title" | "subtitle" | "bullets",
    value: string | string[],
  ) {
    setDraftError(null);
    setSession((currentSession) =>
      currentSession
        ? syncSessionWithSlideTexts(currentSession, currentSession.slideTexts.map((slide) =>
            slide.id === id ? { ...slide, [field]: value } : slide,
          ))
        : currentSession,
    );
  }

  function handleBuildFromDraft() {
    if (!session || session.slideTexts.length === 0) {
      return false;
    }

    setDraftError(null);

    try {
      const presentationDraft = buildDraftFromSlideTexts(
        session.slideTexts,
        session.workingDraft,
      );
      setDraft(presentationDraft);
      setSelectedSlideId(presentationDraft.slides[0]?.id ?? null);
      setDrawerState("closed");

      startTransition(() => {
        setScreen("editor");
      });

      return true;
    } catch (error) {
      setDraftError(
        error instanceof Error
          ? error.message
          : "Не удалось открыть редактор. Попробуйте ещё раз.",
      );
      return false;
    }
  }

  function updateDocumentTitle(value: string) {
    setDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            documentTitle: value,
          }
        : currentDraft,
    );
  }

  function updateDraftTemplate(templateId: TemplateId) {
    setDraft((currentDraft) =>
      currentDraft
        ? updateDraftAppearance(currentDraft, { templateId })
        : currentDraft,
    );
  }

  function updateDraftColor(colorThemeId: ColorThemeId) {
    setDraft((currentDraft) =>
      currentDraft
        ? updateDraftAppearance(currentDraft, { colorThemeId })
        : currentDraft,
    );
  }

  function handleBackToPrompt() {
    setPromptError(null);
    setClarifyError(null);
    setPendingMode(null);
    setScreen("start");
  }

  function handleBackToClarify() {
    setDraftError(null);
    setPendingMode(null);
    setScreen("clarify");
  }

  function handleResetFlow() {
    setPrompt("");
    setPromptError(null);
    setClarifyError(null);
    setDraftError(null);
    setSession(null);
    setDraft(null);
    setPendingMode(null);
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
  const startLikeScreen =
    screen === "start" || screen === "clarify" || screen === "building";

  return (
    <main className={`app-shell${startLikeScreen ? " app-shell--start" : ""}`}>
      {startLikeScreen ? (
        <div className="start-logo">
          <BrandMark />
          <BrandWordmark className="start-logo__name" />
        </div>
      ) : null}

      {screen === "start" ? (
        <StartScreen
          prompt={prompt}
          promptError={promptError}
          textareaRef={promptInputRef}
          disabled={pendingMode === "clarify"}
          isSubmitting={pendingMode === "clarify"}
          onChangePrompt={handlePromptChange}
          onUseScenario={handleUseScenario}
          onSubmit={beginClarify}
        />
      ) : null}

      {screen === "clarify" && session ? (
        <ClarifyScreen
          session={session}
          isLoading={pendingMode === "clarify"}
          errorMessage={clarifyError}
          onSendMessage={handleClarifySend}
          onUseQuickReply={handleClarifySend}
          onBuild={handleGenerateFromClarify}
          onBack={handleBackToPrompt}
        />
      ) : null}

      {screen === "building" && session ? <BuildingScreen session={session} /> : null}

      {screen === "draft" && session ? (
        <DraftScreen
          session={session}
          isLoading={pendingMode === "revise"}
          errorMessage={draftError}
          onSendMessage={handleDraftChatSend}
          onUpdateSlide={handleUpdateSlideText}
          onBuild={handleBuildFromDraft}
          onBack={handleBackToClarify}
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
          onBackToStart={handleResetFlow}
          slideSpeakerNote={
            selectedSlideId ? (draft.slideSpeakerNotes[selectedSlideId] ?? "") : ""
          }
          onSlideSpeakerNoteChange={updateSlideSpeakerNote}
          debugLayerEnabled={debugLayerEnabled}
        />
      ) : null}
    </main>
  );
}
