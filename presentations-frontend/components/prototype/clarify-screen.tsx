"use client";

import { useEffect, useRef, useState } from "react";
import type { DraftSession } from "@/lib/presentation-types";
import { BrandMark } from "../brand-mark";
import { BackButton } from "../ui/back-button";
import { ComposeField } from "../ui/compose-field";

interface ClarifyScreenProps {
  session: DraftSession;
  isLoading: boolean;
  errorMessage: string | null;
  onSend: (text: string) => Promise<boolean>;
  onBuild: () => void;
  onBack: () => void;
}

export function ClarifyScreen({
  session,
  isLoading,
  errorMessage,
  onSend,
  onBuild,
  onBack,
}: ClarifyScreenProps) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const messages = session.messages;
  const quickReplies = session.quickReplies ?? [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    const success = await onSend(text);
    if (success) setInput("");
  }

  async function handleQuickReply(text: string) {
    if (isLoading) return;
    await onSend(text);
  }

  return (
    <section className="entry-stage">
      <div className="chat-card clarify-chat-card">
        <div className="chat-card-header">
          <div>
            <h2 className="chat-card-title">Уточним главное</h2>
            {session.summary ? (
              <p className="chat-card-subtitle">{session.summary}</p>
            ) : null}
          </div>
          <BackButton onClick={onBack} label="Назад" />
        </div>

        <div className="chat-card-sep" />

        <div
          className="chat-messages clarify-chat-messages"
          aria-live="polite"
          aria-label="Переписка об уточнении"
        >
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

          {isLoading ? (
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

        {!isLoading && quickReplies.length > 0 ? (
          <div className="chat-suggestions clarify-quick-replies">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                className="chat-suggestion-chip"
                onClick={() => void handleQuickReply(reply)}
                disabled={isLoading}
              >
                {reply}
              </button>
            ))}
          </div>
        ) : null}

        <div className="chat-card-sep" />

        <div className="clarify-footer">
          <div className="clarify-footer__compose">
            <ComposeField
              variant="chat"
              value={input}
              onChange={setInput}
              onSubmit={() => void handleSend()}
              placeholder="Добавьте короткое уточнение…"
              disabled={isLoading}
              isLoading={isLoading}
              rows={2}
            />
          </div>

          <div className="chat-cta-row">
            <button
              type="button"
              className={`chat-cta${session.readyToGenerate ? " chat-cta--ready" : ""}`}
              onClick={onBuild}
              disabled={isLoading}
            >
              {isLoading ? "Обрабатываем…" : "Собрать черновик →"}
            </button>
          </div>

          {errorMessage ? (
            <p className="chat-inline-error" role="alert">{errorMessage}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
