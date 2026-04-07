"use client";

import { Clock, Paperclip, Trash2, X } from "lucide-react";
import { useRef, useMemo, useState, type ReactNode, type RefObject } from "react";
import { SCENARIO_CHIPS } from "@/lib/presentation-options";
import type { SavedDraft } from "@/lib/local-storage";
import { ComposeField } from "../ui/compose-field";

const MAX_PROMPT_LENGTH = 5000;

interface FileUploadZoneProps {
  uploadedFileName: string | null;
  disabled: boolean;
  onFileExtracted: (text: string, fileName: string) => void;
  onClear: () => void;
}

function FileUploadZone({ uploadedFileName, disabled, onFileExtracted, onClear }: FileUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка загрузки");
      if (typeof data.text !== "string") throw new Error("Сервер не вернул текст");
      onFileExtracted(data.text, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  if (uploadedFileName) {
    return (
      <div className="file-upload-zone file-upload-zone--done">
        <Paperclip size={14} aria-hidden />
        <span className="file-upload-zone__name">{uploadedFileName}</span>
        <button
          type="button"
          className="file-upload-zone__clear"
          onClick={onClear}
          aria-label="Убрать прикреплённый файл"
          disabled={disabled}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`file-upload-zone${isDragOver ? " file-upload-zone--dragover" : ""}${uploading ? " file-upload-zone--uploading" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) void handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".docx,.pdf,.pptx"
        className="file-upload-zone__input"
        disabled={disabled || uploading}
        aria-label="Прикрепить файл DOCX, PDF или PPTX"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        className="file-upload-zone__trigger"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip size={14} aria-hidden />
        {uploading ? "Читаю файл…" : "Прикрепить файл (DOCX, PDF, PPTX)"}
      </button>
      {error ? (
        <p className="file-upload-zone__error" role="alert">{error}</p>
      ) : null}
    </div>
  );
}

export function StartScreen({
  prompt,
  promptError,
  textareaRef,
  disabled,
  isSubmitting,
  savedDrafts,
  uploadedFileName,
  onChangePrompt,
  onUseScenario,
  onSubmit,
  onRestoreDraft,
  onDeleteDraft,
  onFileExtracted,
  onFileClear,
  children,
}: {
  prompt: string;
  promptError: string | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  disabled: boolean;
  isSubmitting: boolean;
  savedDrafts?: SavedDraft[];
  uploadedFileName?: string | null;
  onChangePrompt: (value: string) => void;
  onUseScenario: (value: string) => void;
  onSubmit: () => void;
  onRestoreDraft?: (saved: SavedDraft) => void;
  onDeleteDraft?: (id: string) => void;
  onFileExtracted?: (text: string, fileName: string) => void;
  onFileClear?: () => void;
  children?: ReactNode;
}) {
  const [activeDescription, setActiveDescription] = useState<string | null>(null);
  const helperText = useMemo(
    () => activeDescription ?? SCENARIO_CHIPS[0]?.description ?? null,
    [activeDescription],
  );

  const charCount = prompt.length;
  const charOverLimit = charCount > MAX_PROMPT_LENGTH;

  return (
    <section className="entry-stage">
      {children ? (
        children
      ) : (
        <>
          <h2 className="entry-title">О чём презентация?</h2>

          <form
            className="composer-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <ComposeField
              variant="start"
              value={prompt}
              onChange={(v) => onChangePrompt(v.slice(0, MAX_PROMPT_LENGTH))}
              onSubmit={onSubmit}
              placeholder="Расскажите, что нужно показать и кому."
              disabled={disabled}
              isLoading={isSubmitting}
              textareaRef={textareaRef}
            />

            {charCount > 200 ? (
              <span className={`composer-char-count${charOverLimit ? " composer-char-count--over" : ""}`}>
                {charCount} / {MAX_PROMPT_LENGTH}
              </span>
            ) : null}

            {promptError ? (
              <p className="inline-error" role="alert">
                {promptError}
              </p>
            ) : null}
            {!promptError && isSubmitting ? (
              <p
                className="entry-hint entry-hint--status"
                role="status"
                aria-live="polite"
              >
                Уточняем, что важно для первого черновика.
              </p>
            ) : null}
          </form>

          {onFileExtracted ? (
            <FileUploadZone
              uploadedFileName={uploadedFileName ?? null}
              disabled={disabled}
              onFileExtracted={onFileExtracted}
              onClear={() => onFileClear?.()}
            />
          ) : null}

          <div className="example-row">
            {SCENARIO_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="example-chip"
                onClick={() => onUseScenario(chip.prompt)}
                onMouseEnter={() => setActiveDescription(chip.description ?? null)}
                onMouseLeave={() => setActiveDescription(null)}
                onFocus={() => setActiveDescription(chip.description ?? null)}
                onBlur={() => setActiveDescription(null)}
                disabled={disabled}
                title={chip.description}
                aria-describedby={
                  helperText ? "start-scenario-hint" : undefined
                }
              >
                {chip.label}
              </button>
            ))}
          </div>

          {helperText ? (
            <p id="start-scenario-hint" className="entry-hint entry-hint--scenario">
              {helperText}
            </p>
          ) : null}

          {savedDrafts && savedDrafts.length > 0 && onRestoreDraft ? (
            <div className="saved-drafts">
              <h3 className="saved-drafts__title">Недавние черновики</h3>
              <div className="saved-drafts__list">
                {savedDrafts.map((saved) => (
                  <div key={saved.id} className="saved-draft-card">
                    <button
                      type="button"
                      className="saved-draft-card__body"
                      onClick={() => onRestoreDraft(saved)}
                      disabled={disabled}
                    >
                      <span className="saved-draft-card__title">{saved.title}</span>
                      <span className="saved-draft-card__meta">
                        <Clock size={12} aria-hidden />
                        {formatSavedAt(saved.savedAt)} · {saved.slideCount} сл.
                      </span>
                    </button>
                    {onDeleteDraft ? (
                      <button
                        type="button"
                        className="saved-draft-card__delete"
                        onClick={() => onDeleteDraft(saved.id)}
                        aria-label={`Удалить черновик ${saved.title}`}
                        title="Удалить"
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function formatSavedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "только что";
    if (diffMin < 60) return `${diffMin} мин назад`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} ч назад`;
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}
