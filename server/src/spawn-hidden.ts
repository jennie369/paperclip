// spawn-hidden.ts — reliable hidden subprocess spawn on Windows.
//
// Background:
//   `child_process.spawn(cmd, args, { shell: true, windowsHide: true })` has a
//   long-standing bug on Windows where CREATE_NO_WINDOW doesn't propagate to
//   grandchild processes (cmd.exe → gemini.cmd → node.exe), causing a black
//   console window to flash on every spawn. Repeated popups can lock up the
//   user's UI thread and cause crashes.
//
//   This module provides `spawnHidden()` which:
//     • For .exe targets → spawns the executable directly (shell: false), so
//       windowsHide: true definitively suppresses any console.
//     • For .cmd / .bat targets → spawns process.env.ComSpec (cmd.exe) with
//       explicit `/d /s /c <cmd> <args>`. Bypasses Node's `shell: true` code
//       path entirely, so windowsHide: true is honored at the top-level
//       process and inherited by all children via standard handle inheritance.
//
// Usage:
//   import { spawnHidden } from '../spawn-hidden.js';
//   const child = spawnHidden('gemini', ['-p', ' ', '--stream-json'], {
//     cwd: '...',
//     env: { ... },
//     stdio: ['pipe', 'pipe', 'pipe'],
//   });
//
// On non-Windows platforms, behaves identically to plain `spawn()`.

import {
  spawn as nodeSpawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptions,
} from 'node:child_process';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const isWindows = process.platform === 'win32';

// Cache resolved command paths so we only run `where` once per command per
// process lifetime. The map stores absolute path or null when not found.
const resolvedCache = new Map<string, string | null>();

function resolveCommand(cmd: string): string | null {
  if (!isWindows) return cmd;
  if (resolvedCache.has(cmd)) return resolvedCache.get(cmd)!;
  // If caller passed an absolute path that exists, use it as-is
  if (/^[a-zA-Z]:\\/.test(cmd) && existsSync(cmd)) {
    resolvedCache.set(cmd, cmd);
    return cmd;
  }
  try {
    const out = execSync(`where ${cmd}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    // `where` may return multiple lines (.cmd, .ps1, .exe). Prefer .exe, then .cmd.
    const lines = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const pick =
      lines.find((l) => l.toLowerCase().endsWith('.exe'))
      ?? lines.find((l) => l.toLowerCase().endsWith('.cmd'))
      ?? lines.find((l) => l.toLowerCase().endsWith('.bat'))
      ?? lines[0]
      ?? null;
    resolvedCache.set(cmd, pick);
    return pick;
  } catch {
    resolvedCache.set(cmd, null);
    return null;
  }
}

/**
 * Spawn a subprocess with `windowsHide: true` reliably honored even when the
 * target is a .cmd / .bat shim. On non-Windows hosts, behaves like `spawn()`.
 *
 * Returns `ChildProcessWithoutNullStreams` because all current callers use
 * `stdio: ['pipe','pipe','pipe']`. If you need a different stdio shape, cast
 * the result or add an overload.
 */
export function spawnHidden(
  cmd: string,
  args: readonly string[],
  options: SpawnOptions = {},
): ChildProcessWithoutNullStreams {
  const optsWithHide: SpawnOptions = {
    ...options,
    windowsHide: true,
  };

  if (!isWindows) {
    return nodeSpawn(cmd, args as string[], optsWithHide) as ChildProcessWithoutNullStreams;
  }

  const resolved = resolveCommand(cmd);
  if (!resolved) {
    // Last-resort fallback — try with shell:true. May still pop a window but
    // we don't have a better option if `where` couldn't find the command.
    return nodeSpawn(cmd, args as string[], { ...optsWithHide, shell: true }) as ChildProcessWithoutNullStreams;
  }

  const lower = resolved.toLowerCase();
  if (lower.endsWith('.exe')) {
    // Direct .exe spawn — windowsHide: true definitively hides any console.
    return nodeSpawn(resolved, args as string[], { ...optsWithHide, shell: false }) as ChildProcessWithoutNullStreams;
  }

  // .cmd / .bat shim — spawn cmd.exe explicitly with /d /s /c
  // /d  → ignore AutoRun
  // /s  → modify quoted-string handling for embedded quotes
  // /c  → carry out command and terminate
  //
  // CRITICAL: When `resolved` contains spaces (e.g.
  // C:\Users\Jennie Chu\AppData\Roaming\npm\gemini.cmd) cmd.exe splits on the
  // first space → "'C:\\Users\\Jennie' is not recognized" → subprocess exits 1.
  // Fix: build a single command line with the .cmd path quoted, and use
  // `windowsVerbatimArguments: true` so Node passes it verbatim to cmd.exe.
  // The `/s` flag strips exactly the outermost quotes, leaving the inner
  // quoting intact — the standard pattern for cmd.exe /c with quoted paths.
  const comspec = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
  const escapeArg = (a: string): string => {
    if (a === '') return '""';
    if (!/[\s"]/.test(a)) return a;
    // Escape backslashes-before-quote per Windows rules, then wrap in quotes.
    return `"${a.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"`;
  };
  // cmd.exe /s rule: if entire command-after-/c is wrapped in quotes, strip
  // exactly the first and last ". So we need DOUBLED outer quotes:
  //   /d /s /c ""C:\path with spaces\app.cmd" arg1 arg2"
  // → /s strips outer "" → cmd.exe sees `"C:\path..."`  arg1 arg2 → runs OK.
  // Without the outer wrapping, cmd.exe parses the inner quoted path as the
  // command but the surrounding spaces still split the original command line.
  const inner = `"${resolved}"` + (args.length ? ' ' + args.map(escapeArg).join(' ') : '');
  return nodeSpawn(comspec, ['/d', '/s', '/c', `"${inner}"`], {
    ...optsWithHide,
    shell: false,
    windowsVerbatimArguments: true,
  }) as ChildProcessWithoutNullStreams;
}
