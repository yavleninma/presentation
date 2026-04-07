"use client";

import { useEffect, useState } from "react";
import type { DraftSession } from "@/lib/presentation-types";

export type BuildingStep = "analyzing" | "planning" | "filling" | "done";

const BUILD_STEPS: Array<{ id: BuildingStep; label: string }> = [
  { id: "analyzing", label: "Анализирую материал" },
  { id: "planning", label: "Планирую структуру" },
  { id: "filling", label: "Наполняю слайды" },
  { id: "done", label: "Готово" },
];

function stepToIndex(step: BuildingStep): number {
  const idx = BUILD_STEPS.findIndex((s) => s.id === step);
  return idx >= 0 ? idx : 0;
}

interface BuildingScreenProps {
  session: DraftSession;
  buildingStep?: BuildingStep;
  onBack: () => void;
}

export function BuildingScreen({ session, buildingStep = "analyzing", onBack }: BuildingScreenProps) {
  const [displayIndex, setDisplayIndex] = useState(0);
  const targetIndex = stepToIndex(buildingStep);

  useEffect(() => {
    // Плавно движемся к targetIndex
    if (displayIndex < targetIndex) {
      const timer = setTimeout(() => {
        setDisplayIndex((i) => Math.min(i + 1, targetIndex));
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [displayIndex, targetIndex]);

  // Если нет реального прогресса (шаг не меняется долго), имитируем первые 2 шага таймером
  useEffect(() => {
    if (buildingStep === "analyzing") {
      const timer1 = setTimeout(() => setDisplayIndex((i) => Math.max(i, 0)), 300);
      return () => clearTimeout(timer1);
    }
  }, [buildingStep]);

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

        <div className="build-status" aria-live="polite" aria-busy={buildingStep !== "done"}>
          <div className="build-status__steps">
            {BUILD_STEPS.map((step, i) => {
              const isDone = i < displayIndex;
              const isActive = i === displayIndex;
              return (
                <div
                  key={step.id}
                  className={`build-status__step${isActive ? " is-active" : isDone ? " is-done" : ""}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className="build-status__mark" aria-hidden="true">
                    {isDone ? "✓" : String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="build-status__step-name">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
