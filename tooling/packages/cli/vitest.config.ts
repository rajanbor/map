import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Barrels, entry shims, and pure interfaces carry no logic to test.
      exclude: [
        "src/**/index.ts",
        "src/bin.ts",
        "src/analyzer/analyzer.ts",
      ],
      reporter: ["text-summary", "text"],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 80,
      },
    },
  },
});
