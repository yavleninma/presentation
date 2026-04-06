import { NextRequest, NextResponse } from "next/server";
import {
  generateDraftSession,
  reviseDraftSession,
} from "@/lib/draft-adapter";
import {
  appendClarifyToSession,
  createClarifySession,
  normalizeDraftSession,
} from "@/lib/draft-session";
import { DraftApiError } from "@/lib/draft-api";
import {
  assertDraftRateLimit,
  readDraftRouteJson,
} from "@/lib/draft-route-guards";

type DraftRequestBody =
  | {
      mode: "clarify";
      prompt?: unknown;
      session?: unknown;
      userMessage?: unknown;
    }
  | {
      mode: "generate";
      session?: unknown;
    }
  | {
      mode: "revise";
      session?: unknown;
      userMessage?: unknown;
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertPrompt(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "Нужен рабочий запрос для старта.",
      400,
    );
  }

  return value.trim();
}

function assertUserMessage(value: unknown, fallbackMessage: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DraftApiError("INVALID_REQUEST", fallbackMessage, 400);
  }

  return value.trim();
}

function logDraftRoute(event: string, data: Record<string, unknown>) {
  console.error(
    JSON.stringify({
      scope: "api/draft",
      event,
      ...data,
      ts: new Date().toISOString(),
    }),
  );
}

export async function POST(req: NextRequest) {
  try {
    assertDraftRateLimit(req);
    const rawBody = await readDraftRouteJson(req);

    if (
      !isObject(rawBody) ||
      (rawBody.mode !== "clarify" &&
        rawBody.mode !== "generate" &&
        rawBody.mode !== "revise")
    ) {
      throw new DraftApiError(
        "INVALID_REQUEST",
        "Неизвестный режим /api/draft.",
        400,
      );
    }

    const body = rawBody as DraftRequestBody;

    if (body.mode === "clarify") {
      if (body.session !== undefined) {
        const session = normalizeDraftSession(body.session);
        const userMessage = assertUserMessage(
          body.userMessage,
          "Нужно сообщение для уточнения.",
        );

        return NextResponse.json(appendClarifyToSession(session, userMessage));
      }

      return NextResponse.json(createClarifySession(assertPrompt(body.prompt)));
    }

    if (body.mode === "generate") {
      return NextResponse.json(
        await generateDraftSession(normalizeDraftSession(body.session)),
      );
    }

    return NextResponse.json(
      await reviseDraftSession(
        normalizeDraftSession(body.session),
        assertUserMessage(
          body.userMessage,
          "Нужно сообщение для правки черновика.",
        ),
      ),
    );
  } catch (error) {
    if (error instanceof DraftApiError) {
      logDraftRoute("draft_api_error", {
        code: error.code,
        status: error.status,
        message: error.message,
      });

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    const internal =
      error instanceof Error ? error.message : "Non-Error throw in /api/draft";
    logDraftRoute("unhandled_error", { internal });

    return NextResponse.json(
      {
        error: "Временная ошибка сервера. Попробуйте позже.",
        code: "INTERNAL_ERROR" as const,
      },
      { status: 500 },
    );
  }
}
