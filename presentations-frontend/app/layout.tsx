import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Rubik,
} from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});

const headingFont = Rubik({
  subsets: ["latin", "cyrillic"],
  variable: "--font-heading",
  display: "swap",
  weight: ["500", "700"],
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Рабочая презентация",
  description:
    "Прототип сборки квартального статуса команды из рабочего запроса.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${bodyFont.variable} ${headingFont.variable} ${monoFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
