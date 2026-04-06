export type PrototypeScreen =
  | "start"
  | "clarify"
  | "building"
  | "draft"
  | "editor";

export type EditorDrawerState = "closed" | "open";

export type PresentationIntent = "update" | "explain" | "decision";

export type FactCoverageId = "enough" | "partial" | "thin";

export type SlideSlotId = 1 | 2 | 3 | 4 | 5 | 6;

export type SlideId =
  | "slide-1"
  | "slide-2"
  | "slide-3"
  | "slide-4"
  | "slide-5"
  | "slide-6";

export type SlideFunctionId =
  | "open_topic"
  | "main_point"
  | "movement"
  | "evidence"
  | "tension"
  | "next_step";

export type HiddenTransformId =
  | "status_shift"
  | "breakdown_explain"
  | "decision_next";

export type CanvasLayoutId =
  | "hero"
  | "split"
  | "stack"
  | "cover"
  | "metrics"
  | "steps"
  | "checklist"
  | "personas"
  | "features"
  | "stat-focus"
  | "quote"
  | "comparison";

export type TemplateId = "strict" | "cards" | "briefing";

export type ColorThemeId = "slate" | "indigo" | "teal" | "sand";

export type TemplateIconPackId =
  | "outline"
  | "solid-minimal"
  | "duotone-minimal";

export type SlideToneId = "primary" | "success" | "warning" | "neutral";

export type SlideBlockType =
  | "focus"
  | "fact"
  | "movement"
  | "proof"
  | "constraint"
  | "decision";

export type SlideBlockIconId =
  | "spark"
  | "file"
  | "trend"
  | "shield"
  | "flag"
  | "gap"
  | "arrow"
  | "clock"
  | "chart"
  | "people"
  | "star"
  | "warning"
  | "rocket"
  | "check";

export type SixSlotTuple<T> = [T, T, T, T, T, T];

export interface SlideBlock {
  id: string;
  type: SlideBlockType;
  icon: SlideBlockIconId;
  title: string;
  body: string;
  placeholder?: boolean;
  metric?: string;
  stepNumber?: string;
  tagline?: string;
}

export interface WorkingDraftSlidePlanEntry {
  slotId: SlideSlotId;
  slideFunctionId: SlideFunctionId;
  canvasLayoutId: CanvasLayoutId;
  coreMessage: string;
  blockPlan: SlideBlock[];
  placeholderPlan: string[];
  speakerAngle?: string;
  lastTransformId: HiddenTransformId | null;
}

export interface WorkingDraft {
  sourcePrompt: string;
  audience: string;
  presentationIntent: PresentationIntent;
  desiredOutcome: string;
  knownFacts: string[];
  missingFacts: string[];
  confidence: number;
  slidePlan: SixSlotTuple<WorkingDraftSlidePlanEntry>;
  visibleSlideTitles: SixSlotTuple<string>;
  templateId: TemplateId;
  colorThemeId: ColorThemeId;
}

export interface SlideActionLabel {
  id: string;
  label: string;
  transformId: HiddenTransformId;
}

export interface PresentationSlide {
  id: SlideId;
  slotId: SlideSlotId;
  slideFunctionId: SlideFunctionId;
  canvasLayoutId: CanvasLayoutId;
  index: string;
  railTitle: string;
  railRhythm: SlideToneId[];
  title: string;
  subtitle: string;
  blocks: SlideBlock[];
  drawerActions: SlideActionLabel[];
  lastTransformId: HiddenTransformId | null;
}

export interface FitPassResult {
  slideId: SlideId;
  overflowWidthRisk: boolean;
  overflowHeightRisk: boolean;
  titleShortened: boolean;
  textCompressed: boolean;
  blockTrimmed: boolean;
  secondaryMoved: boolean;
  placeholderVisible: boolean;
  iconConsistent: boolean;
  contrastSafe: boolean;
  rhythmSafe: boolean;
  repaired: boolean;
  notes: string[];
}

export interface PresentationDebugState {
  currentWorkingDraft: WorkingDraft;
  hiddenSlidePlan: SixSlotTuple<WorkingDraftSlidePlanEntry>;
  chosenTransformIds: Record<SlideId, HiddenTransformId | null>;
  fitPassResultBySlide: Record<SlideId, FitPassResult>;
}

export interface SlideTextEntry {
  id: SlideId;
  railTitle: string;
  title: string;
  subtitle: string;
  bullets: string[];
}

export interface DraftChatMessage {
  role: "user" | "assistant";
  text: string;
  kind?: "content" | "error";
}

export interface DraftSession {
  workingDraft: WorkingDraft;
  slideTexts: SlideTextEntry[];
  messages: DraftChatMessage[];
  quickReplies: string[];
  readyToGenerate: boolean;
  missingFacts: string[];
  summary: string;
}

export interface PresentationDraft {
  documentTitle: string;
  documentSubtitle: string;
  workingDraft: WorkingDraft;
  slides: PresentationSlide[];
  slideSpeakerNotes: Partial<Record<SlideId, string>>;
  debug: PresentationDebugState;
}
