"use client";

import { useRef, useState, type KeyboardEvent, type RefObject } from "react";
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
  const cancelledRef = useRef(false);

  function startEditing(field: string, bulletIndex?: number) {
    if (isLoading) return;
    cancelledRef.current = false;
    setEditingField(field);
    setEditingBulletIndex(bulletIndex ?? null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleFieldClick(field: string) {
    startEditing(field);
  }

  function handleBulletClick(bulletIndex: number) {
    startEditing("bullet", bulletIndex);
  }

  function handleFieldKeyActivate(e: KeyboardEvent, field: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      startEditing(field);
    }
  }

  function handleBulletKeyActivate(e: KeyboardEvent, bulletIndex: number) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      startEditing("bullet", bulletIndex);
    }
  }

  function handleBlur(commit: () => void) {
    if (cancelledRef.current) {
      cancelledRef.current = false;
    } else {
      commit();
    }
    setEditingField(null);
    setEditingBulletIndex(null);
  }

  function handleKeyDown(e: KeyboardEvent, onCommit: () => void) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      cancelledRef.current = false;
      onCommit();
      setEditingField(null);
      setEditingBulletIndex(null);
    }
    if (e.key === "Escape") {
      cancelledRef.current = true;
      setEditingField(null);
      setEditingBulletIndex(null);
    }
  }

  const slideNum = String(index + 1).padStart(2, "0");

  if (isLoading) {
    return (
      <div
        className="slide-text-card slide-text-card--loading"
        aria-busy="true"
        aria-label={`Слайд ${slideNum} загружается`}
      >
        <div className="slide-text-card__num" aria-hidden="true">{slideNum}</div>
        <div className="slide-text-card__skeleton" aria-hidden="true">
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
          ref={inputRef as RefObject<HTMLInputElement>}
          className="slide-text-card__edit-input slide-text-card__edit-input--title"
          defaultValue={slide.title}
          onBlur={(e) => handleBlur(() => onUpdate(slide.id, "title", e.target.value))}
          onKeyDown={(e) =>
            handleKeyDown(e, () => {
              onUpdate(slide.id, "title", (e.target as HTMLInputElement).value);
            })
          }
        />
      ) : (
        <div
          className="slide-text-card__title"
          role="button"
          tabIndex={0}
          onClick={() => handleFieldClick("title")}
          onKeyDown={(e) => handleFieldKeyActivate(e, "title")}
          title="Нажмите, чтобы редактировать"
          aria-label={`Заголовок слайда: ${slide.title || "Заголовок"}`}
        >
          {slide.title || <span className="slide-text-card__empty">Заголовок</span>}
        </div>
      )}

      {editingField === "subtitle" ? (
        <input
          ref={inputRef as RefObject<HTMLInputElement>}
          className="slide-text-card__edit-input slide-text-card__edit-input--sub"
          defaultValue={slide.subtitle}
          onBlur={(e) => handleBlur(() => onUpdate(slide.id, "subtitle", e.target.value))}
          onKeyDown={(e) =>
            handleKeyDown(e, () => {
              onUpdate(slide.id, "subtitle", (e.target as HTMLInputElement).value);
            })
          }
        />
      ) : (
        <div
          className="slide-text-card__subtitle"
          role="button"
          tabIndex={0}
          onClick={() => handleFieldClick("subtitle")}
          onKeyDown={(e) => handleFieldKeyActivate(e, "subtitle")}
          title="Нажмите, чтобы редактировать"
          aria-label={`Подзаголовок слайда: ${slide.subtitle || "Подзаголовок"}`}
        >
          {slide.subtitle || <span className="slide-text-card__empty">Подзаголовок</span>}
        </div>
      )}

      <ul className="slide-text-card__bullets">
        {slide.bullets.map((bullet, bi) => (
          <li key={bi} className="slide-text-card__bullet">
            {editingField === "bullet" && editingBulletIndex === bi ? (
              <input
                ref={inputRef as RefObject<HTMLInputElement>}
                className="slide-text-card__edit-input slide-text-card__edit-input--bullet"
                defaultValue={bullet}
                onBlur={(e) =>
                  handleBlur(() => {
                    const updated = [...slide.bullets];
                    updated[bi] = e.target.value;
                    onUpdate(slide.id, "bullets", updated);
                  })
                }
                onKeyDown={(e) =>
                  handleKeyDown(e, () => {
                    const updated = [...slide.bullets];
                    updated[bi] = (e.target as HTMLInputElement).value;
                    onUpdate(slide.id, "bullets", updated);
                  })
                }
              />
            ) : (
              <span
                className="slide-text-card__bullet-text"
                role="button"
                tabIndex={0}
                onClick={() => handleBulletClick(bi)}
                onKeyDown={(e) => handleBulletKeyActivate(e, bi)}
                title="Нажмите, чтобы редактировать"
                aria-label={`Тезис ${bi + 1}: ${bullet || "пусто"}`}
              >
                {bullet || <span className="slide-text-card__empty">Тезис</span>}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
