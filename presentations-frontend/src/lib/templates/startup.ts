import { PresentationTemplate } from "@/types/presentation";

export const startup: PresentationTemplate = {
  id: "startup",
  name: "Стартап / Pitch Deck",
  description: "High Energy — для питч-деков и инвесторских презентаций",
  colors: {
    primary: "#FFFFFF",
    primaryForeground: "#09090B",
    secondary: "#22C55E",
    secondaryForeground: "#09090B",
    accent: "#F97316",
    accentForeground: "#FFFFFF",
    background: "#09090B",
    foreground: "#FAFAFA",
    muted: "#141414",
    mutedForeground: "#A1A1AA",
    surface: "#1A1A1A",
    surfaceForeground: "#E4E4E7",
  },
  fonts: {
    heading: "var(--font-syne), sans-serif",
    body: "var(--font-dm-sans), sans-serif",
    mono: "'Geist Mono', monospace",
  },
  spacing: {
    slidePadding: 64,
    elementGap: 24,
  },
  backgroundPattern: "geometric",
};
