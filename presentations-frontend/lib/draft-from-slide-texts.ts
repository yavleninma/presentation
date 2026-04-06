import type {
  CanvasLayoutId,
  ColorThemeId,
  PresentationDraft,
  PresentationSlide,
  SlideActionLabel,
  SlideBlock,
  SlideFunctionId,
  SlideSlotId,
  SlideTextEntry,
  SlideToneId,
  TemplateId,
  WorkingDraft,
} from "@/lib/presentation-types";
import { extractTopicLabel } from "@/lib/prompt-analysis";

const DEFAULT_TEMPLATE: TemplateId = "cards";
const DEFAULT_COLOR_THEME: ColorThemeId = "indigo";

const SLIDE_FN_BY_SLOT: SlideFunctionId[] = [
  "open_topic",
  "main_point",
  "movement",
  "evidence",
  "tension",
  "next_step",
];

const CANVAS_LAYOUT_BY_SLOT: CanvasLayoutId[] = [
  "cover",
  "metrics",
  "steps",
  "checklist",
  "personas",
  "features",
];

const BLOCK_ICONS = ["spark", "file", "trend", "shield", "flag", "arrow"] as const;

function tuple6<T>(items: readonly T[]) {
  if (items.length !== 6) {
    throw new Error(`Expected 6 items, got ${items.length}`);
  }

  return items as [T, T, T, T, T, T];
}

function buildBlocksForLayout(layout: CanvasLayoutId, entry: SlideTextEntry): SlideBlock[] {
  if (layout === "metrics") {
    return entry.bullets.slice(0, 3).map((bullet, bi) => {
      const sepIdx = bullet.indexOf(" — ");
      const metric = sepIdx !== -1 ? bullet.slice(0, sepIdx).trim() : null;
      const title = sepIdx !== -1 ? bullet.slice(sepIdx + 3).trim() : bullet;
      return {
        id: `${entry.id}-block-${bi}`,
        type: (bi === 0 ? "focus" : "fact") as SlideBlock["type"],
        icon: "trend" as SlideBlock["icon"],
        title,
        body: "",
        ...(metric ? { metric } : {}),
      };
    });
  }

  if (layout === "steps") {
    return entry.bullets.slice(0, 3).map((bullet, bi) => {
      const match = bullet.match(/^(0[1-9]|\d{2})\s+(.+)$/);
      const stepNumber = match ? match[1] : String(bi + 1).padStart(2, "0");
      const title = match ? match[2] : bullet;
      return {
        id: `${entry.id}-block-${bi}`,
        type: "movement" as SlideBlock["type"],
        icon: "arrow" as SlideBlock["icon"],
        title,
        body: "",
        stepNumber,
      };
    });
  }

  if (layout === "personas") {
    return entry.bullets.slice(0, 3).map((bullet, bi) => {
      const sepIdx = bullet.indexOf(" — ");
      const title = sepIdx !== -1 ? bullet.slice(0, sepIdx).trim() : bullet;
      const tagline = sepIdx !== -1 ? bullet.slice(sepIdx + 3).trim() : "";
      return {
        id: `${entry.id}-block-${bi}`,
        type: (bi === 0 ? "focus" : "fact") as SlideBlock["type"],
        icon: "people" as SlideBlock["icon"],
        title,
        body: tagline,
        ...(tagline ? { tagline } : {}),
      };
    });
  }

  if (layout === "features") {
    return entry.bullets.map((bullet, bi) => ({
      id: `${entry.id}-block-${bi}`,
      type: "decision" as SlideBlock["type"],
      icon: "arrow" as SlideBlock["icon"],
      title: bullet,
      body: "",
    }));
  }

  if (layout === "checklist") {
    return entry.bullets.map((bullet, bi) => ({
      id: `${entry.id}-block-${bi}`,
      type: "fact" as SlideBlock["type"],
      icon: "check" as SlideBlock["icon"],
      title: bullet,
      body: "",
    }));
  }

  return entry.bullets.map((bullet, bi) => ({
    id: `${entry.id}-block-${bi}`,
    type: (bi === 0 ? "focus" : "fact") as SlideBlock["type"],
    icon: BLOCK_ICONS[bi % BLOCK_ICONS.length],
    title: bullet,
    body: "",
  }));
}

