import { NextRequest } from "next/server";
import OpenAI from "openai";
import {
  buildOutlinePrompt,
  buildSlideContentPrompt,
  SYSTEM_PROMPT,
} from "@/lib/generation/prompts";
import { SlideLayoutType } from "@/types/presentation";

export const maxDuration = 60;

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

async function generateJSON(
  openai: OpenAI,
  systemPrompt: string,
  userPrompt: string
): Promise<Record<string, unknown>> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      slideCount = 10,
      language = "ru",
      templateId = "sovcombank",
    } = body;

    if (!topic) {
      return Response.json({ error: "Topic is required" }, { status: 400 });
    }

    const openai = getOpenAI();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`)
          );
        };

        try {
          send("phase", "outline");

          const outlinePrompt = buildOutlinePrompt(topic, slideCount, language);
          const outlineData = await generateJSON(
            openai,
            SYSTEM_PROMPT,
            outlinePrompt
          );

          send("outline", outlineData);
          send("phase", "generating");

          const outlineSlides = (outlineData.slides as Array<{
            title: string;
            layout: SlideLayoutType;
            keyPoints?: string[];
          }>) ?? [];

          const presentationTitle = (outlineData.title as string) ?? topic;
          const slides = [];

          for (let i = 0; i < outlineSlides.length; i++) {
            const os = outlineSlides[i];

            const slidePrompt = buildSlideContentPrompt(
              os.title,
              os.layout,
              os.keyPoints,
              presentationTitle,
              i,
              outlineSlides.length
            );

            const slideContent = await generateJSON(
              openai,
              SYSTEM_PROMPT,
              slidePrompt
            );

            const slide = {
              id: crypto.randomUUID(),
              order: i,
              layout: os.layout,
              content: slideContent,
              notes: os.keyPoints?.join("; ") ?? "",
            };

            slides.push(slide);
            send("slide", slide);
          }

          const presentation = {
            id: crypto.randomUUID(),
            title: presentationTitle,
            prompt: topic,
            templateId,
            language,
            slides,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          send("phase", "complete");
          send("presentation", presentation);
        } catch (err) {
          send("error", {
            message: err instanceof Error ? err.message : "Generation failed",
          });
          send("phase", "error");
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
