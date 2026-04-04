import { PresentationTemplate } from "@/types/presentation";
import { sovcombank } from "./sovcombank";
import { modernDark } from "./modern-dark";
import { minimal } from "./minimal";
import { startup } from "./startup";
import { consulting } from "./consulting";
import { tech } from "./tech";

export const templates: Record<string, PresentationTemplate> = {
  minimal,
  "modern-dark": modernDark,
  sovcombank,
  startup,
  consulting,
  tech,
};

export const templateList: PresentationTemplate[] = Object.values(templates);

export function getTemplate(id: string): PresentationTemplate {
  return templates[id] ?? minimal;
}
