import PptxGenJS from "pptxgenjs";
import { Presentation, Slide, PresentationTemplate } from "@/types/presentation";

function hexToRgb(hex: string): string {
  return hex.replace("#", "");
}

function addSlideContent(
  pptxSlide: PptxGenJS.Slide,
  slide: Slide,
  template: PresentationTemplate
) {
  const c = template.colors;
  const { layout, content } = slide;

  switch (layout) {
    case "title": {
      pptxSlide.background = { color: hexToRgb(c.background) };
      pptxSlide.addShape("rect", {
        x: 0, y: 0, w: "100%", h: 0.06,
        fill: { color: hexToRgb(c.primary) },
      });
      pptxSlide.addText(content.heading || "Заголовок", {
        x: 1, y: 1.8, w: 8, h: 1.5,
        fontSize: 36, bold: true,
        color: hexToRgb(c.foreground),
        fontFace: "Arial",
      });
      if (content.subheading) {
        pptxSlide.addText(content.subheading, {
          x: 1, y: 3.3, w: 7, h: 0.8,
          fontSize: 18, color: hexToRgb(c.mutedForeground),
          fontFace: "Arial",
        });
      }
      break;
    }

    case "section": {
      pptxSlide.background = { color: hexToRgb(c.accent) };
      pptxSlide.addText(content.heading || "Раздел", {
        x: 1, y: 2, w: 8, h: 1.5,
        fontSize: 34, bold: true,
        color: hexToRgb(c.accentForeground),
        fontFace: "Arial",
      });
      if (content.subheading) {
        pptxSlide.addText(content.subheading, {
          x: 1, y: 3.5, w: 6, h: 0.6,
          fontSize: 16,
          color: hexToRgb(c.accentForeground),
          fontFace: "Arial",
          transparency: 30,
        });
      }
      break;
    }

    case "content": {
      pptxSlide.background = { color: hexToRgb(c.background) };
      pptxSlide.addText(content.heading || "", {
        x: 1, y: 0.6, w: 8, h: 0.8,
        fontSize: 28, bold: true,
        color: hexToRgb(c.foreground),
        fontFace: "Arial",
      });
      if (content.bullets?.length) {
        pptxSlide.addText(
          content.bullets.map((b) => ({
            text: b,
            options: { bullet: { code: "2022" }, indentLevel: 0 },
          })),
          {
            x: 1, y: 1.8, w: 8, h: 3.2,
            fontSize: 16, color: hexToRgb(c.foreground),
            fontFace: "Arial",
            lineSpacingMultiple: 1.5,
          }
        );
      }
      break;
    }

    case "kpi": {
      pptxSlide.background = { color: hexToRgb(c.background) };
      pptxSlide.addText(content.heading || "Показатели", {
        x: 1, y: 0.6, w: 8, h: 0.8,
        fontSize: 28, bold: true,
        color: hexToRgb(c.foreground),
        fontFace: "Arial",
      });
      const kpis = content.kpiValues ?? [];
      const kpiWidth = 8 / Math.max(kpis.length, 1);
      kpis.forEach((kpi, i) => {
        pptxSlide.addText(kpi.value, {
          x: 1 + i * kpiWidth, y: 2.2, w: kpiWidth - 0.3, h: 0.8,
          fontSize: 32, bold: true,
          color: hexToRgb(c.foreground),
          fontFace: "Arial",
        });
        pptxSlide.addText(kpi.label, {
          x: 1 + i * kpiWidth, y: 3.0, w: kpiWidth - 0.3, h: 0.5,
          fontSize: 12, color: hexToRgb(c.mutedForeground),
          fontFace: "Arial",
        });
      });
      break;
    }

    case "quote": {
      pptxSlide.background = { color: hexToRgb(c.background) };
      pptxSlide.addText(`«${content.quoteText || ""}»`, {
        x: 1.5, y: 1.5, w: 7, h: 2,
        fontSize: 22, italic: true,
        color: hexToRgb(c.foreground),
        fontFace: "Arial",
        align: "center",
      });
      pptxSlide.addText(
        `— ${content.quoteAuthor || ""}${content.quoteRole ? `, ${content.quoteRole}` : ""}`,
        {
          x: 1.5, y: 3.5, w: 7, h: 0.5,
          fontSize: 14, color: hexToRgb(c.mutedForeground),
          fontFace: "Arial",
          align: "center",
        }
      );
      break;
    }

    default: {
      pptxSlide.background = { color: hexToRgb(c.background) };
      if (content.heading) {
        pptxSlide.addText(content.heading, {
          x: 1, y: 0.6, w: 8, h: 0.8,
          fontSize: 28, bold: true,
          color: hexToRgb(c.foreground),
          fontFace: "Arial",
        });
      }
      if (content.bullets?.length) {
        pptxSlide.addText(
          content.bullets.map((b) => ({
            text: b,
            options: { bullet: { code: "2022" }, indentLevel: 0 },
          })),
          {
            x: 1, y: 1.8, w: 8, h: 3.2,
            fontSize: 16, color: hexToRgb(c.foreground),
            fontFace: "Arial",
            lineSpacingMultiple: 1.5,
          }
        );
      }
      if (content.subheading) {
        pptxSlide.addText(content.subheading, {
          x: 1, y: 1.4, w: 7, h: 0.5,
          fontSize: 16, color: hexToRgb(c.mutedForeground),
          fontFace: "Arial",
        });
      }
      break;
    }
  }
}

export async function exportToPptx(
  presentation: Presentation,
  template: PresentationTemplate
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.title = presentation.title;
  pptx.author = "SlideForge AI";

  for (const slide of presentation.slides) {
    const pptxSlide = pptx.addSlide();
    addSlideContent(pptxSlide, slide, template);

    if (slide.notes) {
      pptxSlide.addNotes(slide.notes);
    }
  }

  await pptx.writeFile({ fileName: `${presentation.title}.pptx` });
}