function slideTextEntryToSlide(entry: SlideTextEntry, index: number): PresentationSlide {
  const slotId = (index + 1) as SlideSlotId;
  const slideFunctionId = SLIDE_FN_BY_SLOT[index] ?? "main_point";
  const canvasLayoutId = CANVAS_LAYOUT_BY_SLOT[index] ?? "hero";
  const blocks = buildBlocksForLayout(canvasLayoutId, entry);

  const drawerActions: SlideActionLabel[] = [
    {
      id: `${slideFunctionId}-status_shift`,
      label: "Апдейт статуса",
      transformId: "status_shift",
    },
    {
      id: `${slideFunctionId}-breakdown_explain`,
      label: "Объяснить подробнее",
      transformId: "breakdown_explain",
    },
    {
      id: `${slideFunctionId}-decision_next`,
      label: "Добиться решения",
      transformId: "decision_next",
    },
  ];

  return {
    id: entry.id,
    slotId,
    slideFunctionId,
    canvasLayoutId,
    index: String(slotId).padStart(2, "0"),
    railTitle: `${slotId} — ${entry.railTitle}`,
    railRhythm: (
      ["primary", "neutral", "neutral", "neutral"] as SlideToneId[]
    ).slice(0, blocks.length),
    title: entry.title,
    subtitle: entry.subtitle,
    blocks,
    drawerActions,
    lastTransformId: null,
  };
}

export function buildDraftFromSlideTexts(
  slideTexts: SlideTextEntry[],
  sourcePrompt: string,
  appearance: { templateId?: TemplateId; colorThemeId?: ColorThemeId } = {}
): PresentationDraft {
  const templateId: TemplateId = appearance.templateId ?? DEFAULT_TEMPLATE;
  const colorThemeId: ColorThemeId = appearance.colorThemeId ?? DEFAULT_COLOR_THEME;
  const slides = slideTexts.slice(0, 6).map((entry, i) => slideTextEntryToSlide(entry, i));
  const firstSlide = slideTexts[0];
  const documentTitle =
    firstSlide?.title || extractTopicLabel(sourcePrompt) || "Рабочая презентация";

  const dummyWorkingDraft: WorkingDraft = {
    sourcePrompt,
    audience: "Руководитель",
    presentationIntent: "update",
    desiredOutcome: "",
    knownFacts: [],
    missingFacts: [],
    confidence: 0.8,
    slidePlan: tuple6(
      SLIDE_FN_BY_SLOT.map((fn, index) => {
        const slotId = (index + 1) as SlideSlotId;
        return {
          slotId,
          slideFunctionId: fn,
          canvasLayoutId: CANVAS_LAYOUT_BY_SLOT[index] ?? "hero",
          coreMessage: slideTexts[index]?.title ?? "",
          blockPlan: (slideTexts[index]?.bullets ?? []).map((bullet, bulletIndex) => ({
            id: `slide-${slotId}-block-${bulletIndex}`,
            type: bulletIndex === 0 ? "focus" : ("fact" as SlideBlock["type"]),
            icon: "spark" as SlideBlock["icon"],
            title: bullet,
            body: "",
          })),
          placeholderPlan: [],
          speakerAngle: undefined,
          lastTransformId: null,
        };
      })
    ),
    visibleSlideTitles: tuple6(
      slideTexts.map((slide) => slide.title).slice(0, 6) as [
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    ),
    templateId,
    colorThemeId,
  };

  return {
    documentTitle,
    documentSubtitle: sourcePrompt.slice(0, 80),
    workingDraft: dummyWorkingDraft,
    slides,
    slideSpeakerNotes: {},
    debug: {
      currentWorkingDraft: dummyWorkingDraft,
      hiddenSlidePlan: dummyWorkingDraft.slidePlan,
      chosenTransformIds: {} as PresentationDraft["debug"]["chosenTransformIds"],
      fitPassResultBySlide: {} as PresentationDraft["debug"]["fitPassResultBySlide"],
    },
  };
}
