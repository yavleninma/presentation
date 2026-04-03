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
  PresentationLengthId,
  Slide,
  SlideArchetype,
  SlideConfidence,
  SlideLayoutType,
  SlideMeta,
  SlideRegenerationIntent,
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
    temperature: 0.55,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text);
}

function isMeetingScenarioId(value: unknown): value is MeetingScenarioId {
  return typeof value === "string" && value in {
    "simple-presentation": true,
    "steering-committee": true,
    "quarterly-it-review": true,
    "budget-defense": true,
    "incident-risk-update": true,
    "vendor-decision": true,
    "program-recovery": true,
    "update-previous-package": true,
  };
}

function isPresentationLength(value: unknown): value is PresentationLengthId {
  return value === "short" || value === "medium" || value === "detailed";
}

function normalizeBrief(raw: unknown): PresentationBrief {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const scenarioId = isMeetingScenarioId(source.scenarioId)
    ? source.scenarioId
    : "simple-presentation";
  const scenario = getScenarioDefinition(scenarioId);

  const read = (key: string, fallback = "") =>
    typeof source[key] === "string" ? String(source[key]).trim() : fallback;

  const mainThesis = read("mainThesis");
  const desiredOutcome = read("desiredOutcome", scenario.desiredOutcomeHint);

  return {
    scenarioId,
    meetingName: read("meetingName", mainThesis || scenario.name),
    audience: read("audience", scenario.audienceHint),
    desiredOutcome,
    deadline: read("deadline"),
    mainThesis,
    leadershipAsk: read("leadershipAsk", desiredOutcome),
    workingWell: read("workingWell"),
    notWorking: read("notWorking"),
    criticalNumbers: read("criticalNumbers"),
    risks: read("risks"),
    dependencies: read("dependencies"),
    sourceMaterial: read("sourceMaterial", mainThesis),
    presentationFormat:
      source.presentationFormat === "report" ||
      source.presentationFormat === "idea" ||
      source.presentationFormat === "education" ||
      source.presentationFormat === "talk"
        ? source.presentationFormat
        : "talk",
    presentationLength: isPresentationLength(source.presentationLength)
      ? source.presentationLength
      : "medium",
    visualTheme: read("visualTheme", "minimal"),
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
        .filter((item): item is SlideRegenerationIntent =>
          typeof item === "string"
        )
        .slice(0, 5)
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
          : index >= 4
            ? "recommend"
            : "explain",
    archetype,
    audience: read("audience", audience),
    headlineVerdict: read("headlineVerdict", title),
    managementQuestion: read(
      "managementQuestion",
      "Что человек должен быстро считать с этого слайда?"
    ),
    decisionIntent: read(
      "decisionIntent",
      index === 0
        ? "Ввести в тему и задать тон презентации"
        : "Продвинуть историю и сделать вывод понятнее"
    ),
    evidence,
    confidence,
    whyThisSlide: read(
      "whyThisSlide",
      "Усиливает историю презентации и делает следующий шаг естественным."
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
          : `${brief.mainThesis || "Новая презентация"} — слайд ${index + 1}`;
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
      title: brief.mainThesis || "Новая презентация",
      layout: "title",
      keyPoints: [brief.desiredOutcome || "Коротко и ясно раскрыть тему"],
      speakerNotes:
        "Откройте презентацию сильным тезисом и сразу обозначьте, зачем слушать дальше.",
      meta: normalizeMeta(
        undefined,
        brief.mainThesis || "Новая презентация",
        brief.audience,
        0
      ),
    });
  }

  normalized[0] = {
    ...normalized[0],
    layout: "title",
    meta: {
      ...normalized[0].meta,
      role: "inform",
      archetype: "headline-verdict",
    },
  };

  while (normalized.length < slideCount) {
    const index = normalized.length;
    normalized.push({
      title:
        index === slideCount - 1
          ? "Короткий итог и следующий шаг"
          : `Смысловой блок ${index + 1}`,
      layout: index === slideCount - 1 ? "content" : "content",
      keyPoints:
        index === slideCount - 1
          ? [brief.leadershipAsk || "Сформулируйте итог или следующий шаг"]
          : ["Добавьте ещё одну опорную мысль, которая усиливает историю"],
      speakerNotes:
        index === slideCount - 1
          ? "Закройте историю одним ясным выводом или действием."
          : "Свяжите этот слайд с предыдущим и следующим блоком.",
      meta: {
        ...normalizeMeta(undefined, `Слайд ${index + 1}`, brief.audience, index),
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
          rationale:
            item.rationale?.trim() ||
            "Помогает посмотреть на тему под немного другим углом.",
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
        .map(
          (item): ExtractionFinding => ({
            label: item.label?.trim() || "Что можно усилить",
            severity:
              item.severity === "critical" ||
              item.severity === "warning" ||
              item.severity === "info"
                ? item.severity
                : "warning",
            detail:
              item.detail?.trim() ||
              "Черновик уже можно использовать, но его можно сделать сильнее с дополнительными фактами или примерами.",
          })
        )
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
        : `Черновик по теме "${brief.mainThesis}" с упором на ясную структуру и красивую подачу.`,
    storylineOptions:
      storylineOptions.length > 0
        ? storylineOptions
        : [
            {
              id: "calm",
              title: "Спокойная подача",
              rationale:
                "Ровный и понятный вариант, который хорошо подходит для первого черновика.",
            },
            {
              id: "bold",
              title: "Смелее и ярче",
              rationale:
                "Более резкая и цепляющая подача с сильными акцентами.",
            },
          ],
    extractionFindings:
      extractionFindings.length > 0
        ? extractionFindings
        : [
            {
              label: "Можно усилить фактуру",
              severity: "info",
              detail:
                "Если добавить цифры, примеры или короткие тезисы из материалов, презентация станет убедительнее.",
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

function getRequestedSlideCount(
  body: Record<string, unknown>,
  brief: PresentationBrief
) {
  const raw =
    typeof body.slideCount === "number"
      ? body.slideCount
      : Number(body.slideCount);

  if (Number.isFinite(raw)) {
    return Math.min(10, Math.max(4, Math.round(raw)));
  }

  const byLength: Record<PresentationLengthId, number> = {
    short: 5,
    medium: 7,
    detailed: 9,
  };

  return byLength[brief.presentationLength];
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

  if (!brief.mainThesis) {
    throw new Error("Нужна хотя бы тема презентации.");
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
    outline.package.storylineOptions.find(
      (option) => option.id === selectedStorylineId
    ) || outline.package.storylineOptions[0];

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
          message: "Собираю черновик презентации",
          detail:
            "Сначала раскладываю историю по слайдам, затем уплотняю подачу и добавляю визуальные акценты.",
          progress: 18,
        });

        const slides: Slide[] = [];

        for (let i = 0; i < outline.slides.length; i++) {
          const outlineSlide = outline.slides[i];
          const progress = Math.min(
            92,
            20 + Math.round((i / Math.max(outline.slides.length, 1)) * 62)
          );

          send("slide_start", {
            message: `Собираю слайд ${i + 1} из ${outline.slides.length}`,
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
          message: "Дошлифовываю презентацию",
          detail:
            "Проверяю ритм истории, силу заголовков и чтобы финал выглядел завершённым.",
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
        { error: "Нужна структура презентации для генерации слайдов." },
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
