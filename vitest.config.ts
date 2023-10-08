import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["./test/**/*.{test,spec}.ts"],
    coverage: {
      reporter: ["html"],
      enabled: true,
    },
    alias: {
      types: "/src/types",
    },
  },
});
