"use client";

import { useEffect, useState } from "react";
import type { DraftSession } from "@/lib/presentation-types";

const BUILD_STEPS = [
  "Собираем тему и адресата",
  "Выделяем факты и следующий шаг",
  "Раскладываем историю по слайдам",
  "Проверяем первый рабочий проход",
] as const;

interface BuildingScreenProps {
  session: DraftSession;
  onBack: () => void;
}

export function BuildingScreen({ session, onBack }: BuildingScreenProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setActiveStep(1), 1200),
      setTimeout(() => setActiveStep(2), 2800),
      setTimeout(() => setActiveStep(3), 4800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section className="entry-stage">
      <div className="chat-card build-status-card">
        <div className="chat-card-header">
          <div>
            <h2 className="chat-card-title">Собираем черновик</h2>
            {session.summary ? (
              <p className="chat-card-subtitle">{session.summary}</p>
            ) : null}
          </div>
          <button type="button" className="ghost-button" onClick={onBack}>
            Назад
          </button>
        </div>

        <div className="chat-card-sep" />

        <div className="build-status" aria-live="polite" aria-busy="true">
          <div className="build-status__steps">
            {BUILD_STEPS.map((stepLabel, i) => {
              const isDone = i < activeStep;
              const isActive = i === activeStep;
              return (
                <div
                  key={stepLabel}
                  className={`build-status__step${isActive ? " is-active" : isDone ? " is-done" : ""}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className="build-status__mark" aria-hidden="true">
                    {isDone ? "✓" : String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="build-status__step-name">{stepLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
