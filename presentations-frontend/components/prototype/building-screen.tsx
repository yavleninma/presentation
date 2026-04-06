"use client";

import { useEffect, useState } from "react";
import type { DraftSession } from "@/lib/presentation-types";

const BUILD_STEPS = [
  "Собираем тему и адресата",
  "Раскладываем историю по слайдам",
  "Готовим первый рабочий проход",
] as const;

export function BuildingScreen({ session }: { session: DraftSession }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % BUILD_STEPS.length);
    }, 700);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="entry-stage">
      <div className="chat-card build-status-card">
        <div className="chat-card-header chat-card-header--stacked">
          <h2 className="chat-card-title">Собираем черновик</h2>
          <p className="chat-card-subtitle">{session.summary}</p>
        </div>

        <div className="chat-card-sep" />

        <div className="build-status" aria-live="polite">
          <p className="build-status__lead">
            Собираем первый рабочий проход. Экран сменится сам, как только черновик будет готов.
          </p>

          <div className="build-status__steps" role="list" aria-label="Что делаем сейчас">
            {BUILD_STEPS.map((step, index) => (
              <div
                key={step}
                className={`build-status__step${index === activeStep ? " is-active" : ""}`}
                role="listitem"
              >
                <span className="build-status__mark" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="build-status__step-name">{step}</span>
              </div>
            ))}
          </div>

          <p className="build-status__note">
            Сначала собираем смысл и структуру, потом открываем готовый проход.
          </p>
        </div>
      </div>
    </section>
  );
}
