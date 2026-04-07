import {
  buildPresentationDraft,
  runFitPassOnDraft,
} from "@/lib/demo-generator";
import type {
  CanvasLayoutId,
  PresentationDraft,
  PresentationSlide,
  SlideBlock,
  SlideTextEntry,
  SlideToneId,
  WorkingDraft,
  WorkingDraftSlidePlanEntry,
  SlideFunctionId,
} from "@/lib/presentation-types";

const BLOCK_ICONS = ["spark", "file", "trend", "shield", "flag", "arrow"] as const;

const LAYOUT_TYPE_TO_CANVAS: Record<string, CanvasLayoutId> = {
  cover: "cover",
  metrics: "metrics",
  steps: "steps",
  checklist: "checklist",
  comparison: "comparison",
  personas: "personas",
  features: "features",
  "stat-focus": "stat-focus",
  quote: "quote",
  "section-divider": "section-divider",
  "text-block": "text-block",
  "cards-row": "cards-row",
  "list-slide": "list-slide",
  timeline: "timeline",
  "chart-bar": "chart-bar",
  "chart-progress": "chart-progress",
  "table-simple": "table-simple",
  "image-text": "image-text",
  closing: "closing",
};

const LAYOUT_TYPE_TO_FUNCTION: Record<string, SlideFunctionId> = {
  cover: "cover",
  metrics: "key_point",
  steps: "steps",
  checklist: "evidence",
  comparison: "comparison",
  personas: "audience",
  features: "next_step",
  "stat-focus": "key_point",
  quote: "tension",
  "section-divider": "section",
  "text-block": "detail",
  "cards-row": "detail",
  "list-slide": "evidence",
  timeline: "steps",
  "chart-bar": "data",
  "chart-progress": "data",
  "table-simple": "data",
  "image-text": "detail",
  closing: "closing",
};

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

  if (layout === "section-divider") {
    return [{
      id: `${entry.id}-block-0`,
      type: "focus" as SlideBlock["type"],
      icon: "spark" as SlideBlock["icon"],
      title: entry.bullets[0] ?? entry.title,
      body: entry.bullets.slice(1).join("\n").trim(),
    }];
  }

  if (layout === "text-block") {
    return entry.bullets.slice(0, 3).map((bullet, bi) => ({
      id: `${entry.id}-block-${bi}`,
      type: "fact" as SlideBlock["type"],
      icon: "file" as SlideBlock["icon"],
      title: "",
      body: bullet,
    }));
  }

  if (layout === "cards-row") {
    return entry.bullets.slice(0, 5).map((bullet, bi) => ({
      id: `${entry.id}-block-${bi}`,
      type: "fact" as SlideBlock["type"],
      icon: BLOCK_ICONS[bi % BLOCK_ICONS.length],
      title: bullet,
      body: "",
    }));
  }

  if (layout === "list-slide") {
    return entry.bullets.slice(0, 8).map((bullet, bi) => ({
      id: `${entry.id}-block-${bi}`,
      type: "fact" as SlideBlock["type"],
      icon: "file" as SlideBlock["icon"],
      title: bullet,
      body: "",
    }));
  }

  if (layout === "timeline") {
    return entry.bullets.slice(0, 6).map((bullet, bi) => {
      const sepIdx = bullet.indexOf(" — ");
      const tagline = sepIdx !== -1 ? bullet.slice(0, sepIdx).trim() : undefined;
      const title = sepIdx !== -1 ? bullet.slice(sepIdx + 3).trim() : bullet;
      return {
        id: `${entry.id}-block-${bi}`,
        type: (bi === 0 ? "focus" : "movement") as SlideBlock["type"],
        icon: "trend" as SlideBlock["icon"],
        title,
        body: "",
        ...(tagline ? { tagline } : {}),
      };
    });
  }

  if (layout === "chart-bar" || layout === "chart-progress") {
    return entry.bullets.slice(0, 8).map((bullet, bi) => {
      const sepIdx = bullet.indexOf(" — ");
      const metric = sepIdx !== -1 ? bullet.slice(0, sepIdx).trim() : undefined;
      const title = sepIdx !== -1 ? bullet.slice(sepIdx + 3).trim() : bullet;
      return {
        id: `${entry.id}-block-${bi}`,
        type: "fact" as SlideBlock["type"],
        icon: "trend" as SlideBlock["icon"],
        title,
        body: "",
        ...(metric ? { metric } : {}),
      };
    });
  }

  if (layout === "table-simple") {
    return entry.bullets.map((bullet, bi) => ({
      id: `${entry.id}-block-${bi}`,
      type: "fact" as SlideBlock["type"],
      icon: "file" as SlideBlock["icon"],
      title: "",
      body: bullet,
    }));
  }

  if (layout === "image-text") {
    return entry.bullets.map((bullet, bi) => ({
      id: `${entry.id}-block-${bi}`,
      type: (bi === 0 ? "focus" : "fact") as SlideBlock["type"],
      icon: "file" as SlideBlock["icon"],
      title: bullet,
      body: "",
    }));
  }

  if (layout === "closing") {
    return [{
      id: `${entry.id}-block-0`,
      type: "decision" as SlideBlock["type"],
      icon: "flag" as SlideBlock["icon"],
      title: entry.bullets[0] ?? "",
      body: entry.bullets.slice(1).join("\n").trim(),
    }];
  }

  return entry.bullets.map((bullet, bi) => ({
    id: `${entry.id}-block-${bi}`,
    type: (bi === 0 ? "focus" : "fact") as SlideBlock["type"],
    icon: BLOCK_ICONS[bi % BLOCK_ICONS.length],
    title: bullet,
    body: "",
  }));
}

