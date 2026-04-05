"use client";

import { useRef, useState, KeyboardEvent } from "react";
import type { SlideTextEntry } from "@/lib/presentation-types";

interface SlideTextCardProps {
  slide: SlideTextEntry;
  index: number;
  isLoading?: boolean;
  onUpdate: (id: SlideTextEntry["id"], field: "title" | "subtitle" | "bullets", value: string | string[]) => void;
}

export function SlideTextCard({ slide, index, isLoading, onUpdate }: SlideTextCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingBulletIndex, setEditingBulletIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  function handleFieldClick(field: string) {
    if (isLoading) return;
    setEditingField(field);
    setEditingBulletIndex(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleBulletClick(bulletIndex: number) {
    if (isLoading) return;
    setEditingField("bullet");
    setEditingBulletIndex(bulletIndex);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleBlur() {
    setEditingField(null);
    setEditingBulletIndex(null);
  }

  function handleKeyDown(e: KeyboardEvent, onCommit: () => void) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onCommit();
    }
    if (e.key === "Escape") {
      handleBlur();
    }
  }

  const slideNum = String(index + 1).padStart(2, "0");

  if (isLoading) {
    return (
      <div className="slide-text-card slide-text-card--loading">
        <div className="slide-text-card__num">{slideNum}</div>
        <div className="slide-text-card__skeleton">
          <div className="slide-text-card__skeleton-line slide-text-card__skeleton-line--title" />
          <div className="slide-text-card__skeleton-line slide-text-card__skeleton-line--sub" />
          <div className="slide-text-card__skeleton-line" />
          <div className="slide-text-card__skeleton-line" />
          <div className="slide-text-card__skeleton-line slide-text-card__skeleton-line--short" />
        </div>
      </div>
    );
  }

  return (
    <div className="slide-text-card">
      <div className="slide-text-card__header">
        <span className="slide-text-card__num">{slideNum}</span>
        <span className="slide-text-card__rail">{slide.railTitle}</span>
      </div>

      {editingField === "title" ? (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          className="slide-text-card__edit-input slide-text-card__edit-input--title"
          defaultValue={slide.title}
          onBlur={(e) => {
            onUpdate(slide.id, "title", e.target.value);
            handleBlur();
          }}
          onKeyDown={(e) =>
            handleKeyDown(e, () => {
              onUpdate(slide.id, "title", (e.target as HTMLInputElement).value);
              handleBlur();
            })
          }
        />
      ) : (
        <div
          className="slide-text-card__title"
          onClick={() => handleFieldClick("title")}
          title="Нажмите, чтобы редактировать"
        >
          {slide.title || <span className="slide-text-card__empty">Заголовок</span>}
        </div>
      )}

      {editingField === "subtitle" ? (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          className="slide-text-card__edit-input slide-text-card__edit-input--sub"
          defaultValue={slide.subtitle}
          onBlur={(e) => {
            onUpdate(slide.id, "subtitle", e.target.value);
            handleBlur();
          }}
          onKeyDown={(e) =>
            handleKeyDown(e, () => {
              onUpdate(slide.id, "subtitle", (e.target as HTMLInputElement).value);
              handleBlur();
            })
          }
        />
      ) : (
        <div
          className="slide-text-card__subtitle"
          onClick={() => handleFieldClick("subtitle")}
          title="Нажмите, чтобы редактировать"
        >
          {slide.subtitle || <span className="slide-text-card__empty">Подзаголовок</span>}
        </div>
      )}

      <ul className="slide-text-card__bullets">
        {slide.bullets.map((bullet, bi) => (
          <li key={bi} className="slide-text-card__bullet">
            {editingField === "bullet" && editingBulletIndex === bi ? (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                className="slide-text-card__edit-input slide-text-card__edit-input--bullet"
                defaultValue={bullet}
                onBlur={(e) => {
                  const updated = [...slide.bullets];
                  updated[bi] = e.target.value;
                  onUpdate(slide.id, "bullets", updated);
                  handleBlur();
                }}
                onKeyDown={(e) =>
                  handleKeyDown(e, () => {
                    const updated = [...slide.bullets];
                    updated[bi] = (e.target as HTMLInputElement).value;
                    onUpdate(slide.id, "bullets", updated);
                    handleBlur();
                  })
                }
              />
            ) : (
              <span
                className="slide-text-card__bullet-text"
                onClick={() => handleBulletClick(bi)}
                title="Нажмите, чтобы редактировать"
              >
                {bullet}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
