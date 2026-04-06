"use client";

/** Графический марк (полосы) — при необходимости отдельно от буквы в квадрате v3. */
export function BrandMarkSvg() {
  return (
    <svg width="16" height="13" viewBox="0 0 16 13" fill="none" aria-hidden>
      <rect width="16" height="2.4" rx="1.2" fill="white" />
      <rect
        y="5.3"
        width="10.5"
        height="2.4"
        rx="1.2"
        fill="white"
        fillOpacity="0.65"
      />
      <rect
        y="10.6"
        width="6.5"
        height="2.4"
        rx="1.2"
        fill="white"
        fillOpacity="0.38"
      />
    </svg>
  );
}

/** Марк как в макете v3: буква «В» на градиентном фоне `.brand-mark`. */
export function BrandMark({
  className = "brand-mark",
}: {
  className?: string;
}) {
  return (
    <span className={className} aria-hidden="true">
      В
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return <span className={className}>Внятно</span>;
}