function blocksFromSlideTextEntry(
  slide: PresentationSlide,
  entry: SlideTextEntry,
): SlideBlock[] {
  const layout = slide.canvasLayoutId;
  const base = slide.blocks;
  const b = entry.bullets;

  if (layout === "cover" && base[0]) {
    const meta = b.filter(Boolean).join(" · ");
    return [{ ...base[0], body: meta || base[0].body }];
  }

  if (layout === "stat-focus") {
    const main = base[0] ? { ...base[0] } : null;
    const support = base[1] ? { ...base[1] } : null;
    const line0 = b[0];
    if (main && line0) {
      const sep = line0.indexOf(" — ");
      if (sep !== -1) {
        main.metric = line0.slice(0, sep).trim();
        main.title = line0.slice(sep + 3).trim();
      } else {
        main.title = line0;
      }
    }
    if (support && b.length > 1) {
      support.body = b.slice(1).join("\n").trim() || support.body;
    }
    return [main, support].filter(Boolean) as SlideBlock[];
  }

  if (layout === "quote") {
    const quoteBlock = base[0] ? { ...base[0] } : null;
    const supportBlock = base[1] ? { ...base[1] } : null;
    if (quoteBlock && b[0]) {
      quoteBlock.body = b[0];
      if (b[1]) {
        quoteBlock.tagline = b[1];
      }
    }
    if (supportBlock) {
      if (b.length >= 3) {
        supportBlock.title = b[2] ?? supportBlock.title;
        supportBlock.body =
          b.slice(3).join("\n").trim() || supportBlock.body;
      } else if (b[1]) {
        supportBlock.body = b[1];
      }
    }
    return [quoteBlock, supportBlock].filter(Boolean) as SlideBlock[];
  }

  if (layout === "comparison") {
    const left = base[0] ? { ...base[0] } : null;
    const right = base[1] ? { ...base[1] } : null;
    if (left) {
      if (b[0]) {
        left.title = b[0];
      }
      if (b[1]) {
        left.body = b[1];
      }
    }
    if (right) {
      if (b[2]) {
        right.title = b[2];
      }
      if (b[3]) {
        right.body = b[3];
      }
    }
    return [left, right].filter(Boolean) as SlideBlock[];
  }

  return buildBlocksForLayout(layout, entry);
}

