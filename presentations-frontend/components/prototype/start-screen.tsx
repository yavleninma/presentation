"use client";

import { useMemo, useState, type ReactNode, type RefObject } from "react";
import { SCENARIO_CHIPS } from "@/lib/presentation-options";

export function StartScreen({
  prompt,
  promptError,
  textareaRef,
  disabled,
  isSubmitting,
  onChangePrompt,
  onUseScenario,
  onSubmit,
  children,
}: {
  prompt: string;
  promptError: string | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  disabled: boolean;
  isSubmitting: boolean;
  onChangePrompt: (value: string) => void;
  onUseScenario: (value: string) => void;
  onSubmit: () => void;
  children?: ReactNode;
}) {
  const [activeDescription, setActiveDescription] = useState<string | null>(null);
  const helperText = useMemo(
    () => activeDescription ?? SCENARIO_CHIPS[0]?.description ?? null,
    [activeDescription],
  );

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
                placeholder="Опишите, что нужно показать, кому и какой следующий шаг важно назвать."
                disabled={disabled}
              />
              <button
                type="submit"
                className="composer-send"
                disabled={disabled}
                aria-label={isSubmitting ? "Уточняем запрос" : "Отправить"}
              >
                {isSubmitting ? "..." : "↑"}
              </button>
            </div>

            {promptError ? <p className="inline-error">{promptError}</p> : null}
            {!promptError && isSubmitting ? (
              <p className="entry-hint entry-hint--status">
                Уточняем, что важно для первого черновика.
              </p>
            ) : null}
          </form>

          <div className="example-row">
            {SCENARIO_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="example-chip"
                onClick={() => onUseScenario(chip.prompt)}
                onMouseEnter={() => setActiveDescription(chip.description)}
                onMouseLeave={() => setActiveDescription(null)}
                onFocus={() => setActiveDescription(chip.description)}
                onBlur={() => setActiveDescription(null)}
                disabled={disabled}
                title={chip.description}
                aria-describedby="start-scenario-hint"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {helperText ? (
            <p id="start-scenario-hint" className="entry-hint entry-hint--scenario">
              {helperText}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
