import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __DEV__: true,
  },
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
