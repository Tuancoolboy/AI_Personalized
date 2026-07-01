import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = resolve(
  process.cwd(),
  process.env.EVAL_INPUT ?? "eval/results/tro-ly-eval-2026-06-18.json",
);
const verdictPath = resolve(
  process.cwd(),
  process.env.EVAL_VERDICTS ?? "eval/gate3-case-verdicts.json",
);

function percentile(sorted, ratio) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const raw = JSON.parse(await readFile(inputPath, "utf8"));
const verdicts = JSON.parse(await readFile(verdictPath, "utf8"));
const turns = raw.results.flatMap((result) =>
  result.turns.map((turn) => ({
    caseId: result.id,
    turn: turn.turn,
    ms: turn.ms,
    mode: turn.mode,
    status: turn.status,
  })),
);
const latency = turns.map((turn) => turn.ms).sort((a, b) => a - b);
const caseTotals = raw.results
  .map((result) => result.turns.reduce((total, turn) => total + turn.ms, 0))
  .sort((a, b) => a - b);
const verdictValues = raw.results.map(
  (result) => verdicts[result.id]?.verdict ?? "unrated",
);
const passCount = verdictValues.filter((value) => value === "pass").length;
const partialCount = verdictValues.filter((value) => value === "partial").length;
const failCount = verdictValues.filter((value) => value === "fail").length;

const summary = {
  source: inputPath,
  evaluatedAt: raw.date,
  baseUrl: raw.baseUrl,
  model: raw.model,
  cases: raw.results.length,
  turns: turns.length,
  reliability: {
    http200: turns.filter((turn) => turn.status === 200).length,
    realLlmTurns: turns.filter((turn) => turn.mode === "demo-openai").length,
    allHttp200: turns.every((turn) => turn.status === 200),
    allRealLlm: turns.every((turn) => turn.mode === "demo-openai"),
  },
  quality: {
    pass: passCount,
    partial: partialCount,
    fail: failCount,
    strictPassRatePct: round((passCount / raw.results.length) * 100, 1),
    passOrPartialRatePct: round(
      ((passCount + partialCount) / raw.results.length) * 100,
      1,
    ),
  },
  latencyMs: {
    min: latency[0] ?? 0,
    average: Math.round(
      latency.reduce((total, value) => total + value, 0) /
        Math.max(latency.length, 1),
    ),
    p50: percentile(latency, 0.5),
    p95: percentile(latency, 0.95),
    max: latency.at(-1) ?? 0,
    caseTotalMin: caseTotals[0] ?? 0,
    caseTotalMax: caseTotals.at(-1) ?? 0,
  },
  verdicts,
};

console.log(JSON.stringify(summary, null, 2));
