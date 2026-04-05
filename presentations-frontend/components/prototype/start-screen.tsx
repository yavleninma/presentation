"use client";

import type { ReactNode, RefObject } from "react";
import {
  SCENARIO_CHIPS,
  START_SCREEN_ENABLED_SCENARIO_ID,
} from "@/lib/demo-generator";

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
            <div className="composer-box composer-box--start-v3">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(event) => onChangePrompt(event.target.value)}
                rows={1}
                placeholder="Нужно собрать питч для инвесторов..."
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
            {SCENARIO_CHIPS.map((chip) => {
              const chipEnabled = chip.id === START_SCREEN_ENABLED_SCENARIO_ID;
              return (
                <button
                  key={chip.id}
                  type="button"
                  className="example-chip"
                  onClick={() => onUseScenario(chip.prompt)}
                  disabled={disabled || !chipEnabled}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
