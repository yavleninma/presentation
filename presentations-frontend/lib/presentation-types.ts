export type PrototypeScreen =
  | "start"
  | "understanding"
  | "outline"
  | "building"
  | "editor";

export type SlideLayout =
  | "cover"
  | "summary"
  | "metrics"
  | "work"
  | "risks"
  | "next-step";

export type ToneId = "primary" | "success" | "warning" | "danger";

export interface RequestUnderstanding {
  period: string;
  team: string;
  audience: string;
  goal: string;
  tone: string;
  sourceSummary: string;
}

export interface SlideMetric {
  label: string;
  value: string;
  note: string;
  tone: ToneId;
  placeholder?: boolean;
}

export interface SlidePanel {
  title: string;
  body: string;
  items?: string[];
  tone?: ToneId;
  badge?: string;
}

export interface SlideAsk {
  title: string;
  body: string;
}

export interface PresentationSlide {
  id: string;
  index: string;
  shortLabel: string;
  layout: SlideLayout;
  eyebrow: string;
  title: string;
  subtitle: string;
  lead: string;
  bullets?: string[];
  metrics?: SlideMetric[];
  panels?: SlidePanel[];
  ask?: SlideAsk;
  missingFacts?: string[];
}

export interface OutlineStep {
  id: string;
  index: string;
  title: string;
  purpose: string;
}

export interface BuildStage {
  id: string;
  title: string;
  detail: string;
}

export interface PresentationDraft {
  documentTitle: string;
  documentSubtitle: string;
  scenarioLabel: string;
  understanding: RequestUnderstanding;
  outline: OutlineStep[];
  buildStages: BuildStage[];
  slides: PresentationSlide[];
  missingFacts: string[];
}
