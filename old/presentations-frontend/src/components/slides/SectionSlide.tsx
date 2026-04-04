"use client";

import { SlideComponentProps } from "./SlideRenderer";
import { EditableText } from "../editor/EditableText";

export function SectionSlide({ slide, template, editable, onContentChange }: SlideComponentProps) {
  const c = template.colors;
  const { heading, subheading } = slide.content;

  return (
    <div
      className="flex flex-col items-start justify-center h-full px-20 relative"
      style={{ backgroundColor: c.accent, color: c.accentForeground }}
    >
      <div
        className="absolute top-12 right-16 text-[200px] font-black leading-none opacity-[0.06] select-none"
        style={{ fontFamily: template.fonts.heading }}
      >
        {String(slide.order + 1).padStart(2, "0")}
      </div>

      <div
        className="w-14 h-1 mb-8 rounded-full"
        style={{ backgroundColor: c.primary }}
      />

      <h2
        className="text-[52px] font-bold leading-[1.1] tracking-tight mb-4"
        style={{ fontFamily: template.fonts.heading }}
      >
        <EditableText
          value={heading || ""}
          placeholder="Новый раздел"
          field="heading"
          editable={editable}
          onContentChange={onContentChange}
        />
      </h2>

      <p className="text-[22px] leading-relaxed opacity-70 max-w-[600px]">
        <EditableText
          value={subheading || ""}
          placeholder="Описание раздела"
          field="subheading"
          editable={editable}
          onContentChange={onContentChange}
        />
      </p>
    </div>
  );
}
