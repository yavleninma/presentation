import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Dot,
  FileText,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import type {
  ColorId,
  PresentationSlide,
  TemplateId,
  ToneId,
} from "@/lib/presentation-types";

const slideIconMap: Record<PresentationSlide["layout"], LucideIcon> = {
  cover: FileText,
  summary: Compass,
  changes: Lightbulb,
  evidence: CheckCircle2,
  risks: AlertTriangle,
  "next-step": Compass,
};

const blockIconMap: Record<ToneId, LucideIcon> = {
  primary: Compass,
  success: CheckCircle2,
  warning: AlertTriangle,
  neutral: Dot,
};

export function SlideCanvas({
  slide,
  templateId,
  colorId,
}: {
  slide: PresentationSlide;
  templateId: TemplateId;
  colorId: ColorId;
}) {
  const SlideIcon = slideIconMap[slide.layout];

  return (
    <article
      className="slide-canvas"
      data-template={templateId}
      data-color={colorId}
    >
      <header className="slide-canvas__head">
        <div className="slide-canvas__label">
          <span>{slide.index}</span>
          <span>{slide.shortLabel}</span>
        </div>

        <div className="slide-canvas__role">
          <SlideIcon aria-hidden="true" />
          <span>{slide.subtitle}</span>
        </div>
      </header>

      <div className="slide-canvas__hero">
        <h2 className="slide-canvas__title">{slide.title}</h2>
      </div>

      <section className={`slide-canvas__body is-${slide.layout}`}>
        {slide.blocks.map((block) => {
          const BlockIcon = blockIconMap[block.tone];

          return (
            <article
              key={block.id}
              className={`slide-block tone-${block.tone}${
                block.placeholder ? " is-placeholder" : ""
              }`}
            >
              <div className="slide-block__head">
                <span className="slide-block__icon">
                  <BlockIcon aria-hidden="true" />
                </span>
                <h3>{block.title}</h3>
              </div>

              {block.emphasis ? (
                <p className="slide-block__emphasis">{block.emphasis}</p>
              ) : null}

              {block.body ? <p className="slide-block__body">{block.body}</p> : null}

              {block.items?.length ? (
                <ul className="slide-block__list">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </section>

      {slide.speakerNote || slide.ask ? (
        <footer className="slide-canvas__foot">
          {slide.speakerNote ? (
            <div className="slide-canvas__speaker">
              <span>Опора спикеру</span>
              <p>{slide.speakerNote}</p>
            </div>
          ) : null}

          {slide.ask ? (
            <div className="slide-canvas__ask">
              <span>{slide.ask.title}</span>
              <p>{slide.ask.body}</p>
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
      className={`slide-thumbnail${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      <div className="slide-thumbnail__topline">
        <span>{slide.index}</span>
        <span>{slide.shortLabel}</span>
      </div>
      <strong>{slide.title}</strong>
      <p>{slide.subtitle}</p>
    </button>
  );
}
