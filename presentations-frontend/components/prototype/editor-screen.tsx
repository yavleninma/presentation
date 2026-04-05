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
            <label className="quiet-select">
              <span>Шаблон</span>
              <select
                value={draft.workingDraft.templateId}
                onChange={(event) =>
                  onSelectTemplate(event.target.value as TemplateId)
                }
              >
                {TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="quiet-select">
              <span>Цвет</span>
              <select
                value={draft.workingDraft.colorThemeId}
                onChange={(event) =>
                  onSelectColor(event.target.value as ColorThemeId)
                }
              >
                {COLOR_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
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
