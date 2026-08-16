import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A package left out of vitest.config.ts still accepts *.test.ts files — they
 * just never run. That reads as coverage which isn't there: four test files
 * (adapter-utils, shared, pi-local x2) sat unrun until 2026-07-21, including one
 * added the same week to guard a live bug.
 */
const REPO = join(__dirname, "..", "..", "..");

function listedProjects(): string[] {
  const cfg = readFileSync(join(REPO, "vitest.config.ts"), "utf8");
  const block = cfg.split("projects:")[1]?.split("]")[0] ?? "";
  return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function allTestFiles(dir: string): string[] {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return []; }
  return entries.flatMap((entry) => {
    if (entry === "node_modules" || entry === "dist" || entry === ".git") return [];
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { return []; }
    if (st.isDirectory()) return allTestFiles(full);
    return /\.test\.tsx?$/.test(entry) ? [full] : [];
  });
}

describe("vitest project coverage", () => {
  it("runs every test file that exists in the repo", () => {
    const roots = listedProjects().map((p) => join(REPO, p) + sep);
    const orphans = allTestFiles(REPO)
      .filter((f) => !roots.some((r) => f.startsWith(r)))
      .map((f) => relative(REPO, f).split(sep).join("/"));

    expect(orphans).toEqual([]);
  });
});
