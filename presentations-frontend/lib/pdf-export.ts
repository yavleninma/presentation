import type { PresentationDraft } from "./presentation-types";

const SLIDE_W = 1920;
const SLIDE_H = 1080;
const PDF_W_MM = 338.67;
const PDF_H_MM = 190.5;

export async function exportPdf(
  draft: PresentationDraft,
  renderSlide: (index: number) => HTMLElement | null,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [PDF_W_MM, PDF_H_MM],
  });

  const total = draft.slides.length;

  for (let i = 0; i < total; i++) {
    onProgress?.(i + 1, total);

    const el = renderSlide(i);
    if (!el) continue;

    const prevWidth = el.style.width;
    const prevHeight = el.style.height;

    el.style.width = `${SLIDE_W}px`;
    el.style.height = `${SLIDE_H}px`;

    try {
      const canvas = await html2canvas(el, {
        width: SLIDE_W,
        height: SLIDE_H,
        scale: 1,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.9);

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, PDF_W_MM, PDF_H_MM);
    } finally {
      el.style.width = prevWidth;
      el.style.height = prevHeight;
    }
  }

  return pdf.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
