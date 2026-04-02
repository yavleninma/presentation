import OpenAI from "openai";
import {
  buildSlideRegenerationPrompt,
  mergeSlideMeta,
  normalizeGeneratedContent,
  SYSTEM_PROMPT,
} from "@/lib/generation/prompts";
import { Presentation, PresentationBrief, Slide, SlideRegenerationIntent } from "@/types/presentation";

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

async function generateJSON(userPrompt: string) {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.35,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text) as Record<string, unknown>;
}

function isSlideRegenerationIntent(value: unknown): value is SlideRegenerationIntent {
  return (
    typeof value === "string" &&
    [
      "tighten",
      "shorten-for-execs",
      "rewrite-for-cfo",
      "remove-jargon",
      "add-business-impact",
      "make-risk-clearer",
      "strengthen-evidence",
      "offer-structure-alternatives",
      "turn-into-decision-slide",
      "strengthen-verdict",
    ].includes(value)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      slide?: Slide;
      presentation?: Presentation;
      brief?: PresentationBrief;
      intent?: SlideRegenerationIntent;
      previousSlide?: Slide;
      nextSlide?: Slide;
    };

    if (!body.slide || !body.presentation || !body.brief || !isSlideRegenerationIntent(body.intent)) {
      return Response.json(
        { error: "slide, presentation, brief and valid intent are required." },
        { status: 400 }
      );
    }

    const generated = await generateJSON(
      buildSlideRegenerationPrompt(
        body.slide,
        body.presentation,
        body.brief,
        body.intent,
        body.previousSlide,
        body.nextSlide
      )
    );

    const contentSource =
      generated.content && typeof generated.content === "object"
        ? (generated.content as Record<string, unknown>)
        : generated;
    const normalizedContent = normalizeGeneratedContent(
      body.slide.layout,
      contentSource,
      body.slide.meta?.headlineVerdict || body.slide.content.heading || "Updated slide"
    );
    const { speakerNotes, ...contentPatch } = normalizedContent;

    const content = {
      ...body.slide.content,
      ...contentPatch,
    };

    const metaUpdates =
      generated.meta && typeof generated.meta === "object"
        ? (generated.meta as Partial<NonNullable<Slide["meta"]>>)
        : undefined;

    const updatedSlide: Slide = {
      ...body.slide,
      content,
      notes:
        (typeof generated.notes === "string" && generated.notes.trim()) ||
        speakerNotes ||
        body.slide.notes,
      meta: mergeSlideMeta(body.slide.meta, metaUpdates),
    };

    return Response.json({ slide: updatedSlide });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Slide regeneration failed" },
      { status: 500 }
    );
  }
}
