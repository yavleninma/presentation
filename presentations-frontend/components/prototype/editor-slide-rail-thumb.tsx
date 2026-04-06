import type {
  ColorThemeId,
  PresentationSlide,
  TemplateId,
} from "../../lib/presentation-types";

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

export function EditorSlideRailThumb({
  slide,
  active,
  templateId,
  colorThemeId,
  onClick,
}: {
  slide: PresentationSlide;
  active: boolean;
  templateId: TemplateId;
  colorThemeId: ColorThemeId;
  onClick: () => void;
}) {
  const num = railDisplayIndex(slide);
  const listLabel = railListLabel(slide);
  const title = slide.title.trim() || listLabel;

  return (
    <button
      type="button"
      className={`editor-rail-thumb${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-label={`Слайд ${num}: ${listLabel}`}
      aria-current={active ? "true" : undefined}
    >
      <span
        className="editor-rail-thumb__preview"
        data-template={templateId}
        data-color={colorThemeId}
        aria-hidden="true"
      >
        <span className="editor-rail-thumb__accent" />
        <span className="editor-rail-thumb__num">{num}</span>
        <span className="editor-rail-thumb__title">{title}</span>
      </span>
    </button>
  );
}
