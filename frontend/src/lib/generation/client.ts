import { Presentation, Slide, PresentationOutline } from "@/types/presentation";

interface GenerationCallbacks {
  onPhase: (phase: string) => void;
  onOutline: (outline: PresentationOutline) => void;
  onSlide: (slide: Slide) => void;
  onComplete: (presentation: Presentation) => void;
  onError: (error: string) => void;
}

export async function generatePresentation(
  topic: string,
  options: {
    slideCount?: number;
    language?: string;
    templateId?: string;
  },
  callbacks: GenerationCallbacks
): Promise<void> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      slideCount: options.slideCount ?? 10,
      language: options.language ?? "ru",
      templateId: options.templateId ?? "sovcombank",
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
            callbacks.onPhase(data);
            break;
          case "outline":
            callbacks.onOutline(data as PresentationOutline);
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
