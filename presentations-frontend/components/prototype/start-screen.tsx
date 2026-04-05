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
  const showEntryActions = !children;

  return (
    <section className="entry-stage">
      <div className="entry-card">
        <h1>О чём презентация?</h1>

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
              rows={5}
              placeholder="О чём эта презентация?"
              disabled={disabled}
            />
          </div>

          {showEntryActions ? (
            <>
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

              <div className="entry-actions">
                <button
                  type="submit"
                  className="primary-button primary-button-wide"
                  disabled={disabled}
                >
                  Продолжить
                </button>
              </div>
            </>
          ) : null}

          {promptError ? <p className="inline-error">{promptError}</p> : null}
        </form>

        {children}
      </div>
    </section>
  );
}
