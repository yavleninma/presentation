"use client";

import { SlideComponentProps } from "./SlideRenderer";
import { EditableText } from "../editor/EditableText";

export function TimelineSlide({ slide, template, editable, onContentChange }: SlideComponentProps) {
  const c = template.colors;
  const { heading, timelineItems } = slide.content;

  const items = timelineItems?.length
    ? timelineItems
    : [
        { year: "2014", title: "Основание", description: "Старт проекта" },
        { year: "2018", title: "Рост", description: "Масштабирование" },
        { year: "2022", title: "Лидерство", description: "Топ-10 рынка" },
        { year: "2025", title: "Будущее", description: "Новые горизонты" },
      ];

  return (
    <div className="flex flex-col h-full px-20 pt-16 pb-12">
      <div className="flex-shrink-0 mb-12">
        <div
          className="w-10 h-1 mb-5 rounded-full"
          style={{ backgroundColor: c.primary }}
        />
        <h2
          className="text-[40px] font-bold leading-tight tracking-tight"
          style={{ color: c.foreground, fontFamily: template.fonts.heading }}
        >
          <EditableText
            value={heading || ""}
            placeholder="История развития"
            field="heading"
            editable={editable}
            onContentChange={onContentChange}
          />
        </h2>
      </div>

      {/* Timeline */}
      <div className="flex-1 flex items-center">
        <div className="w-full relative">
          {/* Connecting line */}
          <div
            className="absolute left-0 right-0 h-px top-[28px]"
            style={{ backgroundColor: c.muted === "#F5F5F7" ? "#D1D5DB" : c.muted }}
          />

          <div
            className="grid gap-6 relative"
            style={{
              gridTemplateColumns: `repeat(${items.length}, 1fr)`,
            }}
          >
            {items.map((item, i) => (
              <div key={i} className="flex flex-col items-start">
                {/* Dot on timeline */}
                <div className="relative mb-8">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-[14px] font-bold"
                    style={{
                      backgroundColor: i === items.length - 1 ? c.primary : c.surface,
                      color: i === items.length - 1 ? c.primaryForeground : c.foreground,
                    }}
                  >
                    {item.year}
                  </div>
                </div>

                <h3
                  className="text-[22px] font-bold mb-2"
                  style={{
                    color: c.foreground,
                    fontFamily: template.fonts.heading,
                  }}
                >
                  {item.title}
                </h3>

                {item.description && (
                  <p
                    className="text-[16px] leading-relaxed"
                    style={{ color: c.mutedForeground }}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex-shrink-0 text-[14px] font-medium tabular-nums"
        style={{ color: c.mutedForeground }}
      >
        {String(slide.order + 1).padStart(2, "0")}
      </div>
    </div>
  );
}
