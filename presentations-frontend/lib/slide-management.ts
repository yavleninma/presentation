import type {
  PresentationDraft,
  PresentationSlide,
  SlideId,
  WorkingDraftSlidePlanEntry,
} from "@/lib/presentation-types";

export function addSlide(draft: PresentationDraft, afterIndex: number): PresentationDraft {
  const newSlide: PresentationSlide = {
    id: `slide-${Date.now()}`,
    index: afterIndex + 1,
    slideFunctionId: "detail",
    canvasLayoutId: "features",
    railTitle: "Новый слайд",
    title: "Заголовок",
    subtitle: "",
    blocks: [],
    drawerActions: [],
    lastTransformId: null,
    railRhythm: [],
  };
  const slides = [...draft.slides];
  slides.splice(afterIndex + 1, 0, newSlide);

  const newPlanEntry: WorkingDraftSlidePlanEntry = {
    slideFunctionId: "detail",
    canvasLayoutId: "features",
    coreMessage: "",
    blockPlan: [],
    placeholderPlan: [],
    lastTransformId: null,
  };
  const slidePlan = [...draft.workingDraft.slidePlan];
  slidePlan.splice(afterIndex + 1, 0, newPlanEntry);

  const visibleSlideTitles = [...draft.workingDraft.visibleSlideTitles];
  visibleSlideTitles.splice(afterIndex + 1, 0, "Заголовок");

  return reindexSlides({
    ...draft,
    slides,
    workingDraft: {
      ...draft.workingDraft,
      slidePlan,
      visibleSlideTitles,
    },
  });
}

export function removeSlide(draft: PresentationDraft, slideId: SlideId): PresentationDraft {
  if (draft.slides.length <= 1) return draft;
  const idx = draft.slides.findIndex(s => s.id === slideId);
  if (idx === -1) return draft;

  const slides = draft.slides.filter(s => s.id !== slideId);
  const slidePlan = draft.workingDraft.slidePlan.filter((_, i) => i !== idx);
  const visibleSlideTitles = draft.workingDraft.visibleSlideTitles.filter((_, i) => i !== idx);

  return reindexSlides({
    ...draft,
    slides,
    workingDraft: {
      ...draft.workingDraft,
      slidePlan,
      visibleSlideTitles,
    },
  });
}

export function moveSlide(draft: PresentationDraft, fromIndex: number, toIndex: number): PresentationDraft {
  const slides = [...draft.slides];
  const [moved] = slides.splice(fromIndex, 1);
  slides.splice(toIndex, 0, moved);

  const slidePlan = [...draft.workingDraft.slidePlan];
  const [movedPlan] = slidePlan.splice(fromIndex, 1);
  slidePlan.splice(toIndex, 0, movedPlan);

  const visibleSlideTitles = [...draft.workingDraft.visibleSlideTitles];
  const [movedTitle] = visibleSlideTitles.splice(fromIndex, 1);
  visibleSlideTitles.splice(toIndex, 0, movedTitle);

  return reindexSlides({
    ...draft,
    slides,
    workingDraft: {
      ...draft.workingDraft,
      slidePlan,
      visibleSlideTitles,
    },
  });
}

function reindexSlides(draft: PresentationDraft): PresentationDraft {
  return {
    ...draft,
    slides: draft.slides.map((s, i) => ({ ...s, index: i })),
  };
}
