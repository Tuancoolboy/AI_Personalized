#!/usr/bin/env node
/**
 * Regression tests for scripts/vercel-cli-json.mjs
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const script = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "vercel-cli-json.mjs",
);

const sampleOutput = `Vercel CLI 54.10.3
Uploading [====================] (33.4MB/33.4MB)
  Inspect     https://vercel.com/example/c2-app-009/ApfwDPxTxVrmqpKXuh2CmNkkR8cZ
▲ Production  https://c2-app-009-g5pb16rey-hai-dangs-projects-cf419357.vercel.app
{
  "status": "ok",
  "deployment": {
    "id": "dpl_ApfwDPxTxVrmqpKXuh2CmNkkR8cZ",
    "url": "https://c2-app-009-g5pb16rey-hai-dangs-projects-cf419357.vercel.app"
  }
}`;

function runParser(input, field) {
  return execFileSync(process.execPath, [script, field], {
    input,
    encoding: "utf8",
  }).trim();
}

describe("vercel-cli-json.mjs", () => {
  it("reads nested deployment.url from mixed CLI output", () => {
    expect(runParser(sampleOutput, "deployment.url")).toBe(
      "https://c2-app-009-g5pb16rey-hai-dangs-projects-cf419357.vercel.app",
    );
  });

  it("reads deployment.id", () => {
    expect(runParser(sampleOutput, "deployment.id")).toBe(
      "dpl_ApfwDPxTxVrmqpKXuh2CmNkkR8cZ",
    );
  });

  it("falls back to Production line when JSON lacks url", () => {
    const withoutUrl = `▲ Production  https://fallback.vercel.app\n{"deployment":{"id":"dpl_x"}}`;
    expect(runParser(withoutUrl, "deployment.url")).toBe(
      "https://fallback.vercel.app",
    );
  });
});
