// Goals Disk Sync
//
// Writes the live `goals` table from Gemral Supabase into
// `crypto-pattern-scanner/memory/goals.md` as a markdown file so that
// Claude CLI sessions running OUTSIDE Paperclip (e.g. when Jennie opens
// Claude Code directly in a project folder) also see the same goals.
//
// IMPORTANT — NO CRON. NO TIMER. NO setInterval.
//
// This is triggered ONLY by:
//   1. One-shot call during Paperclip server startup (initial sync).
//   2. Manual trigger via POST /api/registry/goals/sync-to-disk when the
//      user clicks a button in the UI.
//   3. (Future) event-driven hook on goals table mutation via Supabase
//      Realtime — NOT implemented in Phase 0 to keep scope minimal.
//
// Debounced in-process so rapid consecutive calls coalesce into one write.
//
// Origin: BUG-027 aftermath (2026-04-07) — user banned recurring cron jobs
// because 9 orphan Paperclip schtasks froze her machine. This is the
// "goals sync without cron" answer.

import { supabase } from '../channels/zalo-personal/supabase.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DEFAULT_COMPANY_ID = process.env.DEFAULT_COMPANY_ID
  || 'f78ffdea-e400-46be-8705-5f6cfbce1eb0';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const GOALS_FILE = path.resolve(PROJECT_ROOT, 'memory', 'goals.md');

// Debounce: collapse multiple rapid calls into one write
let pendingTimer: NodeJS.Timeout | null = null;
let lastWriteAt = 0;
const DEBOUNCE_MS = 300;

export interface SyncResult {
  success: boolean;
  goalsWritten: number;
  bytesWritten: number;
  filePath: string;
  error?: string;
}

/**
 * Atomically write the current DB goals snapshot to `memory/goals.md`.
 * Uses write-to-tmp-then-rename so the file is never seen in a half-written
 * state by another process reading it.
 */
async function writeGoalsFile(companyId: string): Promise<SyncResult> {
  try {
    const { data: goals, error } = await supabase
      .from('goals')
      .select('id, title, description, level, status, parent_id, owner_agent_id, created_at, updated_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, goalsWritten: 0, bytesWritten: 0, filePath: GOALS_FILE, error: error.message };
    }

    const all = goals || [];
    const active = all.filter((g: any) => g.status === 'active');

    // Build markdown: header + meta + hierarchy
    const now = new Date().toISOString();
    const lines: string[] = [
      '# MỤC TIÊU CÔNG TY — SSOT',
      '',
      '> **⚠ Auto-generated file.** Nguồn gốc là bảng `goals` trong Gemral Supabase.',
      `> Synced lần cuối: \`${now}\` bởi Paperclip server.`,
      `> Company: \`${companyId}\` (GEMRAL). Tổng: ${all.length} goals, ${active.length} đang active.`,
      '>',
      '> ❌ **KHÔNG sửa file này tay.** Mọi chỉnh sửa sẽ bị ghi đè. Update goals qua',
      '> Paperclip UI (`/GEM/goals`) hoặc gọi trực tiếp bảng `goals`.',
      '',
      '---',
      '',
    ];

    if (active.length === 0) {
      lines.push('_Chưa có goal nào active. Thêm goal tại `/GEM/goals` trong Paperclip UI._');
    } else {
      const byId = new Map<string, any>();
      for (const g of active) byId.set(g.id, g);
      const roots = active.filter((g: any) => !g.parent_id || !byId.has(g.parent_id));

      for (const root of roots) {
        const prefix = root.level === 'company' ? '## 🎯' : root.level === 'project' ? '## 📁' : '## •';
        lines.push(`${prefix} ${root.title}`);
        if (root.description) lines.push('', root.description);
        const kids = active.filter((g: any) => g.parent_id === root.id);
        if (kids.length > 0) {
          lines.push('', '**Tasks con:**');
          for (const k of kids) {
            lines.push(`- [ ] **${k.title}**${k.description ? ` — ${k.description}` : ''}`);
          }
        }
        lines.push('');
      }
    }

    if (all.length > active.length) {
      lines.push('---', '', '### Goals không active (archive)', '');
      for (const g of all.filter((x: any) => x.status !== 'active')) {
        lines.push(`- ~~${g.title}~~ _(${g.status})_`);
      }
      lines.push('');
    }

    const content = lines.join('\n');
    const buf = Buffer.from(content, 'utf-8');

    // Ensure memory/ folder exists
    const dir = path.dirname(GOALS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Atomic write: .tmp → rename
    const tmpFile = GOALS_FILE + '.tmp';
    fs.writeFileSync(tmpFile, buf);
    fs.renameSync(tmpFile, GOALS_FILE);

    lastWriteAt = Date.now();

    return {
      success: true,
      goalsWritten: all.length,
      bytesWritten: buf.length,
      filePath: GOALS_FILE,
    };
  } catch (err: any) {
    return {
      success: false,
      goalsWritten: 0,
      bytesWritten: 0,
      filePath: GOALS_FILE,
      error: err?.message || String(err),
    };
  }
}

/**
 * Public API — debounced sync. If called multiple times within DEBOUNCE_MS,
 * only the last call is executed. Always resolves with the result of the
 * write (for the caller that actually triggered the write).
 */
export function syncGoalsToDisk(companyId: string = DEFAULT_COMPANY_ID): Promise<SyncResult> {
  return new Promise((resolve) => {
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(async () => {
      pendingTimer = null;
      const result = await writeGoalsFile(companyId);
      if (result.success) {
        console.log(`[goals-disk-sync] Wrote ${result.goalsWritten} goals → ${result.filePath} (${result.bytesWritten} bytes)`);
      } else {
        console.warn(`[goals-disk-sync] Write failed: ${result.error}`);
      }
      resolve(result);
    }, DEBOUNCE_MS);
  });
}

/**
 * One-shot sync — for server startup. Skips the debounce and writes
 * immediately. Used once when Paperclip server boots.
 */
export function syncGoalsToDiskImmediate(companyId: string = DEFAULT_COMPANY_ID): Promise<SyncResult> {
  return writeGoalsFile(companyId);
}

/**
 * Getter for diagnostics / UI "last synced at".
 */
export function getLastSyncTime(): Date | null {
  return lastWriteAt > 0 ? new Date(lastWriteAt) : null;
}
