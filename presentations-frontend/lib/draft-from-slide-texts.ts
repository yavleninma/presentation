import {
  buildPresentationDraft,
  runFitPassOnDraft,
} from "@/lib/demo-generator";
import type {
  CanvasLayoutId,
  PresentationDraft,
  SlideBlock,
  SlideTextEntry,
  SlideToneId,
  WorkingDraft,
} from "@/lib/presentation-types";

const BLOCK_ICONS = ["spark", "file", "trend", "shield", "flag", "arrow"] as const;

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

function buildRailRhythm(length: number) {
  return (["primary", "neutral", "neutral", "neutral"] as SlideToneId[]).slice(
    0,
    Math.max(length, 1),
  );
}

export function buildDraftFromSlideTexts(
  slideTexts: SlideTextEntry[],
  workingDraft: WorkingDraft,
  options: {
    documentTitle?: string;
    slideSpeakerNotes?: PresentationDraft["slideSpeakerNotes"];
  } = {},
): PresentationDraft {
  const baseDraft = buildPresentationDraft(workingDraft, options);
  const slides = baseDraft.slides.map((slide, index) => {
    const entry = slideTexts[index];
    if (!entry) {
      return slide;
    }

    const blocks = buildBlocksForLayout(slide.canvasLayoutId, entry);

    return {
      ...slide,
      railTitle: `${slide.slotId} — ${entry.railTitle}`,
      title: entry.title,
      subtitle: entry.subtitle,
      blocks,
      railRhythm: buildRailRhythm(blocks.length),
    };
  });

  return runFitPassOnDraft({
    ...baseDraft,
    documentTitle:
      options.documentTitle ?? slideTexts[0]?.title ?? baseDraft.documentTitle,
    slides,
    slideSpeakerNotes: options.slideSpeakerNotes ?? baseDraft.slideSpeakerNotes,
  });
}
