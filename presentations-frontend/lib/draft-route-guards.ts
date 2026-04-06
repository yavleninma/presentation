import type { NextRequest } from "next/server";
import { DraftApiError } from "@/lib/draft-api";

/** Лимит тела POST для защиты от перегруза и злоупотреблений OpenAI. */
export const DRAFT_POST_MAX_BYTES = 256 * 1024;

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 48;

type RateBucket = { count: number; windowStart: number };

const rateBuckets = new Map<string, RateBucket>();

function pruneRateBuckets(now: number) {
  if (rateBuckets.size < 4000) {
    return;
  }

  const cutoff = now - RATE_WINDOW_MS * 2;
  for (const [ip, bucket] of rateBuckets) {
    if (bucket.windowStart < cutoff) {
      rateBuckets.delete(ip);
    }
  }
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

/**
 * Лимит запросов на инстанс (serverless: окно не общее между репликами).
 * Для строгого лимита нужен внешний store (KV).
 */
export function assertDraftRateLimit(req: NextRequest): void {
  const ip = getClientIp(req);
  const now = Date.now();
  pruneRateBuckets(now);

  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return;
  }

  bucket.count += 1;
  if (bucket.count > RATE_MAX_REQUESTS) {
    throw new DraftApiError(
      "RATE_LIMIT_EXCEEDED",
      "Слишком много запросов. Подождите около минуты.",
      429,
    );
  }
}

export function assertDraftRequestBodyWithinLimit(text: string): void {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > DRAFT_POST_MAX_BYTES) {
    throw new DraftApiError(
      "PAYLOAD_TOO_LARGE",
      "Запрос слишком большой. Сократите текст и попробуйте снова.",
      413,
    );
  }
}

export function parseDraftPostJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new DraftApiError("INVALID_REQUEST", "Пустое тело запроса.", 400);
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "Тело запроса не является JSON.",
      400,
    );
  }
}

export async function readDraftRouteJson(req: NextRequest): Promise<unknown> {
  const text = await req.text();
  assertDraftRequestBodyWithinLimit(text);
  return parseDraftPostJson(text);
}
