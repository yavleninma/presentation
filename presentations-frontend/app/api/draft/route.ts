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

export async function POST(req: NextRequest) {
  try {
    const rawBody = (await req.json()) as unknown;
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
        assertUserMessage(body.userMessage, "Нужно сообщение для правки черновика."),
      ),
    );
  } catch (error) {
    const draftError =
      error instanceof DraftApiError
        ? error
        : new DraftApiError(
            "INTERNAL_ERROR",
            error instanceof Error ? error.message : "Internal error",
            500,
          );

    console.error("[api/draft]", draftError);

    return NextResponse.json(
      { error: draftError.message, code: draftError.code },
      { status: draftError.status },
    );
  }
}
