import {
  ArrowUpRight,
  BarChart3,
  Check,
  Hourglass,
  type LucideIcon,
  Search,
  ShieldAlert,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import type {
  CanvasLayoutId,
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
  const showDebugLayer =
    debugLayerEnabled && process.env.NODE_ENV !== "production";

  return (
    <article
      className="slide-canvas"
      data-template={templateId}
      data-color={colorThemeId}
      data-icon-pack={iconPack}
      data-layout={slide.canvasLayoutId}
      data-debug-layer={showDebugLayer ? "on" : "off"}
    >
      {renderSlideHeader(slide)}
      {renderSlideBody(slide, templateId, iconPack)}

      {showDebugLayer && debugPayload ? (
        <aside className="slide-canvas__debug" aria-label="Отладка слайда">
          <div className="slide-canvas__debug-head">
            <span>Отладка</span>
            <strong>{slide.railTitle || slide.title}</strong>
          </div>

          <div className="slide-canvas__debug-grid">
            <article className="slide-canvas__debug-card">
              <span className="slide-canvas__debug-kind">Черновик запроса</span>
              <strong>{formatWorkingDraftTitle(debugPayload)}</strong>
              {formatWorkingDraftLines(debugPayload).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </article>

            <article className="slide-canvas__debug-card">
              <span className="slide-canvas__debug-kind">План слайдов</span>
              <strong>{formatSlidePlanTitle(debugPayload)}</strong>
              {formatSlidePlanLines(debugPayload).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </article>

            <article className="slide-canvas__debug-card">
              <span className="slide-canvas__debug-kind">Варианты пересборки</span>
              <strong>{formatTransforms(debugPayload)}</strong>
            </article>

            <article className="slide-canvas__debug-card">
              <span className="slide-canvas__debug-kind">Подгонка вёрстки</span>
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

function renderSlideHeader(slide: PresentationSlide) {
  if (slide.canvasLayoutId === "cover") {
    return (
      <header className="slide-canvas__hero is-cover">
        <h2 className="slide-canvas__title">{slide.title}</h2>
        {slide.subtitle ? (
          <p className="slide-canvas__subtitle">{slide.subtitle}</p>
        ) : null}
        {slide.blocks[0]?.body ? (
          <p className="slide-canvas__meta">{slide.blocks[0].body}</p>
        ) : null}
      </header>
    );
  }

  const sectionLabel = getSectionLabel(slide.canvasLayoutId);

  return (
    <header className="slide-canvas__hero">
      {sectionLabel ? (
        <p className="slide-canvas__section-label">{sectionLabel}</p>
      ) : null}
      <h2 className="slide-canvas__title">{slide.title}</h2>
      {slide.subtitle ? (
        <p className="slide-canvas__subtitle">{slide.subtitle}</p>
      ) : null}
    </header>
  );
}

function renderSlideBody(
  slide: PresentationSlide,
  templateId: TemplateId,
  iconPack: TemplateIconPackId
) {
  const layout = slide.canvasLayoutId;

  if (layout === "cover") return null;

  if (layout === "metrics") {
    return (
      <section className="slide-canvas__body is-metrics">
        {slide.blocks.slice(0, 3).map((b) => (
          <article key={b.id} className={`slide-metric tone-${blockTone(b)}${b.placeholder ? " is-placeholder" : ""}`}>
            <span className="slide-metric__value">{b.metric ?? "—"}</span>
            <span className="slide-metric__label">{b.title}</span>
            {b.body ? <span className="slide-metric__desc">{b.body}</span> : null}
          </article>
        ))}
      </section>
    );
  }

  if (layout === "steps") {
    return (
      <section className="slide-canvas__body is-steps">
        {slide.blocks.slice(0, 3).map((b, i) => (
          <article key={b.id} className="slide-step">
            <span className="slide-step__num">{b.stepNumber ?? String(i + 1).padStart(2, "0")}</span>
            <span className="slide-step__connector" aria-hidden="true" />
            <h3 className="slide-step__title">{b.title}</h3>
            {b.body ? <p className="slide-step__body">{b.body}</p> : null}
          </article>
        ))}
      </section>
    );
  }

  if (layout === "checklist") {
    return (
      <section className="slide-canvas__body is-checklist">
        {slide.blocks.slice(0, 4).map((b) => (
          <article key={b.id} className={`slide-check tone-${blockTone(b)}${b.placeholder ? " is-placeholder" : ""}`}>
            <span className="slide-check__icon" aria-hidden="true">
              <Check strokeWidth={2.5} />
            </span>
            <span className="slide-check__text">{b.title}</span>
          </article>
        ))}
      </section>
    );
  }

  if (layout === "personas") {
    return (
      <section className="slide-canvas__body is-personas">
        {slide.blocks.slice(0, 3).map((b) => (
          <article key={b.id} className={`slide-persona tone-${blockTone(b)}${b.placeholder ? " is-placeholder" : ""}`}>
            <h3 className="slide-persona__role">{b.title}</h3>
            {b.body ? <p className="slide-persona__task">{b.body}</p> : null}
            {b.tagline ? (
              <>
                <span className="slide-persona__sep" aria-hidden="true" />
                <p className="slide-persona__tagline">{b.tagline}</p>
              </>
            ) : null}
          </article>
        ))}
      </section>
    );
  }

  if (layout === "features") {
    const iconStrokeWidth = getIconStrokeWidth(iconPack);
    return (
      <section className="slide-canvas__body is-features">
        {slide.blocks.slice(0, 3).map((b) => {
          const BlockIcon = BLOCK_ICON_MAP[b.icon] ?? Zap;
          return (
            <article key={b.id} className={`slide-feature tone-${blockTone(b)}${b.placeholder ? " is-placeholder" : ""}`}>
              <span className="slide-feature__icon">
                <BlockIcon aria-hidden="true" strokeWidth={iconStrokeWidth} />
              </span>
              <div className="slide-feature__content">
                <h3>{b.title}</h3>
                {b.body ? <p>{b.body}</p> : null}
              </div>
            </article>
          );
        })}
      </section>
    );
  }

  const iconStrokeWidth = getIconStrokeWidth(iconPack);
  return (
    <section className={`slide-canvas__body is-${layout}`}>
      {slide.blocks.slice(0, 3).map((b) => {
        const BlockIcon = BLOCK_ICON_MAP[b.icon] ?? Zap;
        const tone = blockTone(b);
        return (
          <article
            key={b.id}
            className={`slide-block tone-${tone}${b.placeholder ? " is-placeholder" : ""}`}
            data-template={templateId}
            data-icon-pack={iconPack}
            data-kind={b.type}
            data-icon={b.icon}
          >
            <div className="slide-block__head">
              <span className="slide-block__icon" data-template={templateId} data-icon-pack={iconPack}>
                <BlockIcon aria-hidden="true" strokeWidth={iconStrokeWidth} />
              </span>
              <h3>{b.title}</h3>
            </div>
            <p className="slide-block__body">{b.body}</p>
          </article>
        );
      })}
    </section>
  );
}

function getSectionLabel(layout: CanvasLayoutId): string | null {
  switch (layout) {
    case "metrics": return null;
    case "steps": return null;
    case "checklist": return null;
    case "personas": return null;
    case "features": return null;
    default: return null;
  }
}

function railDisplayIndex(slide: PresentationSlide): string {
  const n = parseInt(slide.index, 10);
  return Number.isFinite(n) ? String(n) : slide.index;
}

function railListLabel(slide: PresentationSlide): string {
  const raw = slide.railTitle.trim();
  const n = String(parseInt(slide.index, 10) || 0);
  const re = new RegExp(`^0*${n}\\s*[—-]\\s*(.+)$`);
  const m = raw.match(re);
  if (m) {
    return m[1].trim();
  }

  const any = raw.match(/^\d+\s*[—-]\s*(.+)$/);
  if (any) {
    return any[1].trim();
  }

  return raw;
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
  const label = railListLabel(slide);
  const num = railDisplayIndex(slide);

  return (
    <button
      type="button"
      className={`slide-thumbnail slide-thumbnail--rail-v3${active ? " is-active" : ""}`}
      data-layout={slide.canvasLayoutId}
      onClick={onClick}
      aria-label={`Слайд ${num}: ${label}`}
    >
      <span className="slide-thumbnail__num" aria-hidden="true">
        {num}
      </span>
      <span className="slide-thumbnail__title">{label}</span>
    </button>
  );
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
      transformId
        ? `${slideId}: ${transformId}`
        : `${slideId}: по умолчанию`
    )
    .slice(0, 3);

  return labels.length > 0 ? labels.join(" · ") : "Нет данных";
}

function formatFitPassTitle(result: FitPassResult | null) {
  if (!result) {
    return "Нет данных";
  }

  return result.repaired ? "Была доработка вёрстки" : "Без доработки вёрстки";
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
