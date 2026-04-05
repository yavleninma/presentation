"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import type { DraftChatMessage, SlideTextEntry } from "@/lib/presentation-types";
import { SlideTextCard } from "./slide-text-card";

interface DraftScreenProps {
  slides: SlideTextEntry[];
  messages: DraftChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onUpdateSlide: (
    id: SlideTextEntry["id"],
    field: "title" | "subtitle" | "bullets",
    value: string | string[]
  ) => void;
  onBuild: () => void;
  onBack: () => void;
}

export function DraftScreen({
  slides,
  messages,
  isLoading,
  onSendMessage,
  onUpdateSlide,
  onBuild,
  onBack,
}: DraftScreenProps) {
  const [input, setInput] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    onSendMessage(text);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="draft-screen">
      <div className="draft-screen__slides">
        <div className="draft-screen__slides-grid">
          {isLoading && slides.length === 0
            ? Array.from({ length: 6 }, (_, i) => (
                <SlideTextCard
                  key={i}
                  slide={{
                    id: `slide-${i + 1}` as SlideTextEntry["id"],
                    railTitle: "",
                    title: "",
                    subtitle: "",
                    bullets: [],
                  }}
                  index={i}
                  isLoading
                  onUpdate={onUpdateSlide}
                />
              ))
            : slides.map((slide, i) => (
                <SlideTextCard
                  key={slide.id}
                  slide={slide}
                  index={i}
                  isLoading={isLoading}
                  onUpdate={onUpdateSlide}
                />
              ))}
        </div>

        <div className="draft-screen__build-bar">
          <button
            className="draft-screen__build-btn"
            onClick={() => {
              setIsBuilding(true);
              onBuild();
            }}
            disabled={isLoading || isBuilding || slides.length === 0}
          >
            {isBuilding ? "Собираем…" : "Собрать черновик →"}
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
              aria-label="Вернуться к вводу"
            >
              ← Назад
            </button>
          </div>
          <span className="draft-screen__chat-title">Помощник</span>
          <span className="draft-screen__chat-hint">Уточняйте, меняйте, спрашивайте</span>
        </div>

        <div className="draft-screen__chat-messages">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`draft-screen__msg draft-screen__msg--${m.role}`}
            >
              <span className="draft-screen__msg-bubble">{m.text}</span>
            </div>
          ))}
          {isLoading && messages.length > 0 && (
            <div className="draft-screen__msg draft-screen__msg--assistant">
              <span className="draft-screen__msg-bubble draft-screen__msg-bubble--thinking">
                <span className="draft-screen__dot" />
                <span className="draft-screen__dot" />
                <span className="draft-screen__dot" />
              </span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="draft-screen__chat-input-row">
          <textarea
            ref={inputRef}
            className="draft-screen__chat-input"
            value={input}
            placeholder="Напишите пожелание к слайдам…"
            rows={3}
            disabled={isLoading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="draft-screen__chat-send"
            disabled={!input.trim() || isLoading}
            onClick={handleSend}
          >
            Отправить
          </button>
        </div>
      </aside>
    </div>
  );
}
