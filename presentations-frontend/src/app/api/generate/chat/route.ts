import OpenAI from "openai";
import { searchSingleImage } from "@/lib/images/pexels";
import {
  buildPresentationChatPrompt,
  mergeSlideMeta,
  normalizeGeneratedContent,
  SYSTEM_PROMPT,
} from "@/lib/generation/prompts";
import {
  Presentation,
  PresentationBrief,
  Slide,
  SlideArchetype,
  SlideConfidence,
  SlideLayoutType,
  SlideMeta,
} from "@/types/presentation";

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

const ALLOWED_LAYOUTS: SlideLayoutType[] = [
  "title",
  "section",
  "content",
  "two-columns",
  "image-text",
  "kpi",
  "timeline",
  "quote",
  "full-image",
  "thank-you",
];

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
    temperature: 0.55,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text) as Record<string, unknown>;
}

function inferArchetype(layout: SlideLayoutType, index: number, total: number) {
  if (index === 0) return "headline-verdict";
  if (index === total - 1) return "decision-slide";
  if (layout === "kpi") return "kpi-dashboard-commentary";
  if (layout === "timeline") return "roadmap-milestones";
  if (layout === "two-columns") return "options-matrix";
  if (layout === "section") return "appendix-detail";
  return "progress-vs-plan";
}

function inferMeta(
  source: Partial<SlideMeta> | undefined,
  fallbackHeading: string,
  audience: string,
  layout: SlideLayoutType,
  index: number,
  total: number
): SlideMeta {
  const confidence = ["high", "medium", "low"].includes(
    String(source?.confidence)
  )
    ? (source?.confidence as SlideConfidence)
    : "medium";

  return {
    role:
      source?.role ??
      (index === 0 ? "inform" : index === total - 1 ? "decide" : "explain"),
    archetype:
      source?.archetype ??
      (inferArchetype(layout, index, total) as SlideArchetype),
    audience: source?.audience ?? audience,
    headlineVerdict: source?.headlineVerdict ?? fallbackHeading,
    managementQuestion:
      source?.managementQuestion ??
      "Что человек должен понять, посмотрев на этот слайд?",
    decisionIntent:
      source?.decisionIntent ??
      (index === total - 1
        ? "Закрыть историю ясным выводом"
        : "Сделать историю понятнее и сильнее"),
    evidence: source?.evidence ?? [],
    confidence,
    whyThisSlide:
      source?.whyThisSlide ??
      "Помогает развить историю презентации без лишней перегрузки.",
    storylinePosition: source?.storylinePosition ?? "",
    regenerationIntents: source?.regenerationIntents,
  };
}

async function normalizeSlides(
  rawSlides: unknown,
  presentation: Presentation,
  brief: PresentationBrief
): Promise<Slide[]> {
  const sourceSlides = Array.isArray(rawSlides) ? rawSlides : [];
  const existingById = new Map(presentation.slides.map((slide) => [slide.id, slide]));

  const normalized = await Promise.all(
    sourceSlides
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null
      )
      .slice(0, 12)
      .map(async (rawSlide, index, allSlides) => {
        const existingId =
          typeof rawSlide.id === "string" ? rawSlide.id.trim() : "";
        const existing = existingId ? existingById.get(existingId) : undefined;

        const layout =
          typeof rawSlide.layout === "string" &&
          ALLOWED_LAYOUTS.includes(rawSlide.layout as SlideLayoutType)
            ? (rawSlide.layout as SlideLayoutType)
            : existing?.layout ?? "content";

        const metaSource =
          rawSlide.meta && typeof rawSlide.meta === "object"
            ? (rawSlide.meta as Partial<SlideMeta>)
            : existing?.meta;

        const fallbackHeading =
          metaSource?.headlineVerdict ||
          existing?.content.heading ||
          `Слайд ${index + 1}`;

        const contentSource =
          rawSlide.content && typeof rawSlide.content === "object"
            ? (rawSlide.content as Record<string, unknown>)
            : rawSlide;

        const { speakerNotes, ...content } = normalizeGeneratedContent(
          layout,
          contentSource,
          fallbackHeading
        );

        if (content.imageQuery && !content.imageUrl) {
          const imageUrl = await searchSingleImage(
            content.imageQuery,
            layout === "full-image" ? "large2x" : "landscape"
          );
          if (imageUrl) {
            content.imageUrl = imageUrl;
          }
        }

        const meta = mergeSlideMeta(
          inferMeta(
            existing?.meta ?? metaSource,
            fallbackHeading,
            brief.audience,
            layout,
            index,
            allSlides.length
          ),
          metaSource
        );

        return {
          id:
            existing && existingId === existing.id
              ? existing.id
              : crypto.randomUUID(),
          order: index,
          layout,
          content,
          notes:
            (typeof rawSlide.notes === "string" && rawSlide.notes.trim()) ||
            speakerNotes ||
            existing?.notes ||
            "",
          meta,
        } satisfies Slide;
      })
  );

  return normalized;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      presentation?: Presentation;
      brief?: PresentationBrief;
      message?: string;
      currentSlideId?: string;
    };

    if (!body.presentation || !body.brief || !body.message?.trim()) {
      return Response.json(
        { error: "Нужны presentation, brief и текст сообщения." },
        { status: 400 }
      );
    }

    const currentSlide = body.currentSlideId
      ? body.presentation.slides.find((slide) => slide.id === body.currentSlideId)
      : undefined;

    const generated = await generateJSON(
      buildPresentationChatPrompt(
        body.presentation,
        body.brief,
        body.message.trim(),
        currentSlide
      )
    );

    const slides = await normalizeSlides(
      generated.slides,
      body.presentation,
      body.brief
    );

    const updatedPresentation: Presentation = {
      ...body.presentation,
      title:
        typeof generated.title === "string" && generated.title.trim()
          ? generated.title.trim()
          : body.presentation.title,
      slides: slides.length ? slides : body.presentation.slides,
      updatedAt: new Date().toISOString(),
    };

    return Response.json({
      reply:
        typeof generated.reply === "string" && generated.reply.trim()
          ? generated.reply.trim()
          : "Я обновил презентацию и сохранил общий замысел.",
      focusSlideId:
        typeof generated.focusSlideId === "string" &&
        updatedPresentation.slides.some((slide) => slide.id === generated.focusSlideId)
          ? generated.focusSlideId
          : currentSlide?.id ?? updatedPresentation.slides[0]?.id,
      presentation: updatedPresentation,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось обновить презентацию через чат",
      },
      { status: 500 }
    );
  }
}
