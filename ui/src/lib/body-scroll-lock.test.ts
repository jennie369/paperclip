import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { lockBodyScroll } from "./body-scroll-lock";

describe("lockBodyScroll", () => {
  // The suite runs in the "node" environment, so stand up the only DOM surface
  // this module touches rather than pulling in jsdom for three assertions.
  beforeEach(() => {
    (globalThis as unknown as { document: unknown }).document = {
      body: { style: { overflow: "" } },
    };
  });

  it("restores the previous value, not an empty string", () => {
    document.body.style.overflow = "visible";

    const release = lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");

    release();
    expect(document.body.style.overflow).toBe("visible");
  });

  it("keeps the lock while another holder is still open", () => {
    const releaseA = lockBodyScroll();
    const releaseB = lockBodyScroll();

    releaseA();
    expect(document.body.style.overflow).toBe("hidden");

    releaseB();
    expect(document.body.style.overflow).toBe("");
  });

  it("ignores a double release", () => {
    const releaseA = lockBodyScroll();
    const releaseB = lockBodyScroll();

    releaseA();
    releaseA();
    expect(document.body.style.overflow).toBe("hidden");

    releaseB();
    expect(document.body.style.overflow).toBe("");
  });
});

/**
 * Writing `document.body.style.overflow` outside this module is what froze
 * mobile scrolling: dialogs released with `= ''`, which re-exposed the base
 * `body { overflow: hidden }` rule. Fail the suite if a new one appears.
 */
describe("no direct body overflow writes", () => {
  const SRC = join(__dirname, "..");
  const ALLOWED = new Set([
    join(SRC, "lib", "body-scroll-lock.ts"),
    join(SRC, "lib", "body-scroll-lock.test.ts"),
  ]);

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return walk(full);
      return /\.(tsx?|jsx?)$/.test(entry) ? [full] : [];
    });
  }

  it("routes every caller through lockBodyScroll", () => {
    const offenders = walk(SRC).filter(
      (file) =>
        !ALLOWED.has(file) &&
        /document\.body\.style\.overflow\s*=/.test(readFileSync(file, "utf8")),
    );

    expect(offenders.map((f) => f.slice(SRC.length + 1))).toEqual([]);
  });
});
