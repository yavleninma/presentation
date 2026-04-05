"use client";

import type { RefObject } from "react";
import type {
  ClarificationMessage,
  ClarificationSession,
  EntryPhase,
} from "@/lib/presentation-types";

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
  onSubmitReply: () => void;
  onBuild: () => void;
}) {
  const isBuilding = phase === "building";
  const showReplyComposer = !session.readyToBuild && !isBuilding;

  return (
    <section className="mini-chat" aria-live="polite">
      <div className="chat-stream">
        {session.transcript.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      {showReplyComposer ? (
        <form
          className="chat-compose"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitReply();
          }}
        >
          <div className="chat-compose-box">
            <textarea
              ref={replyRef}
              value={reply}
              onChange={(event) => onChangeReply(event.target.value)}
              rows={2}
              placeholder="Ответьте коротко"
            />

            <button type="submit" className="ghost-button chat-send-button">
              Отправить
            </button>
          </div>
        </form>
      ) : null}

      {session.readyToBuild ? (
        <div className="chat-ready">
          <button
            type="button"
            className="primary-button primary-button-build"
            onClick={onBuild}
            disabled={isBuilding}
          >
            {isBuilding ? "Собираю черновик..." : "Собрать черновик"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ChatMessage({ message }: { message: ClarificationMessage }) {
  return (
    <div className={`chat-message is-${message.role}`}>
      <span className={`chat-avatar is-${message.role}`}>
        {message.role === "user" ? "Вы" : "В"}
      </span>
      <div className={`chat-bubble is-${message.role}`}>
        <p>{message.text}</p>
      </div>
    </div>
  );
}
