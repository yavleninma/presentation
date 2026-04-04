import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlideForge — красивый черновик презентации с ИИ",
  description:
    "SlideForge помогает быстро собрать красивую русскоязычную презентацию: тема, пара настроек, черновик и живая доработка в чате.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@400;600&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-neutral-50 font-sans">
        {children}
      </body>
    </html>
  );
}
