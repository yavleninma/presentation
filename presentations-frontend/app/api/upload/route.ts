import mammoth from "mammoth";
import JSZip from "jszip";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 МБ
const MAX_TEXT_LENGTH = 12000;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Не удалось прочитать данные формы." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "Файл не прикреплён." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "Файл слишком большой (макс. 10 МБ)." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  let text = "";

  try {
    if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (ext === "pdf") {
      text = await extractPdfText(buffer);
    } else if (ext === "pptx") {
      text = await extractPptxText(buffer);
    } else {
      return Response.json(
        { error: "Неподдерживаемый формат. Используйте DOCX, PDF или PPTX." },
        { status: 400 },
      );
    }
  } catch {
    return Response.json(
      { error: "Не удалось прочитать файл. Попробуйте другой формат." },
      { status: 422 },
    );
  }

  const trimmedText = text.slice(0, MAX_TEXT_LENGTH);
  const structure = extractHeadings(trimmedText);

  return Response.json({
    text: trimmedText,
    structure,
    originalLength: text.length,
    truncated: text.length > MAX_TEXT_LENGTH,
  });
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  // Динамический импорт для совместимости с разными версиями пакета
  const pdfModule = await import("pdf-parse");
  // pdf-parse v2 экспортирует функцию напрямую (ESM), v1 — через .default
  const pdfParse = (typeof pdfModule === "function"
    ? pdfModule
    : (pdfModule as { default?: (buf: Buffer) => Promise<{ text: string }> }).default ?? pdfModule) as (buf: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return result.text;
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideTexts: string[] = [];

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] ?? "0", 10);
      const numB = parseInt(b.match(/\d+/)?.[0] ?? "0", 10);
      return numA - numB;
    });

  for (const slidePath of slideFiles) {
    const xml = await zip.files[slidePath].async("text");
    const textMatches = xml.match(/<a:t>([^<]*)<\/a:t>/g) ?? [];
    const texts = textMatches
      .map((m) => m.replace(/<\/?a:t>/g, "").trim())
      .filter(Boolean);
    if (texts.length > 0) {
      slideTexts.push(texts.join(" "));
    }
  }

  return slideTexts.join("\n\n");
}

function extractHeadings(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 3 && line.length < 80)
    .filter((line) => /^[А-ЯA-Z0-9]/.test(line))
    .slice(0, 20);
}
