import test from "node:test";
import assert from "node:assert/strict";
import { DraftApiError } from "@/lib/draft-api";
import {
  assertDraftRequestBodyWithinLimit,
  DRAFT_POST_MAX_BYTES,
  parseDraftPostJson,
} from "@/lib/draft-route-guards";

test("parseDraftPostJson отклоняет пустое тело", () => {
  assert.throws(
    () => parseDraftPostJson("   \n"),
    (e: unknown) => e instanceof DraftApiError && e.code === "INVALID_REQUEST",
  );
});

test("parseDraftPostJson отклоняет невалидный JSON", () => {
  assert.throws(
    () => parseDraftPostJson("{not json"),
    (e: unknown) => e instanceof DraftApiError && e.code === "INVALID_REQUEST",
  );
});

test("parseDraftPostJson принимает объект", () => {
  const v = parseDraftPostJson('{"mode":"clarify","prompt":"x"}');
  assert.deepEqual(v, { mode: "clarify", prompt: "x" });
});

test("assertDraftRequestBodyWithinLimit бросает при превышении лимита", () => {
  const big = "x".repeat(DRAFT_POST_MAX_BYTES + 1);
  assert.throws(
    () => assertDraftRequestBodyWithinLimit(big),
    (e: unknown) => e instanceof DraftApiError && e.code === "PAYLOAD_TOO_LARGE",
  );
});
