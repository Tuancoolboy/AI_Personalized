import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "scripts/**/*.test.mjs"],
    exclude: ["node_modules", ".next", "duck-race-master/**", ".codex/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/frontend"),
    },
  },
});
