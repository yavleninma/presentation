import { create } from "zustand";
import {
  Presentation,
  Slide,
  SlideContent,
  GenerationPhase,
  PresentationOutline,
} from "@/types/presentation";

interface PresentationState {
  presentation: Presentation | null;
  currentSlideIndex: number;
  phase: GenerationPhase;
  outline: PresentationOutline | null;
  error: string | null;

  setPresentation: (p: Presentation) => void;
  setCurrentSlide: (index: number) => void;
  setPhase: (phase: GenerationPhase) => void;
  setOutline: (outline: PresentationOutline) => void;
  setError: (error: string | null) => void;

  updateSlide: (slideId: string, updates: Partial<Slide>) => void;
  updateSlideContent: (slideId: string, content: Partial<SlideContent>) => void;
  addSlide: (slide: Slide, afterIndex?: number) => void;
  removeSlide: (slideId: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  appendSlide: (slide: Slide) => void;
  resetPresentation: () => void;
}

export const usePresentationStore = create<PresentationState>((set) => ({
  presentation: null,
  currentSlideIndex: 0,
  phase: "idle",
  outline: null,
  error: null,

  setPresentation: (presentation) => set({ presentation }),
  setCurrentSlide: (currentSlideIndex) => set({ currentSlideIndex }),
  setPhase: (phase) => set({ phase }),
  setOutline: (outline) => set({ outline }),
  setError: (error) => set({ error }),

  updateSlide: (slideId, updates) =>
    set((state) => {
      if (!state.presentation) return state;
      return {
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map((s) =>
            s.id === slideId ? { ...s, ...updates } : s
          ),
        },
      };
    }),

  updateSlideContent: (slideId, content) =>
    set((state) => {
      if (!state.presentation) return state;
      return {
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map((s) =>
            s.id === slideId
              ? { ...s, content: { ...s.content, ...content } }
              : s
          ),
        },
      };
    }),

  addSlide: (slide, afterIndex) =>
    set((state) => {
      if (!state.presentation) return state;
      const slides = [...state.presentation.slides];
      const idx = afterIndex !== undefined ? afterIndex + 1 : slides.length;
      slides.splice(idx, 0, slide);
      return {
        presentation: {
          ...state.presentation,
          slides: slides.map((s, i) => ({ ...s, order: i })),
        },
      };
    }),

  removeSlide: (slideId) =>
    set((state) => {
      if (!state.presentation) return state;
      const slides = state.presentation.slides
        .filter((s) => s.id !== slideId)
        .map((s, i) => ({ ...s, order: i }));
      return {
        presentation: { ...state.presentation, slides },
        currentSlideIndex: Math.min(
          state.currentSlideIndex,
          slides.length - 1
        ),
      };
    }),

  reorderSlides: (fromIndex, toIndex) =>
    set((state) => {
      if (!state.presentation) return state;
      const slides = [...state.presentation.slides];
      const [moved] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, moved);
      return {
        presentation: {
          ...state.presentation,
          slides: slides.map((s, i) => ({ ...s, order: i })),
        },
      };
    }),

  appendSlide: (slide) =>
    set((state) => {
      if (!state.presentation) return state;
      return {
        presentation: {
          ...state.presentation,
          slides: [...state.presentation.slides, slide],
        },
      };
    }),

  resetPresentation: () =>
    set({
      presentation: null,
      currentSlideIndex: 0,
      phase: "idle",
      outline: null,
      error: null,
    }),
}));
