import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { killProcessTree, terminateProcessTree } from "@paperclipai/adapter-utils/server-utils";

// Regression for 2026-10-05: cancelling a heartbeat run killed only the direct
// child (agy.exe / cmd.exe wrapper); its ~30 descendants kept running and the
// RAM was only freed by a manual `taskkill /T /F`.

const isWin = process.platform === "win32";

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitDead(pids: number[], timeoutMs = 10_000): Promise<number[]> {
  const deadline = Date.now() + timeoutMs;
  let alive = pids.filter(isAlive);
  while (alive.length > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
    alive = pids.filter(isAlive);
  }
  return alive;
}

/**
 * Intermediate = cmd.exe (NOT node): a node parent puts its children in a libuv
 * KILL_ON_JOB_CLOSE job, so killing it would take the grandchildren down and hide
 * the bug. cmd.exe — like agy.exe — has no such job, which is the real situation.
 * cmd starts 3 node grandchildren that print their pid and sleep 60s.
 */
async function spawnTree() {
  const dir = mkdtempSync(path.join(tmpdir(), "pc-killtree-"));
  const gc = path.join(dir, "gc.cjs");
  writeFileSync(gc, "console.log(process.pid); setTimeout(() => {}, 60000);\n");
  const node = process.execPath;
  const one = `"${node}" "${gc}"`;
  const cmdLine = `/d /s /c "start /b "" ${one} & start /b "" ${one} & ${one}"`;
  const child = spawn("cmd.exe", [cmdLine], {
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
    windowsVerbatimArguments: true,
  });
  const grandPids = await new Promise<number[]>((resolve, reject) => {
    let buf = "";
    child.stdout!.on("data", (c) => {
      buf += String(c);
      const pids = buf.split(/\r?\n/).map((l) => Number(l.trim())).filter((n) => n > 0);
      if (pids.length >= 3) resolve(pids.slice(0, 3));
    });
    child.on("error", reject);
    setTimeout(() => reject(new Error(`tree did not start: ${JSON.stringify(buf)}`)), 10_000);
  });
  return { child, grandPids };
}

describe("killProcessTree", () => {
  it.skipIf(!isWin)("negative control: plain child.kill() leaves the grandchildren running", async () => {
    const { child, grandPids } = await spawnTree();
    child.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 1500));
    const survivors = grandPids.filter(isAlive);
    for (const pid of survivors) killProcessTree(pid);
    await waitDead(grandPids);
    expect(survivors.length).toBe(grandPids.length);
  }, 20_000);

  it.skipIf(!isWin)("kills the child AND every descendant on Windows (0 survivors)", async () => {
    const { child, grandPids } = await spawnTree();
    const all = [child.pid!, ...grandPids];
    expect(all.every(isAlive)).toBe(true);

    const t0 = Date.now();
    killProcessTree(child);
    // fire-and-forget: must return immediately, not wait for the tree to die
    expect(Date.now() - t0).toBeLessThan(200);

    const survivors = await waitDead(all);
    expect(survivors).toEqual([]);
  }, 20_000);

  it.skipIf(!isWin)("terminateProcessTree (timeout path) also leaves 0 descendants", async () => {
    const { child, grandPids } = await spawnTree();
    terminateProcessTree(child, 1);
    expect(await waitDead([child.pid!, ...grandPids])).toEqual([]);
  }, 20_000);

  it("ignores missing / invalid pids without throwing", () => {
    expect(() => killProcessTree(undefined)).not.toThrow();
    expect(() => killProcessTree(null)).not.toThrow();
    expect(() => killProcessTree(-1)).not.toThrow();
  });
});

describe("heartbeat cancel paths use tree kill (static guard)", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const heartbeatSrc = readFileSync(path.resolve(here, "../services/heartbeat.ts"), "utf8");
  const utilsSrc = readFileSync(
    path.resolve(here, "../../../packages/adapter-utils/src/server-utils.ts"),
    "utf8",
  );

  it("heartbeat.ts never kills only the direct child of a run", () => {
    expect(heartbeatSrc).not.toMatch(/running\.child\.kill\(/);
    expect(heartbeatSrc).toMatch(/terminateProcessTree\(running\.child/);
  });

  it("cancel does not await starting the next queued run", () => {
    const cancelFn = heartbeatSrc.slice(
      heartbeatSrc.indexOf("async function cancelRunInternal"),
      heartbeatSrc.indexOf("async function cancelActiveForAgentInternal"),
    );
    expect(cancelFn).not.toMatch(/await startNextQueuedRunForAgent/);
  });

  it("runChildProcess timeout uses the tree kill, not child.kill + child.killed", () => {
    expect(utilsSrc).not.toMatch(/^\s*if \(!child\.killed\)\s*\{/m);
    expect(utilsSrc).toMatch(/terminateProcessTree\(child, opts\.graceSec\)/);
  });
});
