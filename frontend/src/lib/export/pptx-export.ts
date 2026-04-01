import PptxGenJS from "pptxgenjs";
import {
  Presentation,
  Slide,
  PresentationTemplate,
} from "@/types/presentation";

function hex(color: string): string {
  return color.replace("#", "");
}

async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function addSlideContent(
  pptxSlide: PptxGenJS.Slide,
  slide: Slide,
  template: PresentationTemplate,
  imageCache: Map<string, string | null>
) {
  const c = template.colors;
  const { layout, content } = slide;

  switch (layout) {
    case "title": {
      pptxSlide.background = { color: hex(c.background) };
      pptxSlide.addShape("rect", {
        x: 0,
        y: 0,
        w: "100%",
        h: 0.06,
        fill: { color: hex(c.primary) },
      });
      pptxSlide.addText(content.heading || "Заголовок", {
        x: 1,
        y: 1.8,
        w: 8,
        h: 1.5,
        fontSize: 36,
        bold: true,
        color: hex(c.foreground),
        fontFace: "Arial",
      });
      if (content.subheading) {
        pptxSlide.addText(content.subheading, {
          x: 1,
          y: 3.3,
          w: 7,
          h: 0.8,
          fontSize: 18,
          color: hex(c.mutedForeground),
          fontFace: "Arial",
        });
      }
      break;
    }

    case "section": {
      pptxSlide.background = { color: hex(c.accent) };
      pptxSlide.addText(content.heading || "Раздел", {
        x: 1,
        y: 2,
        w: 8,
        h: 1.5,
        fontSize: 34,
        bold: true,
        color: hex(c.accentForeground),
        fontFace: "Arial",
      });
      if (content.subheading) {
        pptxSlide.addText(content.subheading, {
          x: 1,
          y: 3.5,
          w: 6,
          h: 0.6,
          fontSize: 16,
          color: hex(c.accentForeground),
          fontFace: "Arial",
          transparency: 30,
        });
      }
      break;
    }

    case "content": {
      pptxSlide.background = { color: hex(c.background) };
      pptxSlide.addText(content.heading || "", {
        x: 1,
        y: 0.6,
        w: 8,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: hex(c.foreground),
        fontFace: "Arial",
      });
      if (content.bullets?.length) {
        pptxSlide.addText(
          content.bullets.map((b) => ({
            text: b,
            options: {
              bullet: { code: "2022" },
              indentLevel: 0 as const,
            },
          })),
          {
            x: 1,
            y: 1.8,
            w: 8,
            h: 3.2,
            fontSize: 16,
            color: hex(c.foreground),
            fontFace: "Arial",
            lineSpacingMultiple: 1.5,
          }
        );
      }
      break;
    }

    case "two-columns": {
      pptxSlide.background = { color: hex(c.background) };
      pptxSlide.addText(content.heading || "", {
        x: 1,
        y: 0.6,
        w: 8,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: hex(c.foreground),
        fontFace: "Arial",
      });
      const left = content.leftColumn;
      const right = content.rightColumn;
      if (left?.heading) {
        pptxSlide.addText(left.heading, {
          x: 0.7,
          y: 1.7,
          w: 4,
          h: 0.5,
          fontSize: 18,
          bold: true,
          color: hex(c.primary),
          fontFace: "Arial",
        });
      }
      if (left?.bullets?.length) {
        pptxSlide.addText(
          left.bullets.map((b) => ({
            text: b,
            options: {
              bullet: { code: "2022" },
              indentLevel: 0 as const,
            },
          })),
          {
            x: 0.7,
            y: 2.3,
            w: 4,
            h: 2.5,
            fontSize: 14,
            color: hex(c.foreground),
            fontFace: "Arial",
            lineSpacingMultiple: 1.4,
          }
        );
      }
      if (right?.heading) {
        pptxSlide.addText(right.heading, {
          x: 5.3,
          y: 1.7,
          w: 4,
          h: 0.5,
          fontSize: 18,
          bold: true,
          color: hex(c.primary),
          fontFace: "Arial",
        });
      }
      if (right?.bullets?.length) {
        pptxSlide.addText(
          right.bullets.map((b) => ({
            text: b,
            options: {
              bullet: { code: "2022" },
              indentLevel: 0 as const,
            },
          })),
          {
            x: 5.3,
            y: 2.3,
            w: 4,
            h: 2.5,
            fontSize: 14,
            color: hex(c.foreground),
            fontFace: "Arial",
            lineSpacingMultiple: 1.4,
          }
        );
      }
      break;
    }

    case "image-text": {
      pptxSlide.background = { color: hex(c.background) };
      const imgData = content.imageUrl
        ? imageCache.get(content.imageUrl)
        : null;
      if (imgData) {
        pptxSlide.addImage({
          data: imgData,
          x: 0,
          y: 0,
          w: 4.5,
          h: 5.63,
          sizing: { type: "cover", w: 4.5, h: 5.63 },
        });
      } else {
        pptxSlide.addShape("rect", {
          x: 0,
          y: 0,
          w: 4.5,
          h: 5.63,
          fill: { color: hex(c.surface) },
        });
      }
      pptxSlide.addShape("rect", {
        x: 4.5,
        y: 1.5,
        w: 0.08,
        h: 0,
        line: { color: hex(c.primary), width: 3 },
      });
      pptxSlide.addText(content.heading || "", {
        x: 5,
        y: 0.8,
        w: 4.5,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: hex(c.foreground),
        fontFace: "Arial",
      });
      if (content.bullets?.length) {
        pptxSlide.addText(
          content.bullets.map((b) => ({
            text: b,
            options: {
              bullet: { code: "2022" },
              indentLevel: 0 as const,
            },
          })),
          {
            x: 5,
            y: 2,
            w: 4.5,
            h: 3,
            fontSize: 14,
            color: hex(c.foreground),
            fontFace: "Arial",
            lineSpacingMultiple: 1.5,
          }
        );
      }
      break;
    }

    case "kpi": {
      pptxSlide.background = { color: hex(c.background) };
      pptxSlide.addText(content.heading || "Показатели", {
        x: 1,
        y: 0.6,
        w: 8,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: hex(c.foreground),
        fontFace: "Arial",
      });
      const kpis = content.kpiValues ?? [];
      const kpiCount = Math.max(kpis.length, 1);
      const kpiWidth = 8 / kpiCount;
      kpis.forEach((kpi, i) => {
        pptxSlide.addShape("rect", {
          x: 1 + i * kpiWidth + 0.1,
          y: 1.8,
          w: kpiWidth - 0.4,
          h: 2.2,
          fill: { color: hex(c.surface) },
          rectRadius: 0.1,
        });
        const trendSymbol =
          kpi.trend === "up" ? "↑ " : kpi.trend === "down" ? "↓ " : "";
        pptxSlide.addText(trendSymbol + kpi.value, {
          x: 1 + i * kpiWidth + 0.1,
          y: 2.1,
          w: kpiWidth - 0.4,
          h: 0.9,
          fontSize: 28,
          bold: true,
          color: hex(c.foreground),
          fontFace: "Arial",
          align: "center",
        });
        pptxSlide.addText(kpi.label, {
          x: 1 + i * kpiWidth + 0.1,
          y: 3.0,
          w: kpiWidth - 0.4,
          h: 0.5,
          fontSize: 12,
          color: hex(c.mutedForeground),
          fontFace: "Arial",
          align: "center",
        });
      });
      break;
    }

    case "timeline": {
      pptxSlide.background = { color: hex(c.background) };
      pptxSlide.addText(content.heading || "", {
        x: 1,
        y: 0.6,
        w: 8,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: hex(c.foreground),
        fontFace: "Arial",
      });
      const items = content.timelineItems ?? [];
      const count = Math.max(items.length, 1);
      const segW = 8 / count;
      pptxSlide.addShape("rect", {
        x: 1,
        y: 2.5,
        w: 8,
        h: 0.04,
        fill: { color: hex(c.primary) },
      });
      items.forEach((item, i) => {
        const cx = 1 + i * segW + segW / 2;
        pptxSlide.addShape("ellipse", {
          x: cx - 0.12,
          y: 2.38,
          w: 0.24,
          h: 0.24,
          fill: { color: hex(c.primary) },
        });
        pptxSlide.addText(item.year, {
          x: cx - segW / 2,
          y: 1.8,
          w: segW,
          h: 0.4,
          fontSize: 14,
          bold: true,
          color: hex(c.primary),
          fontFace: "Arial",
          align: "center",
        });
        pptxSlide.addText(item.title, {
          x: cx - segW / 2,
          y: 2.9,
          w: segW,
          h: 0.4,
          fontSize: 13,
          bold: true,
          color: hex(c.foreground),
          fontFace: "Arial",
          align: "center",
        });
        if (item.description) {
          pptxSlide.addText(item.description, {
            x: cx - segW / 2,
            y: 3.3,
            w: segW,
            h: 0.7,
            fontSize: 10,
            color: hex(c.mutedForeground),
            fontFace: "Arial",
            align: "center",
          });
        }
      });
      break;
    }

    case "quote": {
      pptxSlide.background = { color: hex(c.background) };
      pptxSlide.addText(`«${content.quoteText || ""}»`, {
        x: 1.5,
        y: 1.5,
        w: 7,
        h: 2,
        fontSize: 22,
        italic: true,
        color: hex(c.foreground),
        fontFace: "Arial",
        align: "center",
      });
      pptxSlide.addText(
        `— ${content.quoteAuthor || ""}${content.quoteRole ? `, ${content.quoteRole}` : ""}`,
        {
          x: 1.5,
          y: 3.5,
          w: 7,
          h: 0.5,
          fontSize: 14,
          color: hex(c.mutedForeground),
          fontFace: "Arial",
          align: "center",
        }
      );
      break;
    }

    case "full-image": {
      const bgData = content.imageUrl
        ? imageCache.get(content.imageUrl)
        : null;
      if (bgData) {
        pptxSlide.background = { data: bgData };
      } else {
        pptxSlide.background = { color: hex(c.accent) };
      }
      pptxSlide.addShape("rect", {
        x: 0,
        y: 0,
        w: "100%",
        h: "100%",
        fill: { color: "000000", transparency: 50 },
      });
      pptxSlide.addText(content.heading || "", {
        x: 1,
        y: 3.2,
        w: 7,
        h: 1,
        fontSize: 36,
        bold: true,
        color: "FFFFFF",
        fontFace: "Arial",
      });
      if (content.subheading) {
        pptxSlide.addText(content.subheading, {
          x: 1,
          y: 4.2,
          w: 6,
          h: 0.6,
          fontSize: 18,
          color: "FFFFFF",
          fontFace: "Arial",
          transparency: 25,
        });
      }
      break;
    }

    case "thank-you": {
      pptxSlide.background = { color: hex(c.background) };
      pptxSlide.addShape("rect", {
        x: 0,
        y: 4.8,
        w: "100%",
        h: 0.83,
        fill: { color: hex(c.primary) },
      });
      pptxSlide.addText(content.heading || "Спасибо!", {
        x: 1,
        y: 1.2,
        w: 8,
        h: 1.5,
        fontSize: 40,
        bold: true,
        color: hex(c.foreground),
        fontFace: "Arial",
        align: "center",
      });
      const contactLines: string[] = [];
      if (content.contactEmail) contactLines.push(content.contactEmail);
      if (content.contactPhone) contactLines.push(content.contactPhone);
      if (content.contactWebsite) contactLines.push(content.contactWebsite);
      if (contactLines.length) {
        pptxSlide.addText(contactLines.join("  •  "), {
          x: 1,
          y: 3,
          w: 8,
          h: 0.6,
          fontSize: 16,
          color: hex(c.mutedForeground),
          fontFace: "Arial",
          align: "center",
        });
      }
      break;
    }

    default: {
      pptxSlide.background = { color: hex(c.background) };
      if (content.heading) {
        pptxSlide.addText(content.heading, {
          x: 1,
          y: 0.6,
          w: 8,
          h: 0.8,
          fontSize: 28,
          bold: true,
          color: hex(c.foreground),
          fontFace: "Arial",
        });
      }
      if (content.bullets?.length) {
        pptxSlide.addText(
          content.bullets.map((b) => ({
            text: b,
            options: {
              bullet: { code: "2022" },
              indentLevel: 0 as const,
            },
          })),
          {
            x: 1,
            y: 1.8,
            w: 8,
            h: 3.2,
            fontSize: 16,
            color: hex(c.foreground),
            fontFace: "Arial",
            lineSpacingMultiple: 1.5,
          }
        );
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

  const imageCache = new Map<string, string | null>();
  const imageUrls = new Set<string>();
  for (const slide of presentation.slides) {
    if (slide.content.imageUrl) {
      imageUrls.add(slide.content.imageUrl);
    }
  }
  const fetchJobs = [...imageUrls].map(async (url) => {
    const data = await fetchImageBase64(url);
    imageCache.set(url, data);
  });
  await Promise.all(fetchJobs);

  for (const slide of presentation.slides) {
    const pptxSlide = pptx.addSlide();
    await addSlideContent(pptxSlide, slide, template, imageCache);

    if (slide.notes) {
      pptxSlide.addNotes(slide.notes);
    }
  }

  await pptx.writeFile({ fileName: `${presentation.title}.pptx` });
}
