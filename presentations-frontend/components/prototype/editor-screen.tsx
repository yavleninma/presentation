"use client";

import { X } from "lucide-react";
import {
  COLOR_OPTIONS,
  REGEN_ACTIONS,
  TEMPLATE_OPTIONS,
} from "@/lib/demo-generator";
import type {
  ColorId,
  EditorDrawerState,
  PresentationDraft,
  StorylineModeId,
  TemplateId,
} from "@/lib/presentation-types";
import { SlideCanvas, SlideThumbnail } from "@/components/slide-canvas";

export function EditorScreen({
  draft,
  activeSlideId,
  drawerState,
  templateId,
  colorId,
  onSelectSlide,
  onOpenDrawer,
  onCloseDrawer,
  onSelectTemplate,
  onSelectColor,
  onRegenerateSlide,
}: {
  draft: PresentationDraft;
  activeSlideId: PresentationDraft["slides"][number]["id"] | null;
  drawerState: EditorDrawerState;
  templateId: TemplateId;
  colorId: ColorId;
  onSelectSlide: (value: PresentationDraft["slides"][number]["id"]) => void;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  onSelectTemplate: (value: TemplateId) => void;
  onSelectColor: (value: ColorId) => void;
  onRegenerateSlide: (variant: StorylineModeId) => void;
}) {
  const activeSlide =
    draft.slides.find((slide) => slide.id === activeSlideId) ?? draft.slides[0];

  return (
    <section className="editor-stage">
      <div className="editor-shell">
        <aside className="editor-rail">
          <div className="rail-title">Структура</div>
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
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <span>Шаблон</span>
              <div className="segmented">
                {TEMPLATE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`seg${templateId === option.id ? " is-active" : ""}`}
                    onClick={() => onSelectTemplate(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="toolbar-group">
              <span>Цвет</span>
              <div className="segmented">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`seg${colorId === option.id ? " is-active" : ""}`}
                    onClick={() => onSelectColor(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="canvas-wrap">
            <SlideCanvas
              slide={activeSlide}
              templateId={templateId}
              colorId={colorId}
            />
          </div>
        </section>

        {drawerState === "open" ? (
          <aside className="editor-drawer">
            <div className="drawer-head">
              <h2>Пересобрать слайд</h2>
              <button type="button" className="icon-button" onClick={onCloseDrawer}>
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="drawer-actions">
              {REGEN_ACTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`regen-button${
                    draft.activeVariant === option.id ? " is-active" : ""
                  }`}
                  onClick={() => onRegenerateSlide(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </aside>
        ) : (
          <button type="button" className="drawer-trigger" onClick={onOpenDrawer}>
            Пересобрать слайд
          </button>
        )}
      </div>
    </section>
  );
}
