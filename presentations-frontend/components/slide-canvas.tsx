import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Compass,
  FileStack,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  PresentationSlide,
  SlideMetric,
  SlidePanel,
  ToneId,
} from "@/lib/presentation-types";

const toneClassMap: Record<ToneId, string> = {
  primary: "tone-primary",
  success: "tone-success",
  warning: "tone-warning",
  danger: "tone-danger",
};

const slideIconMap = {
  cover: Sparkles,
  summary: Compass,
  metrics: BarChart3,
  work: FileStack,
  risks: AlertTriangle,
  "next-step": ArrowUpRight,
};

export function SlideCanvas({ slide }: { slide: PresentationSlide }) {
  const SlideIcon = slideIconMap[slide.layout] ?? Sparkles;

  return (
    <article className="slide-canvas">
      <header className="slide-topline">
        <div className="slide-label">
          <span className="slide-index">{slide.index}</span>
          <span>{slide.eyebrow}</span>
        </div>
        <div className="slide-role">
          <SlideIcon aria-hidden="true" />
          <span>{slide.shortLabel}</span>
        </div>
      </header>

      <div className="slide-hero">
        <div className="slide-title-wrap">
          <p className="slide-kicker">{slide.subtitle}</p>
          <h2 className="slide-title">{slide.title}</h2>
          <p className="slide-lead">{slide.lead}</p>
        </div>

        {slide.layout === "cover" && slide.bullets ? (
          <div className="slide-cover-aside">
            <div className="slide-context-label">В фокусе</div>
            <ul className="slide-cover-list">
              {slide.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {slide.bullets && slide.layout !== "cover" ? (
        <ul className="slide-bullets">
          {slide.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      {slide.metrics ? (
        <section className="slide-metric-grid">
          {slide.metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>
      ) : null}

      {slide.panels ? (
        <section className="slide-panel-grid">
          {slide.panels.map((panel) => (
            <PanelCard key={panel.title} panel={panel} />
          ))}
        </section>
      ) : null}

      {(slide.ask || slide.missingFacts?.length) ? (
        <footer className="slide-footer">
          {slide.ask ? (
            <div className="slide-ask">
              <div className="slide-ask-label">{slide.ask.title}</div>
              <p>{slide.ask.body}</p>
            </div>
          ) : null}

          {slide.missingFacts?.length ? (
            <div className="missing-fact-list">
              {slide.missingFacts.map((item) => (
                <span key={item} className="missing-fact-chip">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </footer>
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
      onClick={onClick}
      className={`slide-thumbnail ${active ? "is-active" : ""}`}
    >
      <div className="slide-thumbnail-topline">
        <span>{slide.index}</span>
        <span>{slide.shortLabel}</span>
      </div>
      <div className="slide-thumbnail-body">
        <div className="slide-thumbnail-eyebrow">{slide.eyebrow}</div>
        <div className="slide-thumbnail-title">{slide.title}</div>
        <div className="slide-thumbnail-subtitle">{slide.subtitle}</div>
      </div>
    </button>
  );
}

function MetricCard({ metric }: { metric: SlideMetric }) {
  return (
    <div className={`metric-card ${toneClassMap[metric.tone]}`}>
      <div className="metric-card-label">{metric.label}</div>
      <div className="metric-card-value">{metric.value}</div>
      <p className="metric-card-note">{metric.note}</p>
      {metric.placeholder ? (
        <span className="metric-card-placeholder">
          <ShieldCheck aria-hidden="true" />
          Нужна цифра
        </span>
      ) : null}
    </div>
  );
}

function PanelCard({ panel }: { panel: SlidePanel }) {
  return (
    <div className={`panel-card ${toneClassMap[panel.tone ?? "primary"]}`}>
      <div className="panel-card-head">
        <h3>{panel.title}</h3>
        {panel.badge ? <span>{panel.badge}</span> : null}
      </div>
      <p>{panel.body}</p>
      {panel.items?.length ? (
        <ul>
          {panel.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
