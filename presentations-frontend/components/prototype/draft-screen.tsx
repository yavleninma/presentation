"use client";

import { useEffect, useRef, useState } from "react";
import type { DraftSession, SlideTextEntry } from "@/lib/presentation-types";
import { BrandMark, BrandWordmark } from "../brand-mark";
import { BackButton } from "../ui/back-button";
import { ComposeField } from "../ui/compose-field";
import { SlideTextCard } from "./slide-text-card";

interface DraftScreenProps {
  session: DraftSession;
  isLoading: boolean;
  errorMessage: string | null;
  onSendMessage: (text: string) => Promise<boolean>;
  onUpdateSlide: (
    id: SlideTextEntry["id"],
    field: "title" | "subtitle" | "bullets",
    value: string | string[]
  ) => void;
  onBuild: () => boolean | Promise<boolean>;
  onBack: () => void;
}

export function DraftScreen({
  session,
  isLoading,
  errorMessage,
  onSendMessage,
  onUpdateSlide,
  onBuild,
  onBack,
}: DraftScreenProps) {
  const [input, setInput] = useState("");
  const [openingEditor, setOpeningEditor] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const slides = session.slideTexts;
  const messages = session.messages;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleBuild() {
    if (isLoading || openingEditor || slides.length === 0) {
      return;
    }

    setOpeningEditor(true);
    try {
      const success = await onBuild();
      if (!success) {
        setOpeningEditor(false);
      }
    } catch {
      setOpeningEditor(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) {
      return;
    }

    const success = await onSendMessage(text);
    if (success) {
      setInput("");
    }
  }

  return (
    <div className="draft-screen">
      {/* Топбар — единый хром со всеми экранами */}
      <header className="draft-screen__topbar">
        <BackButton onClick={onBack} ariaLabel="К уточнению" title="К уточнению" />
        <div className="brand-block">
          <BrandMark />
          <BrandWordmark className="brand-name" />
        </div>
      </header>

      {/* Сетка слайдов */}
      <div className="draft-screen__slides">
        <div className="draft-screen__slides-grid">
          {isLoading && slides.length === 0
            ? Array.from({ length: 6 }, (_, index) => (
                <SlideTextCard
                  key={index}
                  slide={{
                    id: `slide-${index + 1}` as SlideTextEntry["id"],
                    railTitle: "",
                    title: "",
                    subtitle: "",
                    bullets: [],
                  }}
                  index={index}
                  isLoading
                  onUpdate={onUpdateSlide}
                />
              ))
            : slides.map((slide, index) => (
                <SlideTextCard
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isLoading={isLoading}
                  onUpdate={onUpdateSlide}
                />
              ))}
        </div>
      </div>

      {/* Боковая панель уточнений */}
      <aside className="draft-screen__chat">
        <div className="draft-screen__chat-header">
          <span className="draft-screen__chat-title">Уточнения</span>
          <span className="draft-screen__chat-hint">
            Можно усилить смысл, поправить формулировки или сменить акцент.
          </span>

          <div className="draft-screen__context" aria-label="Контекст презентации">
            <p className="draft-screen__context-summary" title={session.summary}>
              {session.summary}
            </p>
            <div className="draft-screen__context-chips">
              <span className="draft-screen__summary-chip">
                Аудитория: {session.workingDraft.audience}
              </span>
              <span className="draft-screen__summary-chip">
                Следующий шаг: {session.workingDraft.desiredOutcome}
              </span>
              {session.workingDraft.knownFacts.slice(0, 2).map((fact) => (
                <span key={fact} className="draft-screen__summary-chip">
                  {fact}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="draft-screen__chat-messages" aria-live="polite" aria-label="Переписка по черновику">
          {messages.length === 0 ? (
            <p className="draft-screen__chat-empty">
              Черновик готов. Можно уточнить формулировки или сменить акцент — просто напишите.
            </p>
          ) : null}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`chat-msg${message.role === "user" ? " is-user" : ""}`}
            >
              {message.role === "user" ? (
                <span className="chat-avatar is-user" aria-hidden="true">Я</span>
              ) : (
                <BrandMark className="brand-mark brand-mark--sm" />
              )}
              <div className="chat-msg__column">
                <span className={`chat-bubble ${message.role === "user" ? "is-user" : "is-assistant"}`}>
                  <p>{message.text}</p>
                </span>
              </div>
            </div>
          ))}

          {isLoading && messages.length > 0 ? (
            <div className="chat-msg">
              <BrandMark className="brand-mark brand-mark--sm" />
              <div className="chat-msg__column">
                <span className="chat-bubble is-assistant chat-bubble--thinking">
                  <span className="chat-dot" aria-hidden="true" />
                  <span className="chat-dot" aria-hidden="true" />
                  <span className="chat-dot" aria-hidden="true" />
                </span>
              </div>
            </div>
          ) : null}

          <div ref={chatEndRef} />
        </div>

        <div className="draft-screen__chat-input-row">
          {errorMessage ? <p className="draft-screen__error">{errorMessage}</p> : null}

          <ComposeField
            variant="draft"
            value={input}
            onChange={setInput}
            onSubmit={() => void handleSend()}
            placeholder="Напишите, что нужно усилить в черновике…"
            disabled={isLoading}
            isLoading={isLoading}
            rows={3}
          />
        </div>
      </aside>

      {/* Футер с главным CTA — охватывает оба столбца */}
      <footer className="draft-screen__footer">
        <button
          type="button"
          className="draft-screen__build-btn"
          onClick={() => void handleBuild()}
          disabled={isLoading || openingEditor || slides.length === 0}
          aria-label={openingEditor ? "Открываем редактор" : "Открыть редактор"}
        >
          {openingEditor ? "Открываем…" : "Открыть редактор →"}
        </button>
      </footer>
    </div>
  );
}
