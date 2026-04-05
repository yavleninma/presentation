"use client";

import type { RefObject } from "react";
import type {
  ClarificationMessage,
  ClarificationSession,
  ClarificationSlot,
  EntryPhase,
} from "@/lib/presentation-types";

const SLOT_SUGGESTIONS: Record<ClarificationSlot, string[]> = {
  audience: ["Инвесторам", "Клиентам", "Команде"],
  desiredOutcome: ["Согласовать бюджет", "Показать прогресс", "Получить решение"],
  knownFacts: ["MVP готов", "Есть первые метрики", "Пилот запущен"],
};

export function MiniClarificationChat({
  session,
  reply,
  replyRef,
  phase,
  onChangeReply,
  onSubmitReply,
  onBuild,
}: {
  session: ClarificationSession;
  reply: string;
  replyRef: RefObject<HTMLTextAreaElement | null>;
  phase: EntryPhase;
  onChangeReply: (value: string) => void;
  onSubmitReply: (directValue?: string) => void;
  onBuild: () => void;
}) {
  const isBuilding = phase === "building";
  const showReplyComposer = !session.readyToBuild && !isBuilding;
  const questionNumber = session.askedSlots.length + 1;
  const totalQuestions = 3;

  const suggestions =
    showReplyComposer && session.pendingSlot
      ? SLOT_SUGGESTIONS[session.pendingSlot] ?? []
      : [];

  function handleSuggestionClick(value: string) {
    onSubmitReply(value);
  }

  return (
    <div className="chat-card" aria-live="polite">
      <div className="chat-card-header">
        <h3 className="chat-card-title">О чём презентация?</h3>
        <span className="chat-card-counter">
          Вопрос {Math.min(questionNumber, totalQuestions)} из {totalQuestions}
        </span>
      </div>

      <div className="chat-card-sep" />

      <div className="chat-messages">
        {session.transcript.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {suggestions.length > 0 ? (
          <div className="chat-suggestions">
            {suggestions.map((label) => (
              <button
                key={label}
                type="button"
                className="chat-suggestion-chip"
                onClick={() => handleSuggestionClick(label)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {session.readyToBuild ? (
          <div className="chat-cta-row">
            <button
              type="button"
              className="chat-cta"
              onClick={onBuild}
              disabled={isBuilding}
            >
              {isBuilding ? "Собираю черновик..." : "Собрать черновик \u2192"}
            </button>
          </div>
        ) : null}
      </div>

      {showReplyComposer ? (
        <>
          <div className="chat-card-sep-bottom" />
          <form
            className="chat-compose-area"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmitReply();
            }}
          >
            <textarea
              ref={replyRef}
              value={reply}
              onChange={(event) => onChangeReply(event.target.value)}
              rows={1}
              className="chat-compose-input"
              placeholder="Добавить детали..."
            />
            <button
              type="submit"
              className="chat-compose-send"
              aria-label="Отправить"
            >
              ↑
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}

function ChatMessage({ message }: { message: ClarificationMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`chat-msg is-${message.role}`}>
      <span className={`chat-avatar is-${message.role}`}>
        {isUser ? "М" : "В"}
      </span>
      <div className={`chat-bubble is-${message.role}`}>
        <p>{message.text}</p>
      </div>
    </div>
  );
}
