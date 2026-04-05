"use client";

import { X } from "lucide-react";
import { COLOR_OPTIONS, TEMPLATE_OPTIONS } from "../../lib/demo-generator";
import type {
  ColorThemeId,
  EditorDrawerState,
  HiddenTransformId,
  PresentationDraft,
  TemplateId,
} from "../../lib/presentation-types";
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
              ←
            </button>
            <span className="brand-mark" aria-hidden="true">
              В
            </span>
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

          <div className="editor-topbar-controls">
            <div className="segmented-group">
              <span className="segmented-label">Шаблон</span>
              <div className="segmented-control">
                {TEMPLATE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`segmented-option${draft.workingDraft.templateId === option.id ? " is-active" : ""}`}
                    onClick={() => onSelectTemplate(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="segmented-group">
              <span className="segmented-label">Цвет</span>
              <div className="segmented-control">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`segmented-option${draft.workingDraft.colorThemeId === option.id ? " is-active" : ""}`}
                    data-color={option.id}
                    onClick={() => onSelectColor(option.id)}
                  >
                    <span className="segmented-color-dot" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="editor-body">
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
          </section>

          {drawerState === "open" ? (
            <aside className="editor-drawer">
              <div className="drawer-head">
                <h2>Переосмыслить слайд</h2>
                <button
                  type="button"
                  className="icon-button"
                  onClick={onCloseDrawer}
                  aria-label="Закрыть панель"
                >
                  <X aria-hidden="true" />
                </button>
              </div>

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

              <div className="drawer-void" aria-hidden="true" />
            </aside>
          ) : (
            <button
              type="button"
              className="drawer-trigger"
              onClick={onOpenDrawer}
            >
              Другой взгляд
            </button>
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
