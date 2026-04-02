"use client";

import { SlideComponentProps } from "./SlideRenderer";
import { EditableText } from "../editor/EditableText";

export function ThankYouSlide({ slide, template, editable, onContentChange }: SlideComponentProps) {
  const c = template.colors;
  const { heading, contactEmail, contactPhone, contactWebsite } = slide.content;

  return (
    <div className="flex flex-col h-full relative">
      {/* Top accent */}
      <div
        className="w-full h-2 flex-shrink-0"
        style={{ backgroundColor: c.primary }}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-20 text-center">
        <div
          className="w-16 h-1 mb-10 rounded-full"
          style={{ backgroundColor: c.secondary }}
        />

        <h2
          className="text-[56px] font-bold tracking-tight mb-4"
          style={{ color: c.foreground, fontFamily: template.fonts.heading }}
        >
          <EditableText
            value={heading || ""}
            placeholder="Спасибо!"
            field="heading"
            editable={editable}
            onContentChange={onContentChange}
          />
        </h2>

        <p
          className="text-[22px] mb-12"
          style={{ color: c.mutedForeground }}
        >
          Готовы ответить на ваши вопросы
        </p>

        {/* Contact info */}
        <div className="flex items-center gap-10">
          {(contactEmail || editable) && (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: c.surface }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: c.primary }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span
                className="text-[18px]"
                style={{ color: c.foreground }}
              >
                <EditableText
                  value={contactEmail || ""}
                  placeholder="email@example.com"
                  field="contactEmail"
                  editable={editable}
                  onContentChange={onContentChange}
                />
              </span>
            </div>
          )}
          {(contactPhone || editable) && (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: c.surface }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: c.primary }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <span
                className="text-[18px]"
                style={{ color: c.foreground }}
              >
                <EditableText
                  value={contactPhone || ""}
                  placeholder="+7 (999) 123-45-67"
                  field="contactPhone"
                  editable={editable}
                  onContentChange={onContentChange}
                />
              </span>
            </div>
          )}
          {(contactWebsite || editable) && (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: c.surface }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: c.primary }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <span
                className="text-[18px]"
                style={{ color: c.foreground }}
              >
                <EditableText
                  value={contactWebsite || ""}
                  placeholder="example.com"
                  field="contactWebsite"
                  editable={editable}
                  onContentChange={onContentChange}
                />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 px-20 pb-10 flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: c.primary, color: c.primaryForeground }}
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
