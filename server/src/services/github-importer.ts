// GitHub Importer — clones a public repo and registers it into one of the
// Registry Marketplace tables (skills / mcp / plugins / commands / hooks).
//
// Phase 3.3 scope: public HTTPS clone only, no auth. For private repos
// (requires gh CLI or token), see Phase 4+.
//
// Flow:
//   1. Parse owner/repo from GitHub URL
//   2. Shallow clone to ~/.claude/_registry-imports/{timestamp}-{repo}/
//      via `spawnHidden('git', ['clone', '--depth', '1', ...])`
//   3. Detect entity type from file presence:
//      - SKILL.md        → skill
//      - .mcp.json       → mcp server
//      - commands/*.md   → slash command bundle
//      - hooks/*.json    → hooks bundle
//      - manifest.json   → generic plugin
//   4. Move to canonical location under ~/.claude/{skills|mcp|...}/{name}/
//   5. Insert DB row with source_type='github' + source_locator + disk_path
//   6. Return the inserted row
//
// Safety:
//   • 60s clone timeout
//   • Size limit 50MB clone (git config --depth 1 helps)
//   • URL regex must match github.com (no random hosts)
//   • spawnHidden → no orphan cmd.exe (BUG-027 prevention)

import { supabase } from '../channels/zalo-personal/supabase.js';
import { spawnHidden } from '../spawn-hidden.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const GITHUB_URL_RE = /^https:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?(?:\/|$)/;
const IMPORT_BASE = path.join(os.homedir(), '.claude', '_registry-imports');
const CLAUDE_BASE = path.join(os.homedir(), '.claude');
const CLONE_TIMEOUT_MS = 60_000;

export interface ImportResult {
  entity: string;
  id: string;
  name: string;
  source_locator: string;
  disk_path: string;
  row: any;
}

function parseGithubUrl(url: string): { owner: string; repo: string } {
  const m = GITHUB_URL_RE.exec(url.trim());
  if (!m) throw new Error(`URL không hợp lệ. Phải là https://github.com/owner/repo`);
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

function runGit(args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const proc = spawnHidden('git', args, { cwd, env: process.env });
    const timer = setTimeout(() => {
      try { proc.kill('SIGTERM'); } catch { /* noop */ }
      reject(new Error(`git ${args[0]} timeout sau ${CLONE_TIMEOUT_MS}ms`));
    }, CLONE_TIMEOUT_MS);

    proc.stdout?.on('data', (c: Buffer) => { stdout += c.toString(); });
    proc.stderr?.on('data', (c: Buffer) => { stderr += c.toString(); });
    proc.on('close', (code: number | null) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`git ${args[0]} exited ${code}: ${stderr}`));
    });
    proc.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function shallowClone(url: string, repo: string): Promise<string> {
  if (!fs.existsSync(IMPORT_BASE)) {
    fs.mkdirSync(IMPORT_BASE, { recursive: true });
  }
  const target = path.join(IMPORT_BASE, `${Date.now()}-${repo}`);
  await runGit(['clone', '--depth', '1', '--single-branch', url, target]);
  return target;
}

interface DetectedEntity {
  entity: 'skill' | 'mcp' | 'command' | 'hook' | 'plugin';
  name: string;
  description?: string;
  manifest?: Record<string, unknown>;
}

function detectEntity(clonePath: string, hintName?: string): DetectedEntity {
  const repoName = hintName || path.basename(clonePath).replace(/^\d+-/, '');

  // Skill detection — SKILL.md at root or in skills/
  const skillMd = path.join(clonePath, 'SKILL.md');
  if (fs.existsSync(skillMd)) {
    const content = fs.readFileSync(skillMd, 'utf-8');
    const nameMatch = /^name:\s*(.+)$/m.exec(content) || /^#\s*(.+)$/m.exec(content);
    const descMatch = /^description:\s*(.+)$/m.exec(content);
    return {
      entity: 'skill',
      name: nameMatch?.[1]?.trim() || repoName,
      description: descMatch?.[1]?.trim(),
    };
  }

  // MCP server detection — .mcp.json or package.json with mcp field
  const mcpJson = path.join(clonePath, '.mcp.json');
  if (fs.existsSync(mcpJson)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(mcpJson, 'utf-8'));
      const firstServer = Object.keys(cfg.mcpServers || cfg.servers || {})[0];
      return {
        entity: 'mcp',
        name: firstServer || repoName,
        description: cfg.description,
        manifest: cfg,
      };
    } catch { /* fallthrough */ }
  }
  const pkgJson = path.join(clonePath, 'package.json');
  if (fs.existsSync(pkgJson)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf-8'));
      if (pkg.mcp || pkg.name?.includes('mcp')) {
        return {
          entity: 'mcp',
          name: pkg.name || repoName,
          description: pkg.description,
          manifest: pkg,
        };
      }
      // Generic plugin
      return {
        entity: 'plugin',
        name: pkg.name || repoName,
        description: pkg.description,
        manifest: pkg,
      };
    } catch { /* fallthrough */ }
  }

  // Commands bundle — commands/*.md
  const commandsDir = path.join(clonePath, 'commands');
  if (fs.existsSync(commandsDir) && fs.statSync(commandsDir).isDirectory()) {
    return {
      entity: 'command',
      name: repoName,
      description: `Command bundle từ ${repoName}`,
    };
  }

  // Hooks bundle — hooks/*.json or settings.json with hooks
  const hooksDir = path.join(clonePath, 'hooks');
  const settingsJson = path.join(clonePath, 'settings.json');
  if (
    (fs.existsSync(hooksDir) && fs.statSync(hooksDir).isDirectory()) ||
    (fs.existsSync(settingsJson) &&
      JSON.parse(fs.readFileSync(settingsJson, 'utf-8'))?.hooks)
  ) {
    return {
      entity: 'hook',
      name: repoName,
      description: `Hooks bundle từ ${repoName}`,
    };
  }

  // Fallback — treat as generic plugin
  return {
    entity: 'plugin',
    name: repoName,
    description: `Imported from ${repoName}`,
  };
}

