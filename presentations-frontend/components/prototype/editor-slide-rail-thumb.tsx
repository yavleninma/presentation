import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import type {
  ColorThemeId,
  PresentationSlide,
  TemplateId,
} from "../../lib/presentation-types";

function railDisplayIndex(slide: PresentationSlide): string {
  return String(slide.index + 1);
}

function railListLabel(slide: PresentationSlide): string {
  const raw = slide.railTitle.trim();
  const n = String(slide.index + 1);
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
  isFirst,
  isLast,
  canDelete,
  onClick,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  slide: PresentationSlide;
  active: boolean;
  templateId: TemplateId;
  colorThemeId: ColorThemeId;
  isFirst: boolean;
  isLast: boolean;
  canDelete: boolean;
  onClick: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const num = railDisplayIndex(slide);
  const listLabel = railListLabel(slide);
  const title = slide.title.trim() || listLabel;

  return (
    <div className={`rail-thumb-wrap${active ? " is-active" : ""}`}>
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

      <div className="rail-thumb-actions" aria-label="Управление слайдом">
        {!isFirst && (
          <button
            type="button"
            className="rail-thumb-action"
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            aria-label="Переместить выше"
            title="Выше"
          >
            <ArrowUp size={12} strokeWidth={2} aria-hidden />
          </button>
        )}
        {!isLast && (
          <button
            type="button"
            className="rail-thumb-action"
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            aria-label="Переместить ниже"
            title="Ниже"
          >
            <ArrowDown size={12} strokeWidth={2} aria-hidden />
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="rail-thumb-action rail-thumb-action--danger"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            aria-label="Удалить слайд"
            title="Удалить"
          >
            <X size={12} strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

export function EditorSlideRailAdd({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rail-add-btn"
      onClick={onClick}
      aria-label="Добавить слайд"
      title="Добавить слайд"
    >
      <Plus size={16} strokeWidth={2} aria-hidden />
    </button>
  );
}
