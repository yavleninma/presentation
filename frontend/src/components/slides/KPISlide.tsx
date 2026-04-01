"use client";

import { SlideComponentProps } from "./SlideRenderer";
import { EditableText } from "../editor/EditableText";

export function KPISlide({ slide, template, editable, onContentChange }: SlideComponentProps) {
  const c = template.colors;
  const { heading, kpiValues, subheading } = slide.content;

  const kpis = kpiValues?.length
    ? kpiValues
    : [
        { value: "12.1M", label: "Клиентов", trend: "up" as const },
        { value: "98%", label: "Удовлетворённость", trend: "up" as const },
        { value: "24/7", label: "Поддержка", trend: "neutral" as const },
        { value: "Top 10", label: "Рейтинг", trend: "up" as const },
      ];

  const trendIcons = {
    up: "↑",
    down: "↓",
    neutral: "→",
  };

  const trendColors = {
    up: "#22C55E",
    down: c.primary,
    neutral: c.mutedForeground,
  };

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
            placeholder="Ключевые показатели"
            field="heading"
            editable={editable}
            onContentChange={onContentChange}
          />
        </h2>
        {(subheading || editable) && (
          <p
            className="text-[20px] mt-3 leading-relaxed"
            style={{ color: c.mutedForeground }}
          >
            <EditableText
              value={subheading || ""}
              placeholder="Описание"
              field="subheading"
              editable={editable}
              onContentChange={onContentChange}
            />
          </p>
        )}
      </div>

      {/* KPI cards grid */}
      <div
        className="flex-1 grid gap-8"
        style={{
          gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
        }}
      >
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="flex flex-col justify-center rounded-2xl px-8 py-10 relative overflow-hidden"
            style={{ backgroundColor: c.surface }}
          >
            {/* Decorative accent at top */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                backgroundColor: i === 0 ? c.primary : c.secondary,
                opacity: i > 1 ? 0.5 : 1,
              }}
            />

            <div className="flex items-baseline gap-2 mb-3">
              <span
                className="text-[48px] font-bold tracking-tight leading-none"
                style={{
                  color: c.foreground,
                  fontFamily: template.fonts.heading,
                }}
              >
                {kpi.value}
              </span>
              {kpi.trend && (
                <span
                  className="text-[20px] font-semibold"
                  style={{ color: trendColors[kpi.trend] }}
                >
                  {trendIcons[kpi.trend]}
                </span>
              )}
            </div>

            <span
              className="text-[16px] font-medium uppercase tracking-wider"
              style={{ color: c.mutedForeground }}
            >
              {kpi.label}
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex-shrink-0 text-[14px] font-medium tabular-nums pt-6"
        style={{ color: c.mutedForeground }}
      >
        {String(slide.order + 1).padStart(2, "0")}
      </div>
    </div>
  );
}
