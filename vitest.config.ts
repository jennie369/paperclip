import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // A package missing from this list still accepts *.test.ts files — they just
    // never run, which reads as coverage that isn't there.
    projects: [
      "packages/db",
      "packages/adapters/codex-local",
      "packages/adapters/opencode-local",
      "packages/adapters/pi-local",
      "packages/adapter-utils",
      "packages/shared",
      "server",
      "ui",
      "cli",
    ],
  },
});
