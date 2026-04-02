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

export type MeetingScenarioId =
  | "steering-committee"
  | "quarterly-it-review"
  | "budget-defense"
  | "incident-risk-update"
  | "vendor-decision"
  | "program-recovery"
  | "update-previous-package";

export type ManagementSlideRole =
  | "inform"
  | "explain"
  | "compare"
  | "justify"
  | "escalate"
  | "recommend"
  | "decide"
  | "close";

export type SlideArchetype =
  | "headline-verdict"
  | "kpi-dashboard-commentary"
  | "progress-vs-plan"
  | "risk-heatmap"
  | "options-matrix"
  | "budget-waterfall"
  | "roadmap-milestones"
  | "incident-timeline"
  | "dependency-map"
  | "decision-slide"
  | "executive-summary"
  | "appendix-detail";

export type SlideConfidence = "high" | "medium" | "low";

export type SlideRegenerationIntent =
  | "tighten"
  | "shorten-for-execs"
  | "rewrite-for-cfo"
  | "remove-jargon"
  | "add-business-impact"
  | "make-risk-clearer"
  | "strengthen-evidence"
  | "offer-structure-alternatives"
  | "turn-into-decision-slide"
  | "strengthen-verdict";

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

export interface SlideMeta {
  role: ManagementSlideRole;
  archetype: SlideArchetype;
  audience: string;
  headlineVerdict: string;
  managementQuestion: string;
  decisionIntent: string;
  evidence: string[];
  confidence: SlideConfidence;
  whyThisSlide: string;
  storylinePosition?: string;
  regenerationIntents?: SlideRegenerationIntent[];
}

export interface Slide {
  id: string;
  order: number;
  layout: SlideLayoutType;
  content: SlideContent;
  notes?: string;
  meta?: SlideMeta;
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

export interface PresentationBrief {
  scenarioId: MeetingScenarioId;
  meetingName: string;
  audience: string;
  desiredOutcome: string;
  deadline?: string;
  mainThesis: string;
  leadershipAsk: string;
  workingWell: string;
  notWorking: string;
  criticalNumbers: string;
  risks: string;
  dependencies: string;
  sourceMaterial: string;
}

export interface ExtractionFinding {
  label: string;
  severity: "info" | "warning" | "critical";
  detail: string;
}

export interface NarrativeOption {
  id: string;
  title: string;
  rationale: string;
}

export interface OutlineSlide {
  title: string;
  layout: SlideLayoutType;
  keyPoints?: string[];
  speakerNotes?: string;
  meta?: SlideMeta;
}

export interface DecisionPackage {
  scenarioId: MeetingScenarioId;
  audienceLabel: string;
  executiveSummary: string;
  storylineOptions: NarrativeOption[];
  extractionFindings: ExtractionFinding[];
  followUpQuestions: string[];
  appendixSummary: string[];
}

export interface PresentationOutline {
  title: string;
  slides: OutlineSlide[];
  package: DecisionPackage;
}

export interface Presentation {
  id: string;
  title: string;
  prompt?: string;
  templateId: string;
  language: "ru" | "en";
  brief?: PresentationBrief;
  decisionPackage?: DecisionPackage;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
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
  | "briefing"
  | "outline-review"
  | "generating"
  | "polishing"
  | "complete"
  | "error";
