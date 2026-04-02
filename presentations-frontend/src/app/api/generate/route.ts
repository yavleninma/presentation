import { NextRequest } from "next/server";
import OpenAI from "openai";
import {
  buildOutlinePrompt,
  buildSlideContentPrompt,
  mergeSlideMeta,
  normalizeGeneratedContent,
  SYSTEM_PROMPT,
} from "@/lib/generation/prompts";
import { searchSingleImage } from "@/lib/images/pexels";
import {
  DEFAULT_REGEN_INTENTS,
  getScenarioDefinition,
} from "@/lib/decision-package";
import {
  DecisionPackage,
  ExtractionFinding,
  MeetingScenarioId,
  OutlineSlide,
  PresentationBrief,
  PresentationOutline,
  Slide,
  SlideArchetype,
  SlideConfidence,
  SlideLayoutType,
  SlideMeta,
} from "@/types/presentation";

export const maxDuration = 60;

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

const ALLOWED_LAYOUTS: SlideLayoutType[] = [
  "title",
  "section",
  "content",
  "two-columns",
  "image-text",
  "kpi",
  "timeline",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

async function generateJSON(
  openai: OpenAI,
  userPrompt: string
): Promise<Record<string, unknown>> {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.45,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text);
}

function isMeetingScenarioId(value: unknown): value is MeetingScenarioId {
  return typeof value === "string" && value in {
    "steering-committee": true,
    "quarterly-it-review": true,
    "budget-defense": true,
    "incident-risk-update": true,
    "vendor-decision": true,
    "program-recovery": true,
    "update-previous-package": true,
  };
}

function normalizeBrief(raw: unknown): PresentationBrief {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const scenarioId = isMeetingScenarioId(source.scenarioId)
    ? source.scenarioId
    : "steering-committee";
  const scenario = getScenarioDefinition(scenarioId);

  const read = (key: string, fallback = "") =>
    typeof source[key] === "string" ? String(source[key]).trim() : fallback;

  return {
    scenarioId,
    meetingName: read("meetingName", scenario.name),
    audience: read("audience", scenario.audienceHint),
    desiredOutcome: read("desiredOutcome", scenario.desiredOutcomeHint),
    deadline: read("deadline"),
    mainThesis: read("mainThesis"),
    leadershipAsk: read("leadershipAsk"),
    workingWell: read("workingWell"),
    notWorking: read("notWorking"),
    criticalNumbers: read("criticalNumbers"),
    risks: read("risks"),
    dependencies: read("dependencies"),
    sourceMaterial: read("sourceMaterial"),
  };
}

function getLayoutForArchetype(
  archetype: SlideArchetype,
  fallback: SlideLayoutType = "content"
): SlideLayoutType {
  const map: Record<SlideArchetype, SlideLayoutType> = {
    "headline-verdict": "title",
    "kpi-dashboard-commentary": "kpi",
    "progress-vs-plan": "content",
    "risk-heatmap": "content",
    "options-matrix": "two-columns",
    "budget-waterfall": "kpi",
    "roadmap-milestones": "timeline",
    "incident-timeline": "timeline",
    "dependency-map": "two-columns",
    "decision-slide": "content",
    "executive-summary": "title",
    "appendix-detail": "section",
  };

  return map[archetype] ?? fallback;
}

function normalizeMeta(
  raw: unknown,
  title: string,
  audience: string,
  index: number
): SlideMeta {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  const read = (key: string, fallback = "") =>
    typeof source[key] === "string" ? String(source[key]).trim() : fallback;
  const evidence = Array.isArray(source.evidence)
    ? source.evidence
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4)
    : [];
  const confidence = ["high", "medium", "low"].includes(
    String(source.confidence)
  )
    ? (source.confidence as SlideConfidence)
    : "medium";
  const regenerationIntents = Array.isArray(source.regenerationIntents)
    ? source.regenerationIntents
        .filter((item): item is Slide["meta"] extends { regenerationIntents: infer T } ? T extends Array<infer U> ? U : never : never => typeof item === "string")
        .slice(0, 8)
    : DEFAULT_REGEN_INTENTS;

  const archetype =
    typeof source.archetype === "string"
      ? (source.archetype as SlideArchetype)
      : "headline-verdict";

  return {
    role:
      typeof source.role === "string"
        ? (source.role as SlideMeta["role"])
        : index === 0
          ? "inform"
          : "recommend",
    archetype,
    audience: read("audience", audience),
    headlineVerdict: read("headlineVerdict", title),
    managementQuestion: read(
      "managementQuestion",
      "Какой управленческий вопрос этот слайд закрывает?"
    ),
    decisionIntent: read(
      "decisionIntent",
      index === 0
        ? "Задать рамку решения"
        : "Подвинуть аудиторию к следующему решению"
    ),
    evidence,
    confidence,
    whyThisSlide: read(
      "whyThisSlide",
      "Поддерживает логику decision package и делает вывод явным."
    ),
    storylinePosition: read("storylinePosition"),
    regenerationIntents,
  };
}

