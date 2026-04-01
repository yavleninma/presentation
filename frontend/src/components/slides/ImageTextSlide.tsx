"use client";

import { SlideComponentProps } from "./SlideRenderer";
import { EditableText } from "../editor/EditableText";

export function ImageTextSlide({ slide, template, editable, onContentChange }: SlideComponentProps) {
  const c = template.colors;
  const { heading, bullets, body, imageUrl, imageQuery } = slide.content;

  return (
    <div className="flex h-full">
      <div className="w-[45%] relative overflow-hidden flex-shrink-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={heading || ""}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: c.surface }}
          >
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-3 opacity-30"
                style={{ color: c.surfaceForeground }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm opacity-40" style={{ color: c.surfaceForeground }}>
                {imageQuery || "Изображение"}
              </span>
            </div>
          </div>
        )}
        <div
          className="absolute inset-y-0 right-0 w-16"
          style={{
            background: `linear-gradient(to left, ${c.background}, transparent)`,
          }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center px-16 py-14">
        <div
          className="w-10 h-1 mb-6 rounded-full"
          style={{ backgroundColor: c.primary }}
        />

        <h2
          className="text-[36px] font-bold leading-tight tracking-tight mb-6"
          style={{ color: c.foreground, fontFamily: template.fonts.heading }}
        >
          <EditableText
            value={heading || ""}
            placeholder="Заголовок"
            field="heading"
            editable={editable}
            onContentChange={onContentChange}
          />
        </h2>

        {(body || editable) && (
          <p
            className="text-[18px] leading-relaxed mb-6"
            style={{ color: c.mutedForeground }}
          >
            <EditableText
              value={body || ""}
              placeholder="Текст"
              field="body"
              editable={editable}
              onContentChange={onContentChange}
            />
          </p>
        )}

        {bullets && bullets.length > 0 && (
          <ul className="space-y-4">
            {bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="mt-2 flex-shrink-0 w-2 h-2 rounded-full"
                  style={{ backgroundColor: c.primary }}
                />
                <span
                  className="text-[18px] leading-relaxed"
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

        <div
          className="text-[14px] font-medium tabular-nums mt-auto"
          style={{ color: c.mutedForeground }}
        >
          {String(slide.order + 1).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}
