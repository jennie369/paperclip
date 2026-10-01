import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// GEM-1086: script có shebang mà working tree là CRLF (Windows core.autocrlf=true,
// thiếu .gitattributes) → vite-node ném SyntaxError khi import file .mjs, và
// bash/env báo `'sh\r'` với .sh. .gitattributes ghim `eol=lf` cho các loại này.
const repoRoot = path.resolve(__dirname, "../../..");
const scriptsDir = path.join(repoRoot, "scripts");
const SCRIPT_EXT = /\.(mjs|cjs|sh)$/;

describe("script eol", () => {
  it(".gitattributes ghim eol=lf cho .sh/.mjs/.cjs", () => {
    const attrs = fs.readFileSync(path.join(repoRoot, ".gitattributes"), "utf8");
    for (const ext of ["sh", "mjs", "cjs"]) {
      expect(attrs).toMatch(new RegExp(`^\\*\\.${ext}\\s+text\\s+eol=lf\\s*$`, "m"));
    }
  });

  it("scripts/*.{mjs,cjs,sh} không có CR trong working tree", () => {
    const withCr = fs
      .readdirSync(scriptsDir)
      .filter((f) => SCRIPT_EXT.test(f))
      .filter((f) => fs.readFileSync(path.join(scriptsDir, f), "utf8").includes("\r"));

    expect(withCr, `CRLF trong: ${withCr.join(", ")} — chạy: sed -i 's/\\r$//' <file>`).toEqual([]);
  });
});
