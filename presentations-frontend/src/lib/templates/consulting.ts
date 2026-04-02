import { PresentationTemplate } from "@/types/presentation";

export const consulting: PresentationTemplate = {
  id: "consulting",
  name: "Консалтинг / McKinsey",
  description: "Authoritative Intelligence — строгий, data-heavy, для C-level",
  colors: {
    primary: "#1E3A5F",
    primaryForeground: "#FFFFFF",
    secondary: "#2563EB",
    secondaryForeground: "#FFFFFF",
    accent: "#DC2626",
    accentForeground: "#FFFFFF",
    background: "#FFFFFF",
    foreground: "#111827",
    muted: "#F3F4F6",
    mutedForeground: "#6B7280",
    surface: "#F9FAFB",
    surfaceForeground: "#1F2937",
  },
  fonts: {
    heading: "var(--font-playfair-display), serif",
    body: "var(--font-source-sans-3), sans-serif",
    mono: "'Geist Mono', monospace",
  },
  spacing: {
    slidePadding: 64,
    elementGap: 24,
  },
  backgroundPattern: "grid",
};
