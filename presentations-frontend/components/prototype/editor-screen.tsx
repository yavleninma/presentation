"use client";

import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import { COLOR_OPTIONS, TEMPLATE_OPTIONS } from "../../lib/demo-generator";
import type {
  ColorThemeId,
  EditorDrawerState,
  HiddenTransformId,
  PresentationDraft,
  TemplateId,
} from "../../lib/presentation-types";
import { BrandMark } from "../brand-mark";
import {
  SlideCanvas,
  SlideThumbnail,
  type SlideCanvasDebugPayload,
} from "../slide-canvas";

export function EditorScreen({
  draft,
  activeSlideId,
  drawerState,
  onSelectSlide,
  onOpenDrawer,
  onCloseDrawer,
  onSelectTemplate,
  onSelectColor,
  onRegenerateSlide,
  onRenameDocument,
  onBackToStart,
  slideSpeakerNote,
  onSlideSpeakerNoteChange,
  debugLayerEnabled = false,
}: {
  draft: PresentationDraft;
  activeSlideId: PresentationDraft["slides"][number]["id"] | null;
  drawerState: EditorDrawerState;
  onSelectSlide: (value: PresentationDraft["slides"][number]["id"]) => void;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  onSelectTemplate: (value: TemplateId) => void;
  onSelectColor: (value: ColorThemeId) => void;
  onRegenerateSlide: (transformId: HiddenTransformId) => void;
  onRenameDocument: (value: string) => void;
  onBackToStart: () => void;
  slideSpeakerNote: string;
  onSlideSpeakerNoteChange: (value: string) => void;
  debugLayerEnabled?: boolean;
}) {
  const activeSlide =
    draft.slides.find((slide) => slide.id === activeSlideId) ?? draft.slides[0];

  if (!activeSlide) {
    return null;
  }

  const showDebugLayer =
    debugLayerEnabled && process.env.NODE_ENV !== "production";
  const debugPayload = showDebugLayer
    ? buildDebugPayload(draft, activeSlide.id)
    : null;

  const templateLabel =
    TEMPLATE_OPTIONS.find((o) => o.id === draft.workingDraft.templateId)
      ?.label ?? "";
  const colorLabel =
    COLOR_OPTIONS.find((o) => o.id === draft.workingDraft.colorThemeId)
      ?.label ?? "";

  const slideList = draft.slides;
  const activeIdx = slideList.findIndex((s) => s.id === activeSlide.id);
  const slidePos = activeIdx >= 0 ? activeIdx + 1 : 1;
  const slideTotal = slideList.length;

  return (
    <section className="editor-stage">
      <div
        className="editor-shell"
        data-debug-layer={showDebugLayer ? "on" : "off"}
      >
        <div className="editor-topbar">
          <div className="brand-block editor-brand">
            <button
              type="button"
              className="editor-back-button"
              onClick={onBackToStart}
              aria-label="Новый запрос"
              title="Новый запрос"
            >
              <ArrowLeft size={16} />
            </button>
            <BrandMark />
            <span className="brand-name">Внятно</span>
          </div>

          <label className="editor-title-field">
            <input
              type="text"
              value={draft.documentTitle}
              onChange={(event) => onRenameDocument(event.target.value)}
              aria-label="Название презентации"
            />
          </label>

          <div className="editor-topbar-controls editor-topbar-pills">
            <label className="editor-pill-select">
              <span className="editor-pill-select__body">
                <span className="editor-pill-select__prefix">Шаблон:</span>
                <span className="editor-pill-select__value">{templateLabel}</span>
              </span>
              <ChevronDown
                className="editor-pill-select__chevron"
                size={16}
                strokeWidth={2}
                aria-hidden
              />
              <select
                className="editor-pill-select__native"
                value={draft.workingDraft.templateId}
                onChange={(event) =>
                  onSelectTemplate(event.target.value as TemplateId)
                }
                aria-label="Шаблон оформления"
              >
                {TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="editor-pill-select">
              <span
                className="editor-pill-color-dot"
                data-color={draft.workingDraft.colorThemeId}
                aria-hidden
              />
              <span className="editor-pill-select__body">
                <span className="editor-pill-select__prefix">Цвет:</span>
                <span className="editor-pill-select__value">{colorLabel}</span>
              </span>
              <ChevronDown
                className="editor-pill-select__chevron"
                size={16}
                strokeWidth={2}
                aria-hidden
              />
              <select
                className="editor-pill-select__native"
                value={draft.workingDraft.colorThemeId}
                onChange={(event) =>
                  onSelectColor(event.target.value as ColorThemeId)
                }
                aria-label="Цветовая схема"
              >
                {COLOR_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className={`drawer-trigger drawer-trigger--pill${drawerState === "open" ? " is-active" : ""}`}
              onClick={drawerState === "open" ? onCloseDrawer : onOpenDrawer}
              aria-label={
                drawerState === "open"
                  ? "Закрыть настройки слайда"
                  : "Открыть настройки слайда"
              }
              title={
                drawerState === "open"
                  ? "Закрыть настройки слайда"
                  : "Открыть настройки слайда"
              }
            >
              <Sparkles size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="editor-body" data-drawer={drawerState}>
          <aside className="editor-rail" aria-label="Слайды презентации">
            <div className="rail-list">
              {draft.slides.map((slide) => (
                <SlideThumbnail
                  key={slide.id}
                  slide={slide}
                  active={slide.id === activeSlide.id}
                  onClick={() => onSelectSlide(slide.id)}
                />
              ))}
            </div>
          </aside>

          <section className="editor-main">
            <div className="canvas-wrap">
              <SlideCanvas
                slide={activeSlide}
                templateId={draft.workingDraft.templateId}
                colorThemeId={draft.workingDraft.colorThemeId}
                debugLayerEnabled={showDebugLayer}
                debugPayload={debugPayload}
              />
            </div>
            <footer
              className="editor-slide-footer"
              aria-label="Навигация по слайдам"
            >
              <button
                type="button"
                className="editor-slide-footer__btn"
                disabled={activeIdx <= 0}
                onClick={() =>
                  activeIdx > 0 &&
                  onSelectSlide(slideList[activeIdx - 1].id)
                }
                aria-label="Предыдущий слайд"
              >
                <ChevronLeft size={18} strokeWidth={2} aria-hidden />
              </button>
              <p className="editor-slide-footer__label">
                Слайд {slidePos} из {slideTotal}
              </p>
              <button
                type="button"
                className="editor-slide-footer__btn"
                disabled={activeIdx < 0 || activeIdx >= slideTotal - 1}
                onClick={() =>
                  activeIdx >= 0 &&
                  activeIdx < slideTotal - 1 &&
                  onSelectSlide(slideList[activeIdx + 1].id)
                }
                aria-label="Следующий слайд"
              >
                <ChevronRight size={18} strokeWidth={2} aria-hidden />
              </button>
            </footer>
          </section>

          {drawerState === "open" && (
            <aside className="editor-drawer editor-drawer--v3">
              <div className="drawer-head">
                <h2 className="drawer-head__title">Настройки слайда</h2>
                <button
                  type="button"
                  className="icon-button icon-button--drawer"
                  onClick={onCloseDrawer}
                  aria-label="Закрыть панель"
                >
                  <X aria-hidden="true" />
                </button>
              </div>

              <div className="drawer-section">
                <h3 className="drawer-section__label">Действия</h3>
                <div className="drawer-actions">
                  {activeSlide.drawerActions.slice(0, 3).map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className={`regen-button${
                        activeSlide.lastTransformId === action.transformId
                          ? " is-active"
                          : ""
                      }`}
                      onClick={() => onRegenerateSlide(action.transformId)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="drawer-section">
                <label className="drawer-section__label" htmlFor="drawer-slide-notes">
                  Заметки к слайду
                </label>
                <textarea
                  id="drawer-slide-notes"
                  className="drawer-notes-field"
                  value={slideSpeakerNote}
                  onChange={(event) =>
                    onSlideSpeakerNoteChange(event.target.value)
                  }
                  rows={5}
                  placeholder="Коротко для выступления или правки…"
                  autoComplete="off"
                />
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}

function buildDebugPayload(
  draft: PresentationDraft,
  activeSlideId: PresentationDraft["slides"][number]["id"]
): SlideCanvasDebugPayload {
  return {
    currentWorkingDraft: draft.debug.currentWorkingDraft,
    hiddenSlidePlan: draft.debug.hiddenSlidePlan,
    chosenTransformIds: draft.debug.chosenTransformIds,
    activeFitPassResult: draft.debug.fitPassResultBySlide[activeSlideId] ?? null,
  };
}
