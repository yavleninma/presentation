"use client";

import React, { useRef, useState, useCallback } from "react";

interface EditableTextProps {
  value: string;
  field: string;
  editable?: boolean;
  onContentChange?: (field: string, value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

export function EditableText({
  value,
  field,
  editable = false,
  onContentChange,
  className = "",
  style,
  placeholder = "",
}: EditableTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (!ref.current) return;
    const newValue = ref.current.textContent?.trim() || "";
    if (newValue !== value) {
      onContentChange?.(field, newValue);
    }
  }, [value, field, onContentChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        ref.current?.blur();
      }
      if (e.key === "Escape") {
        if (ref.current) ref.current.textContent = value || placeholder;
        ref.current?.blur();
      }
    },
    [value, placeholder]
  );

  if (!editable || !onContentChange) {
    return <>{value || placeholder}</>;
  }

  return (
    <span
      ref={ref}
      className={`outline-none ring-offset-1 hover:ring-2 hover:ring-blue-400/30 focus:ring-2 focus:ring-blue-500/60 rounded px-0.5 -mx-0.5 transition-shadow ${className}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setIsEditing(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-editing={isEditing}
    >
      {value || placeholder}
    </span>
  );
}
