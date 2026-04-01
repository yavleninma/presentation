import { PresentationTemplate } from "@/types/presentation";

export const sovcombank: PresentationTemplate = {
  id: "sovcombank",
  name: "Совкомбанк",
  description: "Корпоративный шаблон Совкомбанка — красный, синий, белый",
  colors: {
    primary: "#E30613",
    primaryForeground: "#FFFFFF",
    secondary: "#0066B3",
    secondaryForeground: "#FFFFFF",
    accent: "#1A2744",
    accentForeground: "#FFFFFF",
    background: "#FFFFFF",
    foreground: "#1A2744",
    muted: "#F5F5F7",
    mutedForeground: "#6B7280",
    surface: "#F0F4F8",
    surfaceForeground: "#1A2744",
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
  logoPosition: "top-left",
  backgroundPattern: "geometric",
};
