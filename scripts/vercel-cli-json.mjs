#!/usr/bin/env node
/**
 * Parse mixed Vercel CLI stdout (banner, progress bars, trailing JSON).
 *
 * Usage:
 *   vercel deploy ... 2>&1 | node scripts/vercel-cli-json.mjs deployment.url
 *   vercel deploy ... 2>&1 | node scripts/vercel-cli-json.mjs deployment.id
 */

import { readFileSync } from "node:fs";

const fieldPath = process.argv[2] ?? "";
const raw = readFileSync(0, "utf8");

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function getPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((value, key) => value?.[key], obj);
}

function fallbackUrl(text) {
  const production = text.match(/▲\s+Production\s+(https:\/\/\S+)/);
  if (production?.[1]) return production[1];
  const preview = text.match(/Preview\s+(https:\/\/\S+)/);
  if (preview?.[1]) return preview[1];
  return "";
}

const data = extractJson(raw);
const deployment = data?.deployment ?? data ?? {};

if (!fieldPath) {
  process.stdout.write(JSON.stringify(deployment));
  process.exit(0);
}

let value = getPath(data, fieldPath);
if (value === undefined || value === null || value === "") {
  const shortKey = fieldPath.split(".").at(-1);
  value = deployment[shortKey];
}

if (fieldPath.endsWith("url") && (!value || value === "")) {
  value = fallbackUrl(raw);
}

if (value === undefined || value === null || value === "") {
  process.stderr.write(`Không đọc được trường Vercel CLI: ${fieldPath}\n`);
  process.exit(1);
}

const normalized =
  fieldPath.endsWith("url") && typeof value === "string" && !value.startsWith("http")
    ? `https://${value}`
    : value;

process.stdout.write(String(normalized));
