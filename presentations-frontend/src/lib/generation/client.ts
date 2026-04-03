import {
  GenerationPhase,
  GenerationStatusEvent,
  Presentation,
  PresentationBrief,
  PresentationOutline,
  Slide,
  SlideRegenerationIntent,
} from "@/types/presentation";

interface SlideGenerationCallbacks {
  onPhase: (phase: GenerationPhase) => void;
  onStatus: (status: GenerationStatusEvent) => void;
  onSlide: (slide: Slide) => void;
  onComplete: (presentation: Presentation) => void;
  onError: (error: string) => void;
}

export async function generateOutline(
  brief: PresentationBrief,
  options?: {
    language?: "ru" | "en";
    slideCount?: number;
  }
): Promise<PresentationOutline> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "outline",
      brief,
      language: options?.language ?? "ru",
      slideCount: options?.slideCount,
    }),
  });

  const data = (await response.json()) as {
    outline?: PresentationOutline;
    error?: string;
  };

  if (!response.ok || !data.outline) {
    throw new Error(data.error ?? "Не удалось собрать структуру презентации");
  }

  return data.outline;
}

export async function generateSlides(
  brief: PresentationBrief,
  outline: PresentationOutline,
  options: {
    language?: "ru" | "en";
    templateId?: string;
    selectedStorylineId?: string;
  },
  callbacks: SlideGenerationCallbacks
): Promise<void> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "slides",
      brief,
      outline,
      language: options.language ?? "ru",
      templateId: options.templateId ?? "minimal",
      selectedStorylineId: options.selectedStorylineId,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    callbacks.onError(err.error ?? "Request failed");
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      try {
        const { event, data } = JSON.parse(line.slice(6));
        switch (event) {
          case "phase":
            callbacks.onPhase(data as GenerationPhase);
            break;
          case "thinking":
          case "researching":
          case "slide_start":
          case "image_search":
          case "polishing":
            callbacks.onStatus({
              ...(data as Omit<GenerationStatusEvent, "type">),
              type: event,
            });
            break;
          case "slide":
            callbacks.onSlide(data as Slide);
            break;
          case "presentation":
            callbacks.onComplete(data as Presentation);
            break;
          case "error":
            callbacks.onError((data as { message: string }).message);
            break;
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

export async function regenerateSlide(
  slide: Slide,
  presentation: Presentation,
  brief: PresentationBrief,
  intent: SlideRegenerationIntent,
  customInstruction?: string,
  previousSlide?: Slide,
  nextSlide?: Slide
): Promise<Slide> {
  const response = await fetch("/api/generate/slide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slide,
      presentation,
      brief,
      intent,
      customInstruction,
      previousSlide,
      nextSlide,
    }),
  });

  const data = (await response.json()) as { slide?: Slide; error?: string };

  if (!response.ok || !data.slide) {
    throw new Error(data.error ?? "Failed to regenerate slide");
  }

  return data.slide;
}

export async function chatWithPresentation(
  presentation: Presentation,
  brief: PresentationBrief,
  message: string,
  currentSlideId?: string
): Promise<{
  reply: string;
  focusSlideId?: string;
  presentation: Presentation;
}> {
  const response = await fetch("/api/generate/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      presentation,
      brief,
      message,
      currentSlideId,
    }),
  });

  const data = (await response.json()) as {
    reply?: string;
    focusSlideId?: string;
    presentation?: Presentation;
    error?: string;
  };

  if (!response.ok || !data.presentation) {
    throw new Error(data.error ?? "Не удалось обновить презентацию");
  }

  return {
    reply: data.reply ?? "Я обновил презентацию.",
    focusSlideId: data.focusSlideId,
    presentation: data.presentation,
  };
}
