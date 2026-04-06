#!/usr/bin/env node
/**
 * Читает stdout `vercel deploy --format json` (возможны несколько строк — берём последнюю валидную JSON-строку).
 */
import fs from "node:fs";

const s = fs.readFileSync(0, "utf8");

function urlFrom(j) {
  if (!j || typeof j !== "object") {
    return "";
  }

  return (
    j.url ||
    j.deploymentUrl ||
    (j.deployment &&
      typeof j.deployment === "object" &&
      typeof j.deployment.url === "string" &&
      j.deployment.url) ||
    ""
  );
}

let url = "";
const lines = s.trim().split("\n");
for (let i = lines.length - 1; i >= 0; i--) {
  try {
    url = urlFrom(JSON.parse(lines[i]));
    if (url) {
      break;
    }
  } catch {
    // continue
  }
}

if (!url) {
  try {
    url = urlFrom(JSON.parse(s.trim()));
  } catch {
    // noop
  }
}

if (!url) {
  console.error("extract-vercel-deploy-url: не найден url в выводе CLI");
  process.exit(1);
}

console.log(url);
