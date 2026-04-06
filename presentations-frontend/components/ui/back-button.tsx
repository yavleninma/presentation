"use client";

import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  ariaLabel?: string;
  title?: string;
}

/**
 * Единая кнопка «Назад» с иконкой ArrowLeft.
 * label задан  → ghost-кнопка (pill) с текстом: используется в карточке clarify.
 * label не задан → компактная иконка-кнопка: используется в топбарах draft/editor.
 */
export function BackButton({ onClick, label, ariaLabel, title }: BackButtonProps) {
  return (
    <button
      type="button"
      className={label ? "ghost-button" : "editor-back-button"}
      onClick={onClick}
      aria-label={ariaLabel ?? label ?? "Назад"}
      title={title}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </button>
  );
}
