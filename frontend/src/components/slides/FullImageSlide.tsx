"use client";

import { SlideComponentProps } from "./SlideRenderer";
import { EditableText } from "../editor/EditableText";

export function FullImageSlide({ slide, template, editable, onContentChange }: SlideComponentProps) {
  const c = template.colors;
  const { heading, subheading, imageUrl } = slide.content;

  return (
    <div className="relative h-full w-full">
      {/* Background image */}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={heading || ""}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${c.accent} 0%, ${c.primary} 100%)`,
          }}
        />
      )}

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.05) 100%)",
        }}
      />

      {/* Content pinned to bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-20 pb-14">
        <div className="w-12 h-1 mb-6 rounded-full bg-white/80" />
        <h2
          className="text-[48px] font-bold leading-tight tracking-tight text-white mb-3"
          style={{ fontFamily: template.fonts.heading }}
        >
          <EditableText
            value={heading || ""}
            placeholder="Визуальный слайд"
            field="heading"
            editable={editable}
            onContentChange={onContentChange}
          />
        </h2>
        <p className="text-[22px] leading-relaxed text-white/70 max-w-[700px]">
          <EditableText
            value={subheading || ""}
            placeholder="Подзаголовок"
            field="subheading"
            editable={editable}
            onContentChange={onContentChange}
          />
        </p>
      </div>

      {/* Slide number */}
      <div className="absolute bottom-14 right-20 text-[14px] font-medium tabular-nums text-white/40">
        {String(slide.order + 1).padStart(2, "0")}
      </div>
    </div>
  );
}