function normalizeOutlineSlides(
  rawSlides: unknown,
  brief: PresentationBrief,
  slideCount: number
): OutlineSlide[] {
  const slides = Array.isArray(rawSlides) ? rawSlides : [];

  const normalized = slides
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    )
    .map((slide, index) => {
      const title =
        typeof slide.title === "string" && slide.title.trim()
          ? slide.title.trim()
          : `Вывод ${index + 1}`;
      const meta = normalizeMeta(slide.meta, title, brief.audience, index);
      const preferredLayout =
        typeof slide.layout === "string" &&
        ALLOWED_LAYOUTS.includes(slide.layout as SlideLayoutType)
          ? (slide.layout as SlideLayoutType)
          : getLayoutForArchetype(meta.archetype, index === 0 ? "title" : "content");

      return {
        title,
        layout: preferredLayout,
        keyPoints: Array.isArray(slide.keyPoints)
          ? slide.keyPoints
              .filter((item): item is string => typeof item === "string")
              .map((item) => item.trim())
              .filter(Boolean)
              .slice(0, 4)
          : undefined,
        speakerNotes:
          typeof slide.speakerNotes === "string"
            ? slide.speakerNotes.trim()
            : undefined,
        meta,
      };
    })
    .slice(0, slideCount);

  if (!normalized.length) {
    normalized.push({
      title:
        brief.mainThesis || "Решение требует управленческого выравнивания",
      layout: "title",
      keyPoints: [brief.desiredOutcome || "Собрать позицию к встрече"],
      speakerNotes:
        "Откройте разговор сильным выводом, а затем быстро задайте stakes.",
      meta: normalizeMeta(undefined, brief.mainThesis || "Решение требует управленческого выравнивания", brief.audience, 0),
    });
  }

  normalized[0] = {
    ...normalized[0],
    layout: "title",
    meta: {
      ...normalized[0].meta,
      role: "inform",
      archetype:
        normalized[0].meta?.archetype === "executive-summary"
          ? "executive-summary"
          : "headline-verdict",
    },
  };

  while (normalized.length < slideCount) {
    const index = normalized.length;
    normalized.push({
      title:
        index === slideCount - 1
          ? "Решение требуется сейчас, иначе риски закрепятся"
          : `Вывод ${index + 1}`,
      layout: index === slideCount - 1 ? "content" : "content",
      keyPoints:
        index === slideCount - 1
          ? [brief.leadershipAsk || "Зафиксируйте конкретный ask к руководству"]
          : ["Добавьте ещё один блок доказательств или объяснения"],
      speakerNotes:
        index === slideCount - 1
          ? "Закройте разговор жёстким ask и обозначьте цену бездействия."
          : "Свяжите этот блок с предыдущим и следующим решением.",
      meta: {
        ...normalizeMeta(undefined, `Вывод ${index + 1}`, brief.audience, index),
        role: index === slideCount - 1 ? "decide" : "explain",
        archetype: index === slideCount - 1 ? "decision-slide" : "appendix-detail",
      },
    });
  }

  normalized[normalized.length - 1] = {
    ...normalized[normalized.length - 1],
    layout: getLayoutForArchetype(
      normalized[normalized.length - 1].meta?.archetype || "decision-slide",
      "content"
    ),
    meta: {
      ...normalized[normalized.length - 1].meta,
      role: "decide",
      archetype: "decision-slide",
    },
  };

  return normalized;
}

