export type SlideLayoutType =
  | "title"
  | "section"
  | "content"
  | "two-columns"
  | "image-text"
  | "kpi"
  | "timeline"
  | "quote"
  | "full-image"
  | "thank-you";

export interface KPIValue {
  value: string;
  label: string;
  trend?: "up" | "down" | "neutral";
}

export interface TimelineItem {
  year: string;
  title: string;
  description?: string;
}

export interface SlideContent {
  heading?: string;
  subheading?: string;
  body?: string;
  bullets?: string[];
  imageUrl?: string;
  imageQuery?: string;
  kpiValues?: KPIValue[];
  timelineItems?: TimelineItem[];
  quoteText?: string;
  quoteAuthor?: string;
  quoteRole?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWebsite?: string;
  leftColumn?: { heading?: string; bullets?: string[] };
  rightColumn?: { heading?: string; bullets?: string[] };
}

export interface Slide {
  id: string;
  order: number;
  layout: SlideLayoutType;
  content: SlideContent;
  notes?: string;
  overrides?: Partial<ThemeColors>;
}

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  surface: string;
  surfaceForeground: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
  mono: string;
}

export interface ThemeSpacing {
  slidePadding: number;
  elementGap: number;
}

export interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
  logoUrl?: string;
  logoPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  backgroundPattern?: "none" | "dots" | "grid" | "gradient" | "geometric";
}

export interface Presentation {
  id: string;
  title: string;
  prompt?: string;
  templateId: string;
  language: "ru" | "en";
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
}

export interface OutlineSlide {
  title: string;
  layout: SlideLayoutType;
  keyPoints?: string[];
  speakerNotes?: string;
}

export interface PresentationOutline {
  title: string;
  slides: OutlineSlide[];
}

export type GenerationStatusEventType =
  | "thinking"
  | "researching"
  | "slide_start"
  | "image_search"
  | "polishing";

export interface GenerationStatusEvent {
  type: GenerationStatusEventType;
  message: string;
  detail?: string;
  progress?: number;
  slideIndex?: number;
  totalSlides?: number;
  slideTitle?: string;
}

export type GenerationPhase =
  | "idle"
  | "outline-review"
  | "generating"
  | "polishing"
  | "complete"
  | "error";
