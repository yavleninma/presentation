import { PresentationTemplate } from "@/types/presentation";

export const modernDark: PresentationTemplate = {
  id: "modern-dark",
  name: "Modern Dark",
  description: "Tech Editorial Dark — тёмный, teal + amber, для технологичных презентаций",
  colors: {
    primary: "#0EA5E9",
    primaryForeground: "#FFFFFF",
    secondary: "#10B981",
    secondaryForeground: "#FFFFFF",
    accent: "#F59E0B",
    accentForeground: "#FFFFFF",
    background: "#09090B",
    foreground: "#F8FAFC",
    muted: "#18181B",
    mutedForeground: "#71717A",
    surface: "#141414",
    surfaceForeground: "#E2E8F0",
  },
  fonts: {
    heading: "var(--font-space-grotesk), sans-serif",
    body: "var(--font-sans), sans-serif",
    mono: "'Geist Mono', monospace",
  },
  spacing: {
    slidePadding: 64,
    elementGap: 24,
  },
  backgroundPattern: "dots",
};