function buildRailRhythm(length: number) {
  return (["primary", "neutral", "neutral", "neutral"] as SlideToneId[]).slice(
    0,
    Math.max(length, 1),
  );
}

function resolveCanvasLayout(entry: SlideTextEntry, fallback: CanvasLayoutId): CanvasLayoutId {
  if (entry.layoutType && LAYOUT_TYPE_TO_CANVAS[entry.layoutType]) {
    return LAYOUT_TYPE_TO_CANVAS[entry.layoutType];
  }
  return fallback;
}

function resolveSlideFunction(entry: SlideTextEntry, fallback: SlideFunctionId): SlideFunctionId {
  if (entry.layoutType && LAYOUT_TYPE_TO_FUNCTION[entry.layoutType]) {
    return LAYOUT_TYPE_TO_FUNCTION[entry.layoutType];
  }
  return fallback;
}

export function buildDraftFromSlideTexts(
  slideTexts: SlideTextEntry[],
  workingDraft: WorkingDraft,
  options: {
    documentTitle?: string;
    slideSpeakerNotes?: PresentationDraft["slideSpeakerNotes"];
  } = {},
): PresentationDraft {
  const expandedWorkingDraft = ensureSlidePlanLength(workingDraft, slideTexts.length);
  const baseDraft = buildPresentationDraft(expandedWorkingDraft, options);

  const slides: PresentationSlide[] = slideTexts.map((entry, index) => {
    const baseSlide = baseDraft.slides[index];

    if (baseSlide) {
      const layout = resolveCanvasLayout(entry, baseSlide.canvasLayoutId);
      const slideWithLayout = { ...baseSlide, canvasLayoutId: layout };
      const blocks = blocksFromSlideTextEntry(slideWithLayout, entry);

      return {
        ...slideWithLayout,
        railTitle: `${index + 1} — ${entry.railTitle}`,
        title: entry.title,
        subtitle: entry.subtitle,
        blocks,
        railRhythm: buildRailRhythm(blocks.length),
      };
    }

    const layout = resolveCanvasLayout(entry, "features");
    const fn = resolveSlideFunction(entry, "detail");
    const blocks = buildBlocksForLayout(layout, entry);

    return {
      id: entry.id,
      index,
      slideFunctionId: fn,
      canvasLayoutId: layout,
      railTitle: `${index + 1} — ${entry.railTitle}`,
      title: entry.title,
      subtitle: entry.subtitle,
      blocks,
      drawerActions: [],
      lastTransformId: null,
      railRhythm: buildRailRhythm(blocks.length),
    };
  });

  return runFitPassOnDraft({
    ...baseDraft,
    documentTitle:
      options.documentTitle ?? slideTexts[0]?.title ?? baseDraft.documentTitle,
    slides,
    slideSpeakerNotes: options.slideSpeakerNotes ?? baseDraft.slideSpeakerNotes,
    fitPassStrength: "editor",
    workingDraft: expandedWorkingDraft,
  });
}

function ensureSlidePlanLength(workingDraft: WorkingDraft, targetLength: number): WorkingDraft {
  if (workingDraft.slidePlan.length >= targetLength) {
    return workingDraft;
  }

  const extra = targetLength - workingDraft.slidePlan.length;
  const extraPlan: WorkingDraftSlidePlanEntry[] = Array.from({ length: extra }, () => ({
    slideFunctionId: "detail" as SlideFunctionId,
    canvasLayoutId: "features" as CanvasLayoutId,
    coreMessage: "",
    blockPlan: [],
    placeholderPlan: [],
    lastTransformId: null,
  }));

  const extraTitles = Array.from({ length: extra }, () => "");

  return {
    ...workingDraft,
    slidePlan: [...workingDraft.slidePlan, ...extraPlan],
    visibleSlideTitles: [...workingDraft.visibleSlideTitles, ...extraTitles],
  };
}
