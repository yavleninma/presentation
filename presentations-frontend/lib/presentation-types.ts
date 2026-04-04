export type PrototypeScreen = "start" | "clarify" | "editor";

export type HiddenBuildStage = "idle" | "fit-pass";

export type EditorDrawerState = "closed" | "open";

export type ClarifyFocusId = "update" | "explain" | "decision";

export type ClarifyDepthId = "signal" | "detail";

export type RegenVariant = ClarifyFocusId;

export type SlideLayout =
  | "cover"
  | "summary"
  | "changes"
  | "evidence"
  | "risks"
  | "next-step";

export type ToneId = "primary" | "success" | "warning" | "neutral";

export type TemplateId = "strict" | "rhythm" | "signal";

export type ColorId = "cobalt" | "graphite" | "sage";

export interface ClarifyState {
  focus: ClarifyFocusId;
  depth: ClarifyDepthId;
}

export interface WorkingDraft {
  sourcePrompt: string;
  topicLabel: string;
  audience: string;
  period: string;
  focus: ClarifyFocusId;
  depth: ClarifyDepthId;
  goal: string;
  decisionNeeded: string;
  coreMessage: string;
  missingFacts: string[];
}

export interface SlideBlock {
  id: string;
  title: string;
  body?: string;
  items?: string[];
  emphasis?: string;
  tone: ToneId;
  placeholder?: boolean;
}

export interface SlideAsk {
  title: string;
  body: string;
}

export interface PresentationSlide {
  id: SlideLayout;
  index: string;
  shortLabel: string;
  layout: SlideLayout;
  title: string;
  subtitle: string;
  blocks: SlideBlock[];
  speakerNote?: string;
  ask?: SlideAsk;
}

export interface PresentationDraft {
  documentTitle: string;
  documentSubtitle: string;
  activeVariant: RegenVariant;
  workingDraft: WorkingDraft;
  slides: PresentationSlide[];
  missingFacts: string[];
  fitPassNotes: string[];
}
