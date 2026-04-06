"use client";

import { ArrowUp } from "lucide-react";
import { type KeyboardEvent, type RefObject } from "react";

interface ComposeFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  rows?: number;
  /**
   * start  — белое поле с кнопкой-стрелкой (экран старта).
   *          Рендерит .composer-box.composer-box--start-v3 целиком.
   *          Кнопка отправки type="submit" (форма остаётся в родителе).
   * chat   — поле уточнений с кнопкой «Отправить» (экран clarify).
   *          Рендерит .chat-compose-area + input + кнопку.
   * draft  — только input + кнопка без враппера (экран draft).
   *          Враппер .draft-screen__chat-input-row остаётся в родителе,
   *          т.к. в нём также рендерится errorMessage.
   */
  variant?: "start" | "chat" | "draft";
  /** Ref на textarea — нужен в variant="start" для фокуса при возврате на экран. */
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

function useComposeKeyDown(onSubmit: () => void, disabled: boolean, isLoading: boolean) {
  return function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!disabled && !isLoading) {
        onSubmit();
      }
    }
  };
}

export function ComposeField({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
  isLoading = false,
  rows = 2,
  variant = "chat",
  textareaRef,
}: ComposeFieldProps) {
  const handleKeyDown = useComposeKeyDown(onSubmit, disabled, isLoading);
  const canSubmit = value.trim().length > 0 && !disabled && !isLoading;

  if (variant === "start") {
    return (
      <div className="composer-box composer-box--start-v3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={1}
          placeholder={placeholder ?? "Расскажите, что нужно показать и кому."}
          disabled={disabled}
          onKeyDown={handleKeyDown}
        />
        <button
          type="submit"
          className="composer-send"
          disabled={disabled}
          aria-label={isLoading ? "Уточняем запрос" : "Отправить"}
        >
          {isLoading ? (
            <span aria-hidden="true">···</span>
          ) : (
            <ArrowUp size={18} strokeWidth={2.5} aria-hidden />
          )}
        </button>
      </div>
    );
  }

  if (variant === "chat") {
    return (
      <div className="chat-compose-area">
        <textarea
          className="chat-compose-input"
          value={value}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="chat-compose-send compose-send"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          Отправить
        </button>
      </div>
    );
  }

  // variant === "draft"
  return (
    <>
      <textarea
        className="draft-screen__chat-input"
        value={value}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled || isLoading}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="draft-screen__chat-send compose-send"
        disabled={!canSubmit}
        aria-label="Отправить сообщение"
        onClick={onSubmit}
      >
        Отправить
      </button>
    </>
  );
}
