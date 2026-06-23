import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local Codex skill bundle is agent tooling, not application source.
    ".codex/**",
    // Local duck-race reference app is an external asset source, not runtime code.
    "duck-race-master/**",
    // Python backend (linted by ruff, not eslint)
    "src/backend/**",
    // Local Vercel build output
    ".vercel/**",
  ]),
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