function normalizePackage(
  rawPackage: unknown,
  brief: PresentationBrief
): DecisionPackage {
  const source = (rawPackage && typeof rawPackage === "object"
    ? rawPackage
    : {}) as Record<string, unknown>;

  const storylineOptions = Array.isArray(source.storylineOptions)
    ? source.storylineOptions
        .filter(
          (item): item is { id?: string; title?: string; rationale?: string } =>
            typeof item === "object" && item !== null
        )
        .map((item, index) => ({
          id: item.id?.trim() || `option-${index + 1}`,
          title: item.title?.trim() || `Вариант ${index + 1}`,
          rationale: item.rationale?.trim() || "Собирает narrative в управленческую историю.",
        }))
        .slice(0, 3)
    : [];

  const extractionFindings = Array.isArray(source.extractionFindings)
    ? source.extractionFindings
        .filter(
          (
            item
          ): item is { label?: string; severity?: string; detail?: string } =>
            typeof item === "object" && item !== null
        )
        .map((item): ExtractionFinding => ({
          label: item.label?.trim() || "Пробел",
          severity:
            item.severity === "critical" ||
            item.severity === "warning" ||
            item.severity === "info"
              ? item.severity
              : "warning",
          detail:
            item.detail?.trim() ||
            "AI видит пробел или противоречие, которое стоит закрыть до встречи.",
        }))
        .slice(0, 6)
    : [];

  return {
    scenarioId: brief.scenarioId,
    audienceLabel:
      typeof source.audienceLabel === "string" && source.audienceLabel.trim()
        ? source.audienceLabel.trim()
        : brief.audience,
    executiveSummary:
      typeof source.executiveSummary === "string" && source.executiveSummary.trim()
        ? source.executiveSummary.trim()
        : brief.mainThesis || "Пакет требует управленческого решения.",
    storylineOptions:
      storylineOptions.length > 0
        ? storylineOptions
        : [
            {
              id: "option-1",
              title: "От статуса к решению",
              rationale:
                "Сначала фиксирует ситуацию, затем отклонение, риск и выводит к ask.",
            },
          ],
    extractionFindings:
      extractionFindings.length > 0
        ? extractionFindings
        : [
            {
              label: "Проверьте тезис",
              severity: "warning",
              detail:
                "Если тезис или ask звучат слишком общо, пакет будет слабым на встрече.",
            },
          ],
    followUpQuestions: Array.isArray(source.followUpQuestions)
      ? source.followUpQuestions
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [],
    appendixSummary: Array.isArray(source.appendixSummary)
      ? source.appendixSummary
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [],
  };
}

function getRequestedSlideCount(body: Record<string, unknown>, brief: PresentationBrief) {
  const raw = typeof body.slideCount === "number" ? body.slideCount : Number(body.slideCount);
  const scenario = getScenarioDefinition(brief.scenarioId);
  if (!Number.isFinite(raw)) return scenario.defaultSlideCount;
  return Math.min(10, Math.max(4, Math.round(raw)));
}

function normalizeOutline(
  raw: Record<string, unknown>,
  brief: PresentationBrief,
  slideCount: number
): PresentationOutline {
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : brief.meetingName;
  const decisionPackage = normalizePackage(raw.package, brief);
  const slides = normalizeOutlineSlides(raw.slides, brief, slideCount);

  return {
    title,
    slides,
    package: decisionPackage,
  };
}

async function createOutline(body: Record<string, unknown>) {
  const brief = normalizeBrief(body.brief);
  if (!brief.mainThesis || !brief.leadershipAsk || !brief.sourceMaterial) {
    throw new Error(
      "Для outline нужны главный тезис, ask к руководству и исходный материал."
    );
  }

  const language =
    typeof body.language === "string" && body.language === "en" ? "en" : "ru";
  const slideCount = getRequestedSlideCount(body, brief);
  const openai = getOpenAI();
  const outline = await generateJSON(
    openai,
    buildOutlinePrompt(brief, slideCount, language)
  );

  return normalizeOutline(outline, brief, slideCount);
}

