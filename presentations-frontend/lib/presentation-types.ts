export type PrototypeScreen = "start" | "editor";

export type EntryPhase = "idle" | "chat" | "building";

export type HiddenBuildStage = "idle" | "fit-pass";

export type EditorDrawerState = "closed" | "open";

export type StorylineModeId = "progress" | "structure" | "choice";

export type RegenVariant = StorylineModeId;

export type ClarificationRole = "user" | "assistant";

export type ClarificationSlot =
  | "audience"
  | "keyMessage"
  | "desiredOutcome"
  | "factCoverage";

export type FactCoverageId = "enough" | "partial" | "thin";

export interface ClarificationMessage {
  id: string;
  role: ClarificationRole;
  text: string;
}

export interface ClarificationInsights {
  topicLabel: string;
  period: string;
  mode: StorylineModeId;
  audience: string | null;
  keyMessage: string | null;
  desiredOutcome: string | null;
  factCoverage: FactCoverageId;
  knownFacts: string[];
  missingFacts: string[];
}

export interface ClarificationSession {
  transcript: ClarificationMessage[];
  assistantTurns: number;
  confidence: number;
  readyToBuild: boolean;
  pendingSlot: ClarificationSlot | null;
  askedSlots: ClarificationSlot[];
  insights: ClarificationInsights;
}

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

export interface WorkingDraft {
  sourcePrompt: string;
  summary: string;
  topicLabel: string;
  audience: string;
  period: string;
  mode: StorylineModeId;
  goal: string;
  keyMessage: string;
  desiredOutcome: string;
  factCoverage: FactCoverageId;
  knownFacts: string[];
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
