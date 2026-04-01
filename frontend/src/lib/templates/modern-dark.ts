import { PresentationTemplate } from "@/types/presentation";

export const modernDark: PresentationTemplate = {
  id: "modern-dark",
  name: "Modern Dark",
  description: "Тёмная тема с акцентами — для технологичных презентаций",
  colors: {
    primary: "#6366F1",
    primaryForeground: "#FFFFFF",
    secondary: "#8B5CF6",
    secondaryForeground: "#FFFFFF",
    accent: "#EC4899",
    accentForeground: "#FFFFFF",
    background: "#0F172A",
    foreground: "#F1F5F9",
    muted: "#1E293B",
    mutedForeground: "#94A3B8",
    surface: "#1E293B",
    surfaceForeground: "#E2E8F0",
  },
  fonts: {
    heading: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'Geist Mono', monospace",
  },
  spacing: {
    slidePadding: 64,
    elementGap: 24,
  },
  backgroundPattern: "dots",
};
