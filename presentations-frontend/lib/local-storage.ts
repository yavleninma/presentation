import type { PresentationDraft } from "@/lib/presentation-types";

const STORAGE_KEY = "vnyatno-drafts";
const MAX_SAVED = 5;

export interface SavedDraft {
  id: string;
  title: string;
  savedAt: string;
  slideCount: number;
  draft: PresentationDraft;
}

export function saveDraft(draft: PresentationDraft): void {
  try {
    const existing = loadDrafts();
    const id = draft.documentTitle
      ? `draft-${slugify(draft.documentTitle)}`
      : `draft-${Date.now()}`;

    const entry: SavedDraft = {
      id,
      title: draft.documentTitle || "Без названия",
      savedAt: new Date().toISOString(),
      slideCount: draft.slides.length,
      draft,
    };

    const idx = existing.findIndex((d) => d.id === id);
    if (idx >= 0) {
      existing[idx] = entry;
    } else {
      existing.unshift(entry);
    }

    const trimmed = existing.slice(0, MAX_SAVED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function loadDrafts(): SavedDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedDraft[];
  } catch {
    return [];
  }
}

export function loadDraft(id: string): PresentationDraft | null {
  const drafts = loadDrafts();
  const found = drafts.find((d) => d.id === id);
  return found?.draft ?? null;
}

export function deleteDraft(id: string): void {
  try {
    const existing = loadDrafts();
    const filtered = existing.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
