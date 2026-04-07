import type {
  DraftFitPassStrength,
  FitPassResult,
  PresentationDraft,
  PresentationSlide,
  SlideBlock,
  SlideToneId,
  WorkingDraft,
} from "@/lib/presentation-types";
import { clampText } from "@/lib/prompt-analysis";

const FIT_PASS_LIMITS: Record<
  DraftFitPassStrength,
  {
    title: number;
    subtitle: number;
    blockTitle: number;
    blockBody: number;
    blockBodyPlaceholder: number;
    railTitle: number;
    actionLabel: number;
    overflowTitleWidth: number;
    overflowBlockTitleWidth: number;
    overflowHeightChars: number;
  }
> = {
  strict: {
    title: 78,
    subtitle: 84,
    blockTitle: 34,
    blockBody: 156,
    blockBodyPlaceholder: 96,
    railTitle: 44,
    actionLabel: 32,
    overflowTitleWidth: 72,
    overflowBlockTitleWidth: 30,
    overflowHeightChars: 440,
  },
  editor: {
    title: 140,
    subtitle: 220,
    blockTitle: 320,
    blockBody: 900,
    blockBodyPlaceholder: 400,
    railTitle: 96,
    actionLabel: 96,
    overflowTitleWidth: 132,
    overflowBlockTitleWidth: 300,
    overflowHeightChars: 4000,
  },
};

export function blockTone(block: SlideBlock): SlideToneId {
  if (block.type === "movement") return "success";
  if (block.type === "constraint") return "warning";
  if (block.type === "focus" || block.type === "decision") return "primary";
  return "neutral";
}

export function fitSlide(
  slide: PresentationSlide,
  workingDraft: WorkingDraft,
  strength: DraftFitPassStrength = "strict",
) {
  const L = FIT_PASS_LIMITS[strength];
  let titleShortened = false;
  let textCompressed = false;
  let blockTrimmed = false;
  let actionShortened = false;
  const notes: string[] = [];

  const title = clampText(slide.title, L.title);
  if (title !== slide.title) {
    titleShortened = true;
    notes.push("fit-pass сократил заголовок");
  }

  const subtitle = slide.subtitle ? clampText(slide.subtitle, L.subtitle) : "";
  if (subtitle !== slide.subtitle) {
    textCompressed = true;
    notes.push("fit-pass сократил подзаголовок");
  }

  const maxBlocks =
    slide.canvasLayoutId === "checklist" ? 4 :
    slide.canvasLayoutId === "cover" ? 1 :
    slide.canvasLayoutId === "stat-focus" ? 2 :
    slide.canvasLayoutId === "quote" ? 2 :
    slide.canvasLayoutId === "comparison" ? 2 :
    slide.canvasLayoutId === "section-divider" ? 1 :
    slide.canvasLayoutId === "closing" ? 1 :
    slide.canvasLayoutId === "text-block" ? 3 :
    slide.canvasLayoutId === "cards-row" ? 5 :
    slide.canvasLayoutId === "list-slide" ? 8 :
    slide.canvasLayoutId === "timeline" ? 6 :
    slide.canvasLayoutId === "chart-bar" ? 8 :
    slide.canvasLayoutId === "chart-progress" ? 6 :
    slide.canvasLayoutId === "table-simple" ? 10 :
    slide.canvasLayoutId === "image-text" ? 3 :
    3;
  const blocks = slide.blocks.slice(0, maxBlocks).map((block) => {
    const next = {
      ...block,
      title: clampText(block.title, L.blockTitle),
      body: clampText(
        block.body,
        block.placeholder ? L.blockBodyPlaceholder : L.blockBody,
      ),
    };

    if (next.title !== block.title || next.body !== block.body) {
      textCompressed = true;
    }

    return next;
  });

  if (blocks.length !== slide.blocks.length) {
    blockTrimmed = true;
    notes.push("fit-pass убрал лишний блок");
  }

  const drawerActions = slide.drawerActions.map((action) => {
    const label = clampText(action.label, L.actionLabel);

    if (label !== action.label) {
      actionShortened = true;
    }

    return {
      ...action,
      label,
    };
  });

  if (actionShortened) {
    notes.push("fit-pass сократил действие");
  }

  const totalChars =
    title.length +
    subtitle.length +
    blocks.reduce((sum, block) => sum + block.title.length + block.body.length, 0);

  return {
    slide: {
      ...slide,
      title,
      subtitle,
      railTitle: clampText(slide.railTitle, L.railTitle),
      railRhythm: blocks.map(blockTone).slice(0, 4),
      blocks,
      drawerActions,
    },
    fit: {
      slideId: slide.id,
      overflowWidthRisk:
        title.length > L.overflowTitleWidth ||
        blocks.some((block) => block.title.length > L.overflowBlockTitleWidth),
      overflowHeightRisk: totalChars > L.overflowHeightChars,
      titleShortened,
      textCompressed,
      blockTrimmed,
      secondaryMoved: false,
      placeholderVisible: blocks.some((block) => block.placeholder)
        ? blocks.some((block) => block.placeholder && block.body.trim().length > 0)
        : true,
      iconConsistent: blocks.every((block) => Boolean(block.icon)),
      contrastSafe: ["slate", "indigo", "teal", "sand", "rose", "emerald", "violet", "zinc"].includes(workingDraft.colorThemeId),
      rhythmSafe: blocks.length <= 3,
      repaired: titleShortened || textCompressed || blockTrimmed || actionShortened,
      notes,
    } satisfies FitPassResult,
  };
}

export function runFitPassOnDraft(draft: PresentationDraft): PresentationDraft {
  const strength: DraftFitPassStrength = draft.fitPassStrength ?? "strict";
  const chosenTransformIds = {} as PresentationDraft["debug"]["chosenTransformIds"];
  const fitPassResultBySlide =
    {} as PresentationDraft["debug"]["fitPassResultBySlide"];
  const slides = draft.slides.map((slide, index) => {
    const result = fitSlide(slide, draft.workingDraft, strength);
    const planEntry = draft.workingDraft.slidePlan[index];
    chosenTransformIds[slide.id] = planEntry?.lastTransformId ?? null;
    fitPassResultBySlide[slide.id] = result.fit;
    return result.slide;
  });

  return {
    ...draft,
    slides,
    debug: {
      currentWorkingDraft: draft.workingDraft,
      hiddenSlidePlan: draft.workingDraft.slidePlan,
      chosenTransformIds,
      fitPassResultBySlide,
    },
  };
}
