import fs from "node:fs";
import path from "node:path";

import { LEARNING_MODULES } from "../src/frontend/lib/learning-modules-data.ts";
import { ROLES } from "../src/frontend/lib/roles.ts";

const root = process.cwd();
const outDir = path.join(root, "src/backend/data");
const outPath = path.join(outDir, "learning-data.json");

const payload = {
  generatedAt: new Date().toISOString(),
  modules: LEARNING_MODULES,
  quizzes: Object.fromEntries(
    Object.entries(ROLES).map(([roleId, role]) => [roleId, role.quiz]),
  ),
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Exported learning data to ${path.relative(root, outPath)}`);