async function streamSlides(
  outline: PresentationOutline,
  brief: PresentationBrief,
  language: "ru" | "en",
  templateId: string,
  selectedStorylineId?: string
) {
  const openai = getOpenAI();
  const encoder = new TextEncoder();
  const storyline =
    outline.package.storylineOptions.find((option) => option.id === selectedStorylineId) ||
    outline.package.storylineOptions[0];

  return new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`)
        );
      };

      try {
        send("phase", "generating");
        send("thinking", {
          message: "Собираю decision package из утверждённой структуры",
          detail:
            "Структура уже согласована. Теперь превращаю narrative в рабочие слайды, notes и пакет для решения.",
          progress: 24,
        });

        const slides: Slide[] = [];

        for (let i = 0; i < outline.slides.length; i++) {
          const outlineSlide = outline.slides[i];
          const progress = Math.min(
            92,
            26 + Math.round((i / Math.max(outline.slides.length, 1)) * 60)
          );

          send("slide_start", {
            message: `Генерирую слайд ${i + 1} из ${outline.slides.length}`,
            detail: outlineSlide.meta?.headlineVerdict || outlineSlide.title,
            progress,
            slideIndex: i + 1,
            totalSlides: outline.slides.length,
            slideTitle: outlineSlide.title,
          });

          const generated = await generateJSON(
            openai,
            buildSlideContentPrompt(
              outlineSlide,
              brief,
              outline.title,
              i,
              outline.slides.length,
              storyline?.title
            )
          );

          const { speakerNotes, ...content } = normalizeGeneratedContent(
            outlineSlide.layout,
            generated,
            outlineSlide.meta?.headlineVerdict || outlineSlide.title
          );

          if (content.imageQuery && !content.imageUrl) {
            send("image_search", {
              message: `Подбираю визуал для слайда ${i + 1}`,
              detail: `Запрос: ${content.imageQuery}`,
              progress: Math.min(progress + 6, 95),
              slideIndex: i + 1,
              totalSlides: outline.slides.length,
              slideTitle: outlineSlide.title,
            });

            const size =
              outlineSlide.layout === "full-image" ? "large2x" : "landscape";
            const imageUrl = await searchSingleImage(content.imageQuery, size);
            if (imageUrl) {
              content.imageUrl = imageUrl;
            }
          }

          const slide: Slide = {
            id: crypto.randomUUID(),
            order: i,
            layout: outlineSlide.layout,
            content,
            notes:
              speakerNotes?.trim() ||
              outlineSlide.speakerNotes?.trim() ||
              outlineSlide.keyPoints?.join("; ") ||
              "",
            meta: mergeSlideMeta(outlineSlide.meta),
          };

          slides.push(slide);
          send("slide", slide);
        }

        send("phase", "polishing");
        send("polishing", {
          message: "Финализирую пакет: notes, appendix hooks и decision logic",
          detail:
            "Проверяю, чтобы storyline не распадался и финальный ask звучал однозначно.",
          progress: 96,
        });
        await sleep(300);

        const presentation = {
          id: crypto.randomUUID(),
          title: outline.title,
          prompt: brief.mainThesis,
          templateId,
          language,
          brief,
          decisionPackage: outline.package,
          slides,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        send("phase", "complete");
        send("presentation", presentation);
      } catch (error) {
        send("error", {
          message: error instanceof Error ? error.message : "Generation failed",
        });
        send("phase", "error");
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const mode = body.mode === "slides" ? "slides" : "outline";

    if (mode === "outline") {
      const outline = await createOutline(body);
      return Response.json({ outline });
    }

    const brief = normalizeBrief(body.brief);
    const outlineSource = body.outline;
    if (!outlineSource || typeof outlineSource !== "object") {
      return Response.json(
        { error: "Approved outline is required for slide generation." },
        { status: 400 }
      );
    }

    const outline = normalizeOutline(
      outlineSource as Record<string, unknown>,
      brief,
      Array.isArray((outlineSource as PresentationOutline).slides)
        ? (outlineSource as PresentationOutline).slides.length
        : getRequestedSlideCount(body, brief)
    );

    const language =
      typeof body.language === "string" && body.language === "en" ? "en" : "ru";
    const templateId =
      typeof body.templateId === "string" && body.templateId.trim()
        ? body.templateId.trim()
        : "minimal";

    const stream = await streamSlides(
      outline,
      brief,
      language,
      templateId,
      typeof body.selectedStorylineId === "string"
        ? body.selectedStorylineId
        : undefined
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
