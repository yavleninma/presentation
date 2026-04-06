"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  buildDraftFromSlideTexts,
  regenerateSlide,
  updateDraftAppearance,
} from "../lib/demo-generator";
import { readDraftApiErrorMessage } from "../lib/draft-api";
import type {
  ColorThemeId,
  DraftChatMessage,
  EditorDrawerState,
  HiddenTransformId,
  PresentationDraft,
  PrototypeScreen,
  SlideTextEntry,
  TemplateId,
} from "../lib/presentation-types";
import { BrandMark } from "./brand-mark";
import { DraftScreen } from "./prototype/draft-screen";
import { EditorScreen } from "./prototype/editor-screen";
import { StartScreen } from "./prototype/start-screen";

export function PresentationPrototype() {
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [screen, setScreen] = useState<PrototypeScreen>("start");
  const [draft, setDraft] = useState<PresentationDraft | null>(null);
  const [slideTexts, setSlideTexts] = useState<SlideTextEntry[]>([]);
  const [draftMessages, setDraftMessages] = useState<DraftChatMessage[]>([]);
  const [draftLoading, setDraftLoading] = useState(false);
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

  async function beginDraft() {
    const nextPrompt = prompt.trim();
    if (!nextPrompt) {
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
        body: JSON.stringify({ mode: "generate", prompt: nextPrompt }),
      });

      const payload = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        throw new Error(
          readDraftApiErrorMessage(payload) ??
            `Не удалось собрать черновик (HTTP ${res.status}).`,
        );
      }

      const data = payload as {
        slides: SlideTextEntry[];
        assistantMessage: string;
      };

      setSlideTexts(data.slides);
      setDraftMessages([{ role: "assistant", text: data.assistantMessage }]);
    } catch (error) {
      setDraftMessages([
        {
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "Не удалось сгенерировать слайды. Попробуйте ещё раз.",
        },
      ]);
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleDraftChatSend(userMessage: string) {
    const nextMessage = userMessage.trim();
    if (!nextMessage || draftLoading) {
      return;
    }

    const userEntry: DraftChatMessage = { role: "user", text: nextMessage };
    const nextMessages = [...draftMessages, userEntry];
    setDraftMessages(nextMessages);
    setDraftLoading(true);

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          userMessage: nextMessage,
          history: draftMessages,
          slides: slideTexts,
        }),
      });

      const payload = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        throw new Error(
          readDraftApiErrorMessage(payload) ??
            `Не удалось обработать сообщение (HTTP ${res.status}).`,
        );
      }

      const data = payload as {
        slides: SlideTextEntry[];
        assistantMessage: string;
      };

      setSlideTexts(data.slides);
      setDraftMessages([
        ...nextMessages,
        { role: "assistant", text: data.assistantMessage },
      ]);
    } catch (error) {
      setDraftMessages([
        ...nextMessages,
        {
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "Не удалось обработать запрос. Попробуйте ещё раз.",
        },
      ]);
    } finally {
      setDraftLoading(false);
    }
  }

  function handleUpdateSlideText(
    id: SlideTextEntry["id"],
    field: "title" | "subtitle" | "bullets",
    value: string | string[],
  ) {
    setSlideTexts((currentSlides) =>
      currentSlides.map((slide) =>
        slide.id === id ? { ...slide, [field]: value } : slide,
      ),
    );
  }

  function handleBuildFromDraft() {
    if (slideTexts.length === 0) {
      return;
    }

    const presentationDraft = buildDraftFromSlideTexts(slideTexts, prompt);
    setDraft(presentationDraft);
    setSelectedSlideId(presentationDraft.slides[0]?.id ?? null);
    setDrawerState("closed");

    startTransition(() => {
      setScreen("editor");
    });
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

  function handleBackToStart() {
    setPrompt("");
    setPromptError(null);
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
            disabled={draftLoading}
            onChangePrompt={handlePromptChange}
            onUseScenario={handleUseScenario}
            onSubmit={beginDraft}
          />
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
            selectedSlideId ? (draft.slideSpeakerNotes[selectedSlideId] ?? "") : ""
          }
          onSlideSpeakerNoteChange={updateSlideSpeakerNote}
          debugLayerEnabled={debugLayerEnabled}
        />
      ) : null}
    </main>
  );
}
