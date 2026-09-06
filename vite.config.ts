import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  test: { include: ["src/tests/**/*.test.ts"] },
} as any);
