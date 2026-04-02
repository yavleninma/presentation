"use client";

import { SlideComponentProps } from "./SlideRenderer";
import { EditableText } from "../editor/EditableText";

export function TitleSlide({ slide, template, editable, onContentChange }: SlideComponentProps) {
  const c = template.colors;
  const { heading, subheading } = slide.content;

  return (
    <div className="flex flex-col h-full relative">
      <div
        className="w-full h-2 flex-shrink-0"
        style={{ backgroundColor: c.primary }}
      />

      <div className="flex-1 flex flex-col justify-center px-20 pb-16 pt-12">
        <div
          className="w-16 h-1 mb-8 rounded-full"
          style={{ backgroundColor: c.secondary }}
        />

        <h1
          className="text-[56px] font-bold leading-[1.1] tracking-tight mb-6"
          style={{ color: c.foreground, fontFamily: template.fonts.heading }}
        >
          <EditableText
            value={heading || ""}
            placeholder="Заголовок презентации"
            field="heading"
            editable={editable}
            onContentChange={onContentChange}
          />
        </h1>

        <p
          className="text-[24px] leading-relaxed max-w-[700px] font-light"
          style={{ color: c.mutedForeground }}
        >
          <EditableText
            value={subheading || ""}
            placeholder="Подзаголовок"
            field="subheading"
            editable={editable}
            onContentChange={onContentChange}
          />
        </p>
      </div>

      <div className="flex-shrink-0 px-20 pb-10 flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{
            backgroundColor: c.primary,
            color: c.primaryForeground,
          }}
        >
          S
        </div>
        <div
          className="h-px flex-1"
          style={{ backgroundColor: c.muted === "#F5F5F7" ? "#E5E7EB" : c.muted }}
        />
      </div>
    </div>
  );
}
