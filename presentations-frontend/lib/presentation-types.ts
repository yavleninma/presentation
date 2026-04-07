export type PrototypeScreen =
  | "start"
  | "clarify"
  | "building"
  | "draft"
  | "editor";

export type EditorDrawerState = "closed" | "open";

export type PresentationIntent = "update" | "explain" | "decision";

export type FactCoverageId = "enough" | "partial" | "thin";

export type SlideId = string;

export type SlideFunctionId =
  | "cover"
  | "section"
  | "key_point"
  | "steps"
  | "evidence"
  | "comparison"
  | "audience"
  | "features"
  | "tension"
  | "next_step"
  | "detail"
  | "data"
  | "closing";

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
  | "comparison"
  | "section-divider"
  | "text-block"
  | "cards-row"
  | "list-slide"
  | "timeline"
  | "chart-bar"
  | "chart-progress"
  | "table-simple"
  | "image-text"
  | "closing";

export type TemplateId = "strict" | "cards" | "briefing" | "modern" | "corporate";

export type ColorThemeId = "slate" | "indigo" | "teal" | "sand" | "rose" | "emerald" | "violet" | "zinc";

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
  slidePlan: WorkingDraftSlidePlanEntry[];
  visibleSlideTitles: string[];
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
  index: number;
  slideFunctionId: SlideFunctionId;
  canvasLayoutId: CanvasLayoutId;
  railTitle: string;
  railRhythm: SlideToneId[];
  title: string;
  subtitle: string;
  blocks: SlideBlock[];
  drawerActions: SlideActionLabel[];
  lastTransformId: HiddenTransformId | null;
  backgroundImage?: string;
  imageCredit?: string;
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
  hiddenSlidePlan: WorkingDraftSlidePlanEntry[];
  chosenTransformIds: Record<SlideId, HiddenTransformId | null>;
  fitPassResultBySlide: Record<SlideId, FitPassResult>;
}

export interface SlideTextEntry {
  id: SlideId;
  railTitle: string;
  layoutType?: string;
  title: string;
  subtitle: string;
  bullets: string[];
  imageQuery?: string;
}

export interface DraftChatMessage {
  role: "user" | "assistant";
  text: string;
  kind?: "content" | "error";
}

export interface ClarifyAnswers {
  audience?: string;
  length?: "short" | "medium" | "long";
  style?: string;
  data?: string;
  outcome?: string;
}

export interface DraftSession {
  workingDraft: WorkingDraft;
  slideTexts: SlideTextEntry[];
  messages: DraftChatMessage[];
  quickReplies: string[];
  readyToGenerate: boolean;
  missingFacts: string[];
  summary: string;
  uploadedContent?: string;
  uploadedFileName?: string;
  clarifyAnswers?: ClarifyAnswers;
}

/** strict — укладка под демо-генератор; editor — тексты из модели/чата без жёсткой обрезки. */
export type DraftFitPassStrength = "strict" | "editor";

export interface PresentationDraft {
  documentTitle: string;
  documentSubtitle: string;
  workingDraft: WorkingDraft;
  slides: PresentationSlide[];
  slideSpeakerNotes: Partial<Record<SlideId, string>>;
  debug: PresentationDebugState;
  fitPassStrength?: DraftFitPassStrength;
}
