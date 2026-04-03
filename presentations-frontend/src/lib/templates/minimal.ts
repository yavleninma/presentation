import { PresentationTemplate } from "@/types/presentation";

export const minimal: PresentationTemplate = {
  id: "minimal",
  name: "Светлая",
  description: "Чистая светлая тема с большим количеством воздуха",
  colors: {
    primary: "#18181B",
    primaryForeground: "#FFFFFF",
    secondary: "#3B82F6",
    secondaryForeground: "#FFFFFF",
    accent: "#F59E0B",
    accentForeground: "#18181B",
    background: "#FFFFFF",
    foreground: "#18181B",
    muted: "#F4F4F5",
    mutedForeground: "#71717A",
    surface: "#FAFAFA",
    surfaceForeground: "#27272A",
  },
  fonts: {
    heading: "var(--font-bricolage-grotesque), sans-serif",
    body: "var(--font-sans), sans-serif",
    mono: "'Geist Mono', monospace",
  },
  spacing: {
    slidePadding: 72,
    elementGap: 28,
  },
  backgroundPattern: "none",
};
