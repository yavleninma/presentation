"use client";

import { SlideComponentProps } from "./SlideRenderer";
import { EditableText } from "../editor/EditableText";

export function ContentSlide({ slide, template, editable, onContentChange }: SlideComponentProps) {
  const c = template.colors;
  const { heading, bullets, body } = slide.content;

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
            placeholder="Заголовок слайда"
            field="heading"
            editable={editable}
            onContentChange={onContentChange}
          />
        </h2>
      </div>

      <div className="flex-1 flex flex-col justify-start">
        {(body || editable) && (
          <p
            className="text-[20px] leading-relaxed mb-8 max-w-[900px]"
            style={{ color: c.mutedForeground }}
          >
            <EditableText
              value={body || ""}
              placeholder="Текст слайда"
              field="body"
              editable={editable}
              onContentChange={onContentChange}
            />
          </p>
        )}

        {bullets && bullets.length > 0 && (
          <ul className="space-y-5">
            {bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-4">
                <span
                  className="mt-2 flex-shrink-0 w-2 h-2 rounded-full"
                  style={{ backgroundColor: c.primary }}
                />
                <span
                  className="text-[20px] leading-relaxed"
                  style={{ color: c.foreground }}
                >
                  <EditableText
                    value={bullet}
                    placeholder="Пункт"
                    field={`bullets.${i}`}
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
        className="flex-shrink-0 text-[14px] font-medium tabular-nums"
        style={{ color: c.mutedForeground }}
      >
        {String(slide.order + 1).padStart(2, "0")}
      </div>
    </div>
  );
}
