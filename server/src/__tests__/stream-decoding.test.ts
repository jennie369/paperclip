import { PassThrough } from "node:stream";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Agent output arrives as byte chunks whose boundaries fall wherever the pipe
 * happens to flush. Decoding each chunk on its own splits any character that
 * straddles a boundary into U+FFFD replacement chars — Vietnamese accented
 * letters are 2-3 bytes each, so "hệ thống" reached posted issue comments as
 * "h??? thống". `setEncoding` holds the partial bytes back and joins them with
 * the next chunk.
 */
const SAMPLE = "Dựa vào hệ thống quét pattern, em chọn đồng LINK làm chủ đề";

function splitMidCharacter(text: string): [Buffer, Buffer] {
  const full = Buffer.from(text, "utf8");
  // "ệ" is E1 BB 87 — cut between its first and second byte.
  const at = full.indexOf(Buffer.from("ệ", "utf8"));
  if (at < 0) throw new Error("fixture must contain a multi-byte character");
  return [full.subarray(0, at + 1), full.subarray(at + 1)];
}

describe("chunked stdout decoding", () => {
  it("mangles the character when each chunk is decoded alone", () => {
    const [a, b] = splitMidCharacter(SAMPLE);
    const naive = String(a) + String(b);

    expect(naive).toContain("�");
    expect(naive).not.toContain("hệ thống");
  });

  it("keeps the character intact once the stream decodes as utf8", async () => {
    const [a, b] = splitMidCharacter(SAMPLE);
    const stream = new PassThrough();
    stream.setEncoding("utf8");

    let received = "";
    const done = new Promise<void>((resolve) => {
      stream.on("data", (chunk: string) => { received += chunk; });
      stream.on("end", () => resolve());
    });

    stream.write(a);
    stream.write(b);
    stream.end();
    await done;

    expect(received).toBe(SAMPLE);
    expect(received).not.toContain("�");
  });
});

/**
 * Every stdout/stderr data listener must sit behind a setEncoding call on the
 * same stream, or the bug above returns silently — text only breaks when a
 * chunk boundary happens to land inside a character.
 */
describe("no undecoded stdout listeners", () => {
  const REPO = join(__dirname, "..", "..", "..");
  const ROOTS = [join(REPO, "server", "src"), join(REPO, "packages")];
  const LISTENER = /([A-Za-z_$][\w$]*)\.(stdout|stderr)\??\.on\(\s*['"]data['"]/;

  function walk(dir: string): string[] {
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return []; }
    return entries.flatMap((entry) => {
      if (entry === "node_modules" || entry === "dist") return [];
      const full = join(dir, entry);
      let st;
      try { st = statSync(full); } catch { return []; }
      if (st.isDirectory()) return walk(full);
      return /\.ts$/.test(entry) && !/\.test\.ts$/.test(entry) ? [full] : [];
    });
  }

  it("gives every stdout/stderr listener a decoded stream", () => {
    const offenders: string[] = [];

    for (const file of ROOTS.flatMap(walk)) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        const m = LISTENER.exec(line);
        if (!m) return;
        const [, varName, stream] = m;
        const guarded = lines
          .slice(Math.max(0, i - 3), i)
          .some((l) => l.includes(`${varName}.${stream}`) && l.includes("setEncoding"));
        if (!guarded) offenders.push(`${file.slice(REPO.length + 1)}:${i + 1}`);
      });
    }

    expect(offenders).toEqual([]);
  });
});
