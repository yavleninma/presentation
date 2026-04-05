import {
  ArrowUpRight,
  BarChart3,
  Hourglass,
  type LucideIcon,
  Search,
  ShieldAlert,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import type {
  ColorThemeId,
  FitPassResult,
  PresentationDebugState,
  PresentationSlide,
  SlideBlock,
  SlideToneId,
  TemplateIconPackId,
  TemplateId,
} from "../lib/presentation-types";

const TEMPLATE_ICON_PACKS: Record<TemplateId, TemplateIconPackId> = {
  strict: "outline",
  cards: "solid-minimal",
  briefing: "duotone-minimal",
};

const BLOCK_ICON_MAP: Record<SlideBlock["icon"], LucideIcon> = {
  spark: Zap,
  file: BarChart3,
  trend: TrendingUp,
  shield: ShieldAlert,
  flag: Target,
  gap: Search,
  arrow: ArrowUpRight,
  clock: Hourglass,
};

export interface SlideCanvasDebugPayload {
  currentWorkingDraft: PresentationDebugState["currentWorkingDraft"];
  hiddenSlidePlan: PresentationDebugState["hiddenSlidePlan"];
  chosenTransformIds: PresentationDebugState["chosenTransformIds"];
  activeFitPassResult: FitPassResult | null;
}

export function SlideCanvas({
  slide,
  templateId,
  colorThemeId,
  debugLayerEnabled = false,
  debugPayload = null,
}: {
  slide: PresentationSlide;
  templateId: TemplateId;
  colorThemeId: ColorThemeId;
  debugLayerEnabled?: boolean;
  debugPayload?: SlideCanvasDebugPayload | null;
}) {
  const iconPack = TEMPLATE_ICON_PACKS[templateId];
  const iconStrokeWidth = getIconStrokeWidth(iconPack);
  const showDebugLayer =
    debugLayerEnabled && process.env.NODE_ENV !== "production";

  return (
    <article
      className="slide-canvas"
      data-template={templateId}
      data-color={colorThemeId}
      data-icon-pack={iconPack}
      data-debug-layer={showDebugLayer ? "on" : "off"}
    >
      <header className="slide-canvas__hero">
        {slide.subtitle ? (
          <p className="slide-canvas__subtitle">{slide.subtitle}</p>
        ) : null}
        <h2 className="slide-canvas__title">{slide.title}</h2>
      </header>

      <section className={`slide-canvas__body is-${slide.canvasLayoutId}`}>
        {slide.blocks.slice(0, 3).map((block) => {
          const BlockIcon = BLOCK_ICON_MAP[block.icon] ?? Zap;
          const tone = blockTone(block);

          return (
            <article
              key={block.id}
              className={`slide-block tone-${tone}${
                block.placeholder ? " is-placeholder" : ""
              }`}
              data-template={templateId}
              data-icon-pack={iconPack}
              data-kind={block.type}
              data-icon={block.icon}
            >
              <div className="slide-block__head">
                <span
                  className="slide-block__icon"
                  data-template={templateId}
                  data-icon-pack={iconPack}
                >
                  <BlockIcon aria-hidden="true" strokeWidth={iconStrokeWidth} />
                </span>
                <h3>{block.title}</h3>
              </div>

              <p className="slide-block__body">{block.body}</p>
            </article>
          );
        })}
      </section>

      {showDebugLayer && debugPayload ? (
        <aside className="slide-canvas__debug" aria-label="Debug layer">
          <div className="slide-canvas__debug-head">
            <span>Debug layer</span>
            <strong>{slide.railTitle || slide.title}</strong>
          </div>

          <div className="slide-canvas__debug-grid">
            <article className="slide-canvas__debug-card">
              <span className="slide-canvas__debug-kind">WorkingDraft</span>
              <strong>{formatWorkingDraftTitle(debugPayload)}</strong>
              {formatWorkingDraftLines(debugPayload).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </article>

            <article className="slide-canvas__debug-card">
              <span className="slide-canvas__debug-kind">Slide plan</span>
              <strong>{formatSlidePlanTitle(debugPayload)}</strong>
              {formatSlidePlanLines(debugPayload).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </article>

            <article className="slide-canvas__debug-card">
              <span className="slide-canvas__debug-kind">Transforms</span>
              <strong>{formatTransforms(debugPayload)}</strong>
            </article>

            <article className="slide-canvas__debug-card">
              <span className="slide-canvas__debug-kind">Fit-pass</span>
              <strong>{formatFitPassTitle(debugPayload.activeFitPassResult)}</strong>
              {formatFitPassLines(debugPayload.activeFitPassResult).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </article>
          </div>
        </aside>
      ) : null}
    </article>
  );
}

export function SlideThumbnail({
  slide,
  active,
  onClick,
}: {
  slide: PresentationSlide;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`slide-thumbnail${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-label={`${slide.index} ${slide.railTitle}`}
    >
      <div className="slide-thumbnail__topline">
        <span>{slide.index}</span>
      </div>
      <strong>{slide.railTitle}</strong>
      <div className="slide-thumbnail__rhythm" aria-hidden="true">
        {buildRailRhythmPreview(slide).map((tone, index) => (
          <span key={`${slide.id}-${tone}-${index}`} data-tone={tone} />
        ))}
      </div>
    </button>
  );
}

function buildRailRhythmPreview(slide: PresentationSlide) {
  if (slide.railRhythm.length > 0) {
    return slide.railRhythm.slice(0, 4);
  }

  return slide.blocks
    .filter((block) => !block.placeholder)
    .slice(0, 4)
    .map(blockTone);
}

function blockTone(block: SlideBlock): SlideToneId {
  if (block.type === "movement") {
    return "success";
  }

  if (block.type === "constraint") {
    return "warning";
  }

  if (block.type === "focus" || block.type === "decision") {
    return "primary";
  }

  return "neutral";
}

function getIconStrokeWidth(templateId: TemplateIconPackId) {
  if (templateId === "solid-minimal") {
    return 2.35;
  }

  if (templateId === "duotone-minimal") {
    return 2.05;
  }

  return 1.85;
}

function formatWorkingDraftTitle(payload: SlideCanvasDebugPayload) {
  return [
    payload.currentWorkingDraft.presentationIntent,
    payload.currentWorkingDraft.audience,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatWorkingDraftLines(payload: SlideCanvasDebugPayload) {
  const lines: string[] = [];

  if (payload.currentWorkingDraft.desiredOutcome) {
    lines.push(payload.currentWorkingDraft.desiredOutcome);
  }

  if (typeof payload.currentWorkingDraft.confidence === "number") {
    lines.push(
      `Уверенность ${Math.round(payload.currentWorkingDraft.confidence * 100)}%`
    );
  }

  if (payload.currentWorkingDraft.missingFacts.length > 0) {
    lines.push(
      `Пробелы: ${payload.currentWorkingDraft.missingFacts.slice(0, 2).join(" · ")}`
    );
  }

  return lines;
}

function formatSlidePlanTitle(payload: SlideCanvasDebugPayload) {
  const first = payload.hiddenSlidePlan[0];

  if (!first) {
    return "Нет данных";
  }

  return `#${first.slotId} · ${first.slideFunctionId}`;
}

function formatSlidePlanLines(payload: SlideCanvasDebugPayload) {
  return payload.hiddenSlidePlan.slice(0, 3).flatMap((entry) => [
    `#${entry.slotId} · ${entry.slideFunctionId}`,
    entry.coreMessage,
  ]);
}

function formatTransforms(payload: SlideCanvasDebugPayload) {
  const labels = Object.entries(payload.chosenTransformIds)
    .map(([slideId, transformId]) =>
      transformId ? `${slideId}: ${transformId}` : `${slideId}: default`
    )
    .slice(0, 3);

  return labels.length > 0 ? labels.join(" · ") : "Нет данных";
}

function formatFitPassTitle(result: FitPassResult | null) {
  if (!result) {
    return "Нет данных";
  }

  return result.repaired ? "Был repair pass" : "Без repair pass";
}

function formatFitPassLines(result: FitPassResult | null) {
  if (!result) {
    return [];
  }

  const lines = [...result.notes];

  if (result.overflowWidthRisk) {
    lines.push("Есть риск по ширине");
  }

  if (result.overflowHeightRisk) {
    lines.push("Есть риск по высоте");
  }

  return lines.slice(0, 3);
}
