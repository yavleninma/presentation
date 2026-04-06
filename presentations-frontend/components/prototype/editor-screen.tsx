"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { COLOR_OPTIONS, TEMPLATE_OPTIONS } from "../../lib/demo-generator";
import type {
  ColorThemeId,
  EditorDrawerState,
  HiddenTransformId,
  PresentationDraft,
  TemplateId,
} from "../../lib/presentation-types";
import { BrandMark, BrandWordmark } from "../brand-mark";
import { BackButton } from "../ui/back-button";
import { SlideCanvas, type SlideCanvasDebugPayload } from "../slide-canvas";
import { EditorSlideRailThumb } from "./editor-slide-rail-thumb";

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
  onBackToDraft,
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
  onBackToDraft: () => void;
  onBackToStart: () => void;
  slideSpeakerNote: string;
  onSlideSpeakerNoteChange: (value: string) => void;
  debugLayerEnabled?: boolean;
}) {
  // — hooks first, before any early return —
  const [isPresenting, setIsPresenting] = useState(false);
  const [presenterScale, setPresenterScale] = useState(1);

  // Natural slide dimensions (matches .slide-canvas max width = 58rem at 16px)
  const SLIDE_W = 928;
  const SLIDE_H = 522; // 928 * 9/16

  const activeSlide =
    draft.slides.find((slide) => slide.id === activeSlideId) ?? draft.slides[0];

  const slideList = draft.slides;
  const activeIdx = slideList.findIndex((s) => s.id === (activeSlide?.id ?? ""));
  const slidePos = activeIdx >= 0 ? activeIdx + 1 : 1;
  const slideTotal = slideList.length;

  // Keep latest nav values in a ref to avoid stale closures in keyboard handler
  const navRef = useRef({ activeIdx, slideList, slideTotal, onSelectSlide });

  useLayoutEffect(() => {
    navRef.current = { activeIdx, slideList, slideTotal, onSelectSlide };
  }, [activeIdx, slideList, slideTotal, onSelectSlide]);

  useEffect(() => {
    function onFSChange() {
      if (!document.fullscreenElement) {
        setIsPresenting(false);
      }
    }
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  useEffect(() => {
    if (!isPresenting) return;
    const PAD = 48;
    function computeScale() {
      const maxW = window.innerWidth - PAD * 2;
      const maxH = window.innerHeight - PAD * 2;
      setPresenterScale(Math.min(maxW / SLIDE_W, maxH / SLIDE_H));
    }
    computeScale();
    window.addEventListener("resize", computeScale);
    return () => window.removeEventListener("resize", computeScale);
  }, [isPresenting]);

  useEffect(() => {
    if (!isPresenting) return;
    function onKeyDown(e: KeyboardEvent) {
      const { activeIdx: idx, slideList: list, slideTotal: total, onSelectSlide: select } =
        navRef.current;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        if (idx >= 0 && idx < total - 1) select(list[idx + 1].id);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (idx > 0) select(list[idx - 1].id);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPresenting]);

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

  function enterPresentation() {
    setIsPresenting(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  function exitPresentation() {
    setIsPresenting(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  return (
    <>
    {isPresenting && (
      <div className="presenter-overlay" role="dialog" aria-modal="true" aria-label="Показ презентации">
        {/* Wrapper takes the scaled visual dimensions so the flex container centres it correctly */}
        <div
          className="presenter-scale-host"
          style={{ width: SLIDE_W * presenterScale, height: SLIDE_H * presenterScale }}
        >
          <div
            className="presenter-slide-inner"
            style={{
              width: SLIDE_W,
              height: SLIDE_H,
              transform: `scale(${presenterScale})`,
              transformOrigin: "top left",
            }}
          >
            <SlideCanvas
              slide={activeSlide}
              templateId={draft.workingDraft.templateId}
              colorThemeId={draft.workingDraft.colorThemeId}
            />
          </div>
        </div>

        <button
          type="button"
          className="presenter-nav-btn presenter-nav-btn--prev"
          disabled={activeIdx <= 0}
          onClick={() => activeIdx > 0 && onSelectSlide(slideList[activeIdx - 1].id)}
          aria-label="Предыдущий слайд"
        >
          <ChevronLeft size={28} strokeWidth={2} aria-hidden />
        </button>

        <button
          type="button"
          className="presenter-nav-btn presenter-nav-btn--next"
          disabled={activeIdx < 0 || activeIdx >= slideTotal - 1}
          onClick={() =>
            activeIdx >= 0 && activeIdx < slideTotal - 1 &&
            onSelectSlide(slideList[activeIdx + 1].id)
          }
          aria-label="Следующий слайд"
        >
          <ChevronRight size={28} strokeWidth={2} aria-hidden />
        </button>

        <div className="presenter-footer">
          <span className="presenter-counter">{slidePos} / {slideTotal}</span>
        </div>

        <button
          type="button"
          className="presenter-exit-btn"
          onClick={exitPresentation}
          aria-label="Выйти из показа"
          title="Выйти (Escape)"
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>
    )}

    <section className="editor-stage">
      <div
        className="editor-shell"
        data-debug-layer={showDebugLayer ? "on" : "off"}
      >
        <div className="editor-topbar">
          <div className="brand-block editor-brand">
            <BackButton onClick={onBackToDraft} ariaLabel="К черновику" title="К черновику" />
            <BrandMark />
            <BrandWordmark className="brand-name" />
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
            <div className="editor-topbar-secondary">
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
                    ? "Закрыть доработку слайда"
                    : "Доработка слайда"
                }
                title={
                  drawerState === "open"
                    ? "Закрыть доработку слайда"
                    : "Доработка слайда"
                }
              >
                <Sparkles size={16} strokeWidth={2} aria-hidden />
                <span>Доработка</span>
              </button>
            </div>

            <button
              type="button"
              className="editor-pill-btn editor-pill-btn--primary"
              onClick={enterPresentation}
              aria-label="Показать презентацию"
              title="Показать"
            >
              <Maximize2 size={15} strokeWidth={2} aria-hidden />
              <span>Показать</span>
            </button>
          </div>
        </div>

        <div className="editor-body" data-drawer={drawerState}>
          <aside className="editor-rail" aria-label="Слайды презентации">
            <div className="rail-list">
              {draft.slides.map((slide) => (
                <EditorSlideRailThumb
                  key={slide.id}
                  slide={slide}
                  active={slide.id === activeSlide.id}
                  templateId={draft.workingDraft.templateId}
                  colorThemeId={draft.workingDraft.colorThemeId}
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
                <h2 className="drawer-head__title">Доработка слайда</h2>
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
    </>
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
