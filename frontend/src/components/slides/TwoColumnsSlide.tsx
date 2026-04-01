"use client";

import { SlideComponentProps } from "./SlideRenderer";
import { EditableText } from "../editor/EditableText";

export function TwoColumnsSlide({ slide, template, editable, onContentChange }: SlideComponentProps) {
  const c = template.colors;
  const { heading, leftColumn, rightColumn } = slide.content;

  return (
    <div className="flex flex-col h-full px-20 pt-16 pb-12">
      <div className="flex-shrink-0 mb-10">
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
            placeholder="Сравнение"
            field="heading"
            editable={editable}
            onContentChange={onContentChange}
          />
        </h2>
      </div>

      <div className="flex-1 flex gap-16">
        <div className="flex-1 flex flex-col">
          <div
            className="flex items-center gap-3 mb-6 pb-4"
            style={{ borderBottom: `2px solid ${c.primary}` }}
          >
            <h3
              className="text-[22px] font-semibold"
              style={{ color: c.foreground, fontFamily: template.fonts.heading }}
            >
              <EditableText
                value={leftColumn?.heading || ""}
                placeholder="Первый пункт"
                field="leftColumn.heading"
                editable={editable}
                onContentChange={onContentChange}
              />
            </h3>
          </div>
          {leftColumn?.bullets && (
            <ul className="space-y-4">
              {leftColumn.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-2.5 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: c.primary }}
                  />
                  <span
                    className="text-[18px] leading-relaxed"
                    style={{ color: c.foreground }}
                  >
                    <EditableText
                      value={b}
                      placeholder="Пункт"
                      field={`leftColumn.bullets.${i}`}
                      editable={editable}
                      onContentChange={onContentChange}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="w-px self-stretch opacity-20"
          style={{ backgroundColor: c.foreground }}
        />

        <div className="flex-1 flex flex-col">
          <div
            className="flex items-center gap-3 mb-6 pb-4"
            style={{ borderBottom: `2px solid ${c.secondary}` }}
          >
            <h3
              className="text-[22px] font-semibold"
              style={{ color: c.foreground, fontFamily: template.fonts.heading }}
            >
              <EditableText
                value={rightColumn?.heading || ""}
                placeholder="Второй пункт"
                field="rightColumn.heading"
                editable={editable}
                onContentChange={onContentChange}
              />
            </h3>
          </div>
          {rightColumn?.bullets && (
            <ul className="space-y-4">
              {rightColumn.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-2.5 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: c.secondary }}
                  />
                  <span
                    className="text-[18px] leading-relaxed"
                    style={{ color: c.foreground }}
                  >
                    <EditableText
                      value={b}
                      placeholder="Пункт"
                      field={`rightColumn.bullets.${i}`}
                      editable={editable}
                      onContentChange={onContentChange}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div
        className="flex-shrink-0 text-[14px] font-medium tabular-nums pt-4"
        style={{ color: c.mutedForeground }}
      >
        {String(slide.order + 1).padStart(2, "0")}
      </div>
    </div>
  );
}
