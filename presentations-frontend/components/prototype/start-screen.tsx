"use client";

import type { ReactNode, RefObject } from "react";
import { SCENARIO_CHIPS } from "@/lib/demo-generator";

export function StartScreen({
  prompt,
  promptError,
  textareaRef,
  disabled,
  onChangePrompt,
  onUseScenario,
  onSubmit,
  children,
}: {
  prompt: string;
  promptError: string | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  disabled: boolean;
  onChangePrompt: (value: string) => void;
  onUseScenario: (value: string) => void;
  onSubmit: () => void;
  children?: ReactNode;
}) {
  return (
    <section className="entry-stage">
      {children ? (
        children
      ) : (
        <>
          <h2 className="entry-title">О чём презентация?</h2>

          <form
            className="composer-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <div className="composer-box">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(event) => onChangePrompt(event.target.value)}
                rows={3}
                placeholder="Квартальный статус, итоги пилота, запрос на ресурс..."
                disabled={disabled}
              />
              <button
                type="submit"
                className="composer-send"
                disabled={disabled}
                aria-label="Отправить"
              >
                ↑
              </button>
            </div>

            {promptError ? (
              <p className="inline-error">{promptError}</p>
            ) : null}
          </form>

          <div className="example-row">
            {SCENARIO_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="example-chip"
                onClick={() => onUseScenario(chip.prompt)}
                disabled={disabled}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
