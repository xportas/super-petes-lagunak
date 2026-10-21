import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "coverage"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/lib/**/*.ts", "src/lib/**/*.tsx"],
      exclude: [
        "src/lib/**/*.test.ts",
        "src/lib/**/*.test.tsx",
        "src/**/*.d.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
});