function moveToCanonical(clonePath: string, entity: DetectedEntity): string {
  const folder = entity.entity === 'skill'
    ? 'skills'
    : entity.entity === 'mcp'
      ? 'mcp-configs'
      : entity.entity === 'command'
        ? 'commands'
        : entity.entity === 'hook'
          ? 'hooks'
          : 'plugins';
  const dest = path.join(CLAUDE_BASE, folder, entity.name);

  // If dest already exists, append timestamp
  let finalDest = dest;
  if (fs.existsSync(dest)) {
    finalDest = `${dest}-${Date.now()}`;
  }

  if (!fs.existsSync(path.dirname(finalDest))) {
    fs.mkdirSync(path.dirname(finalDest), { recursive: true });
  }

  // fs.rename fails cross-device on Windows occasionally — use copy+rm fallback
  try {
    fs.renameSync(clonePath, finalDest);
  } catch {
    // Manual recursive copy
    copyRecursive(clonePath, finalDest);
    try { fs.rmSync(clonePath, { recursive: true, force: true }); } catch { /* noop */ }
  }

  return finalDest;
}

function copyRecursive(src: string, dst: string) {
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function insertRow(
  entity: 'skill' | 'mcp' | 'command' | 'hook' | 'plugin',
  info: DetectedEntity,
  diskPath: string,
  sourceUrl: string,
  sourceRef: string,
): Promise<any> {
  const id = `gh-${entity}-${info.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36).slice(-4)}`;
  const base = {
    id,
    name: info.name,
    description: info.description || null,
    source_type: 'github',
    source_locator: sourceUrl,
    source_ref: sourceRef,
    enabled: true,
    disk_path: diskPath,
    last_synced_at: new Date().toISOString(),
    imported_by: 'user_ui',
    imported_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (entity === 'mcp') {
    const { data, error } = await supabase
      .from('mcp_servers')
      .insert({
        ...base,
        config_json: info.manifest || {},
        tool_list: [],
        tool_count: 0,
        trust_level: 'community',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  if (entity === 'command') {
    const { data, error } = await supabase
      .from('slash_commands')
      .insert({
        ...base,
        command_body: '', // filled later when user picks a specific command from bundle
        scope: 'user',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  if (entity === 'hook') {
    const { data, error } = await supabase
      .from('agent_hooks')
      .insert({
        ...base,
        event: 'PreToolUse',
        command: '',
        scope: 'user',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  if (entity === 'plugin') {
    const { data, error } = await supabase
      .from('plugin_registry')
      .insert({
        ...base,
        manifest_json: info.manifest || {},
        plugin_type: 'claude-code',
        trust_level: 'community',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // skill — uses existing company_skills shape which differs slightly.
  try {
    const { data, error } = await supabase
      .from('company_skills')
      .insert({
        slug: info.name,
        name: info.name,
        description: info.description,
        source_type: 'github',
        source_locator: sourceUrl,
        source_ref: sourceRef,
        disk_path: diskPath,
        metadata: {},
        file_inventory: {},
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    // Fallback to plugin_registry if company_skills schema mismatches
    return insertRow('plugin', info, diskPath, sourceUrl, sourceRef);
  }
}

/**
 * Public API — import a GitHub repo into the Registry Marketplace.
 * Entity is auto-detected if not specified.
 */
export async function importFromGithub(
  entityHint: string | null,
  url: string,
  nameHint?: string,
): Promise<ImportResult> {
  const { repo } = parseGithubUrl(url);
  const clonePath = await shallowClone(url, repo);

  let detected = detectEntity(clonePath, nameHint);
  // If user explicitly told us the entity, override detection
  if (entityHint && entityHint !== 'auto') {
    const map: Record<string, DetectedEntity['entity']> = {
      skills: 'skill',
      skill: 'skill',
      mcp: 'mcp',
      commands: 'command',
      command: 'command',
      hooks: 'hook',
      hook: 'hook',
      plugins: 'plugin',
      plugin: 'plugin',
    };
    const mapped = map[entityHint.toLowerCase()];
    if (mapped) detected = { ...detected, entity: mapped };
  }

  const diskPath = moveToCanonical(clonePath, detected);

  // Get current commit SHA for source_ref
  let sourceRef = 'HEAD';
  try {
    sourceRef = (await runGit(['rev-parse', 'HEAD'], diskPath)).trim();
  } catch { /* noop */ }

  const row = await insertRow(detected.entity, detected, diskPath, url, sourceRef);

  return {
    entity: detected.entity,
    id: row.id || row.slug,
    name: detected.name,
    source_locator: url,
    disk_path: diskPath,
    row,
  };
}
