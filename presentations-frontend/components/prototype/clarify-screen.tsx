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
  onSendMessage: (text: string) => Promise<boolean>;
  onUseQuickReply: (text: string) => Promise<boolean>;
  onBuild: () => void;
  onBack: () => void;
}

export function ClarifyScreen({
  session,
  isLoading,
  errorMessage,
  onSendMessage,
  onUseQuickReply,
  onBuild,
  onBack,
}: ClarifyScreenProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages, isLoading]);

  async function handleSend() {
    const nextValue = input.trim();
    if (!nextValue || isLoading) {
      return;
    }

    const success = await onSendMessage(nextValue);
    if (success) {
      setInput("");
    }
  }

  async function handleQuickReply(reply: string) {
    if (isLoading) {
      return;
    }

    await onUseQuickReply(reply);
  }

  return (
    <section className="entry-stage">
      <div className="chat-card">
        <div className="chat-card-header">
          <div>
            <h2 className="chat-card-title">Уточним главное перед черновиком</h2>
            <p className="chat-card-subtitle">
              Можно ответить коротко или сразу перейти к сборке.
            </p>
          </div>

          <BackButton onClick={onBack} label="Назад" />
        </div>

        <div className="chat-card-sep" />

        <div className="chat-messages" aria-live="polite" aria-label="Переписка">
          {session.messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`chat-msg${message.role === "user" ? " is-user" : ""}`}
            >
              {message.role === "user" ? (
                <span className="chat-avatar is-user" aria-hidden="true">Я</span>
              ) : (
                <BrandMark className="brand-mark brand-mark--sm" />
              )}

              <div className="chat-msg__column">
                <span
                  className={`chat-bubble ${message.role === "user" ? "is-user" : "is-assistant"}`}
                >
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

          <div ref={messagesEndRef} />
        </div>

        {session.quickReplies.length > 0 ? (
          <>
            <div className="chat-card-sep" />

            <div className="chat-suggestions">
              {session.quickReplies.map((reply) => (
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
          </>
        ) : null}

        <div className="chat-cta-row">
          <button
            type="button"
            className={session.readyToGenerate ? "chat-cta" : "ghost-button chat-cta--secondary"}
            onClick={onBuild}
            disabled={isLoading}
            title={session.readyToGenerate ? undefined : "Ответьте на вопрос бота, чтобы черновик был точнее"}
          >
            Собрать черновик →
          </button>
        </div>

        {errorMessage ? <p className="chat-inline-error">{errorMessage}</p> : null}

        <div className="chat-card-sep-bottom" />

        <ComposeField
          variant="chat"
          value={input}
          onChange={setInput}
          onSubmit={() => void handleSend()}
          placeholder="Добавьте короткое уточнение, если хотите усилить черновик."
          disabled={isLoading}
          isLoading={isLoading}
          rows={2}
        />
      </div>
    </section>
  );
}
