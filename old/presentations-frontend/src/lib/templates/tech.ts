import { PresentationTemplate } from "@/types/presentation";

export const tech: PresentationTemplate = {
  id: "tech",
  name: "Технологичная",
  description: "Тёмная тема с моноширинным характером и неоновыми акцентами",
  colors: {
    primary: "#00FF88",
    primaryForeground: "#0A0A0F",
    secondary: "#00D4FF",
    secondaryForeground: "#0A0A0F",
    accent: "#FF6B35",
    accentForeground: "#FFFFFF",
    background: "#0A0A0F",
    foreground: "#E2FFE8",
    muted: "#111118",
    mutedForeground: "#7A8A7D",
    surface: "#111118",
    surfaceForeground: "#B8FFC7",
  },
  fonts: {
    heading: "var(--font-space-mono), monospace",
    body: "var(--font-sans), sans-serif",
    mono: "var(--font-space-mono), monospace",
  },
  spacing: {
    slidePadding: 64,
    elementGap: 24,
  },
  backgroundPattern: "dots",
};
