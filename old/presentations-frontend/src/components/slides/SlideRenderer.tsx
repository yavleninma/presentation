"use client";

import React from "react";
import { Slide, PresentationTemplate } from "@/types/presentation";
import { TitleSlide } from "./TitleSlide";
import { SectionSlide } from "./SectionSlide";
import { ContentSlide } from "./ContentSlide";
import { TwoColumnsSlide } from "./TwoColumnsSlide";
import { ImageTextSlide } from "./ImageTextSlide";
import { KPISlide } from "./KPISlide";
import { TimelineSlide } from "./TimelineSlide";
import { QuoteSlide } from "./QuoteSlide";
import { FullImageSlide } from "./FullImageSlide";
import { ThankYouSlide } from "./ThankYouSlide";

interface SlideRendererProps {
  slide: Slide;
  template: PresentationTemplate;
  scale?: number;
  className?: string;
  editable?: boolean;
  onContentChange?: (field: string, value: string) => void;
}

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

const layoutComponents: Record<string, React.FC<SlideComponentProps>> = {
  title: TitleSlide,
  section: SectionSlide,
  content: ContentSlide,
  "two-columns": TwoColumnsSlide,
  "image-text": ImageTextSlide,
  kpi: KPISlide,
  timeline: TimelineSlide,
  quote: QuoteSlide,
  "full-image": FullImageSlide,
  "thank-you": ThankYouSlide,
};

export interface SlideComponentProps {
  slide: Slide;
  template: PresentationTemplate;
  editable?: boolean;
  onContentChange?: (field: string, value: string) => void;
}

function SlideBackground({
  template,
  variant = "light",
}: {
  template: PresentationTemplate;
  variant?: "light" | "dark" | "primary" | "accent";
}) {
  const c = template.colors;
  const bg =
    variant === "dark"
      ? c.accent
      : variant === "primary"
        ? c.primary
        : variant === "accent"
          ? c.accent
          : c.background;

  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: bg }} />
      {template.backgroundPattern === "geometric" && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.03]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="geo"
              x="0"
              y="0"
              width="120"
              height="120"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M60 0L120 60L60 120L0 60Z"
                fill="none"
                stroke={c.foreground}
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#geo)" />
        </svg>
      )}
      {template.backgroundPattern === "dots" && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.06]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="dots"
              x="0"
              y="0"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill={c.foreground} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      )}
      {template.backgroundPattern === "grid" && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M40 0H0V40"
                fill="none"
                stroke={c.foreground}
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      )}
    </>
  );
}

function SlideLogo({ template }: { template: PresentationTemplate }) {
  if (!template.logoUrl) return null;
  const pos = template.logoPosition ?? "top-left";
  const posClasses: Record<string, string> = {
    "top-left": "top-8 left-10",
    "top-right": "top-8 right-10",
    "bottom-left": "bottom-8 left-10",
    "bottom-right": "bottom-8 right-10",
  };
  return (
    <div className={`absolute ${posClasses[pos]} z-10`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={template.logoUrl}
        alt="Logo"
        className="h-8 w-auto object-contain"
      />
    </div>
  );
}

export function SlideRenderer({
  slide,
  template,
  scale,
  className = "",
  editable = false,
  onContentChange,
}: SlideRendererProps) {
  const Component = layoutComponents[slide.layout] ?? ContentSlide;

  return (
    <div
      className={`relative ${editable ? "select-auto" : "select-none"} ${className}`}
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        transform: scale ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
        fontFamily: template.fonts.body,
        overflow: "hidden",
      }}
    >
      <SlideBackground template={template} />
      <SlideLogo template={template} />
      <div className="relative z-10 w-full h-full">
        <Component
          slide={slide}
          template={template}
          editable={editable}
          onContentChange={onContentChange}
        />
      </div>
    </div>
  );
}

export { SLIDE_WIDTH, SLIDE_HEIGHT };
