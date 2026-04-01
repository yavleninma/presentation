import { PresentationTemplate } from "@/types/presentation";
import { sovcombank } from "./sovcombank";
import { modernDark } from "./modern-dark";
import { minimal } from "./minimal";

export const templates: Record<string, PresentationTemplate> = {
  sovcombank,
  "modern-dark": modernDark,
  minimal,
};

export const templateList: PresentationTemplate[] = Object.values(templates);

export function getTemplate(id: string): PresentationTemplate {
  return templates[id] ?? minimal;
}
