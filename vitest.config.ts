import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      types: resolve("src/types"),
      compiler: resolve("src/compiler"),
      reactivity: resolve("src/reactivity"),
      renderer: resolve("src/renderer"),
    },
  },
  define: {
    __DEV__: true,
  },
  test: {
    include: ["./test/**/*.{test,spec}.ts"],
    coverage: {
      reporter: ["html"],
      enabled: true,
    },
  },
});
