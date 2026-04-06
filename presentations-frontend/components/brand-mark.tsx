"use client";

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
