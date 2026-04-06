"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { DraftSession } from "@/lib/presentation-types";

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

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
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

          <button type="button" className="ghost-button" onClick={onBack}>
            Назад
          </button>
        </div>

        <div className="chat-card-sep" />

        <div className="chat-messages">
          {session.messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`chat-msg${message.role === "user" ? " is-user" : ""}`}
            >
              <span
                className={`chat-avatar ${message.role === "user" ? "is-user" : "is-assistant"}`}
                aria-hidden="true"
              >
                {message.role === "user" ? "Вы" : "•"}
              </span>

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
              <span className="chat-avatar is-assistant" aria-hidden="true">
                •
              </span>
              <div className="chat-msg__column">
                <span className="chat-bubble is-assistant">
                  <p>Собираю уточнение и проверяю, что ещё стоит добавить.</p>
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
            className="chat-cta"
            onClick={onBuild}
            disabled={isLoading}
          >
            Собрать черновик →
          </button>
        </div>

        {errorMessage ? <p className="chat-inline-error">{errorMessage}</p> : null}

        <div className="chat-card-sep-bottom" />

        <div className="chat-compose-area">
          <textarea
            className="chat-compose-input"
            value={input}
            rows={2}
            placeholder="Добавьте короткое уточнение, если хотите усилить черновик."
            disabled={isLoading}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            type="button"
            className="chat-compose-send"
            disabled={isLoading || !input.trim()}
            onClick={() => void handleSend()}
          >
            Отправить
          </button>
        </div>
      </div>
    </section>
  );
}
