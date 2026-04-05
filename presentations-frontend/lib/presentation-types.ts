export type PrototypeScreen = "start" | "editor";

export type EntryPhase = "idle" | "chat" | "building";

export type BuildStatusId = "draft" | "structure" | "readability";

export type EditorDrawerState = "closed" | "open";

export type PresentationIntent = "update" | "explain" | "decision";

export type ClarificationRole = "user" | "assistant";

export type ClarificationSlot = "audience" | "desiredOutcome" | "knownFacts";

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

export type CanvasLayoutId = "hero" | "split" | "stack";

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
  | "clock";

export type SixSlotTuple<T> = [T, T, T, T, T, T];

export interface ClarificationMessage {
  id: string;
  role: ClarificationRole;
  text: string;
}

export interface SkeletonReadiness {
  audience: string | null;
  intent: PresentationIntent;
  desiredOutcome: string | null;
  knownFacts: string[];
  missingFacts: string[];
  confidence: number;
}

export interface ClarificationInsights {
  topicLabel: string;
  period: string;
  audience: string | null;
  presentationIntent: PresentationIntent;
  desiredOutcome: string | null;
  keyMessage: string | null;
  factCoverage: FactCoverageId;
  knownFacts: string[];
  missingFacts: string[];
  confidence: number;
  skeletonReadiness: SkeletonReadiness;
}

export interface ClarificationSession {
  transcript: ClarificationMessage[];
  assistantTurns: number;
  confidence: number;
  readyToBuild: boolean;
  pendingSlot: ClarificationSlot | null;
  askedSlots: ClarificationSlot[];
  insights: ClarificationInsights;
  skeletonReadiness: SkeletonReadiness;
}

export interface SlideBlock {
  id: string;
  type: SlideBlockType;
  icon: SlideBlockIconId;
  title: string;
  body: string;
  placeholder?: boolean;
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

export interface PresentationDraft {
  documentTitle: string;
  documentSubtitle: string;
  workingDraft: WorkingDraft;
  slides: PresentationSlide[];
  debug: PresentationDebugState;
}
