"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { DraftSession, SlideTextEntry } from "@/lib/presentation-types";
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
  const [isBuilding, setIsBuilding] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const slides = session.slideTexts;
  const messages = session.messages;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      setIsBuilding(false);
    }
  }, [isLoading]);

  async function handleBuild() {
    if (isLoading || isBuilding || slides.length === 0) {
      return;
    }

    setIsBuilding(true);
    const success = await onBuild();
    if (!success) {
      setIsBuilding(false);
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

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="draft-screen">
      <div className="draft-screen__slides">
        <section className="draft-screen__summary">
          <p className="draft-screen__summary-eyebrow">Что держим в фокусе</p>
          <p className="draft-screen__summary-text">{session.summary}</p>

          <div className="draft-screen__summary-chips">
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
        </section>

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

        <div className="draft-screen__build-bar">
          <button
            className="draft-screen__build-btn"
            onClick={() => void handleBuild()}
            disabled={isLoading || isBuilding || slides.length === 0}
          >
            {isBuilding ? "Открываем…" : "Открыть редактор →"}
          </button>
        </div>
      </div>

      <aside className="draft-screen__chat">
        <div className="draft-screen__chat-header">
          <div className="draft-screen__chat-header-top">
            <button
              type="button"
              className="draft-screen__back-btn"
              onClick={onBack}
              aria-label="Вернуться к уточнению"
            >
              ← Назад
            </button>
          </div>
          <span className="draft-screen__chat-title">Уточнения</span>
          <span className="draft-screen__chat-hint">
            Можно усилить смысл, поправить формулировки или сменить акцент.
          </span>
        </div>

        <div className="draft-screen__chat-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`draft-screen__msg draft-screen__msg--${message.role}`}
            >
              <span className="draft-screen__msg-bubble">{message.text}</span>
            </div>
          ))}

          {isLoading && messages.length > 0 ? (
            <div className="draft-screen__msg draft-screen__msg--assistant">
              <span className="draft-screen__msg-bubble draft-screen__msg-bubble--thinking">
                <span className="draft-screen__dot" />
                <span className="draft-screen__dot" />
                <span className="draft-screen__dot" />
              </span>
            </div>
          ) : null}

          <div ref={chatEndRef} />
        </div>

        <div className="draft-screen__chat-input-row">
          {errorMessage ? <p className="draft-screen__error">{errorMessage}</p> : null}

          <textarea
            className="draft-screen__chat-input"
            value={input}
            placeholder="Напишите, что нужно усилить в черновике…"
            rows={3}
            disabled={isLoading}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="draft-screen__chat-send"
            disabled={!input.trim() || isLoading}
            onClick={() => void handleSend()}
          >
            Отправить
          </button>
        </div>
      </aside>
    </div>
  );
}
