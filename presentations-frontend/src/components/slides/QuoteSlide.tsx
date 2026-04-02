"use client";

import { SlideComponentProps } from "./SlideRenderer";
import { EditableText } from "../editor/EditableText";

export function QuoteSlide({ slide, template, editable, onContentChange }: SlideComponentProps) {
  const c = template.colors;
  const { quoteText, quoteAuthor, quoteRole } = slide.content;

  return (
    <div className="flex flex-col items-center justify-center h-full px-24 text-center relative">
      <div
        className="absolute top-16 left-20 text-[180px] font-serif leading-none select-none opacity-[0.06]"
        style={{ color: c.primary }}
      >
        &ldquo;
      </div>

      <div
        className="w-16 h-1 mb-10 rounded-full"
        style={{ backgroundColor: c.primary }}
      />

      <blockquote
        className="text-[32px] leading-snug font-medium max-w-[900px] mb-10 italic"
        style={{ color: c.foreground, fontFamily: template.fonts.heading }}
      >
        <EditableText
          value={quoteText || ""}
          placeholder="Лучший способ предсказать будущее — создать его."
          field="quoteText"
          editable={editable}
          onContentChange={onContentChange}
        />
      </blockquote>

      <div className="flex flex-col items-center gap-1">
        <div
          className="w-10 h-px mb-4"
          style={{ backgroundColor: c.primary }}
        />
        <span
          className="text-[20px] font-semibold"
          style={{ color: c.foreground }}
        >
          <EditableText
            value={quoteAuthor || ""}
            placeholder="Автор"
            field="quoteAuthor"
            editable={editable}
            onContentChange={onContentChange}
          />
        </span>
        <span
          className="text-[16px]"
          style={{ color: c.mutedForeground }}
        >
          <EditableText
            value={quoteRole || ""}
            placeholder="Должность"
            field="quoteRole"
            editable={editable}
            onContentChange={onContentChange}
          />
        </span>
      </div>

      <div
        className="absolute bottom-10 left-20 text-[14px] font-medium tabular-nums"
        style={{ color: c.mutedForeground }}
      >
        {String(slide.order + 1).padStart(2, "0")}
      </div>
    </div>
  );
}
