// Registry Disk Sync — reconcile ~/.claude/{entity}/ folders with the
// Registry Marketplace DB tables.
//
// Philosophy (per BUG-027 prevention):
//   NO chokidar watcher. NO setInterval. NO recurring work.
//   Only triggers: (1) server startup one-shot, (2) user-initiated via UI button.
//
// Scan flow:
//   1. Walk each entity's canonical folder under ~/.claude/
//   2. For each item (directory or config file), detect name + metadata
//   3. Upsert row into corresponding DB table with source_type='local_path'
//   4. Mark DB rows as "stale" if their disk_path no longer exists
//      (does NOT delete — user decides)
//
// Returns a summary: {entity: count} for UI toast feedback.

import { supabase } from '../channels/zalo-personal/supabase.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const CLAUDE_BASE = path.join(os.homedir(), '.claude');
const PROJECT_SKILLS_STORE = 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/skills-store';

const FOLDER_MAP = {
  skills: path.join(CLAUDE_BASE, 'skills'),
  mcp: path.join(CLAUDE_BASE, 'mcp-configs'),
  commands: path.join(CLAUDE_BASE, 'commands'),
  hooks: path.join(CLAUDE_BASE, 'hooks'),
  plugins: path.join(CLAUDE_BASE, 'plugins'),
  scripts: 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/scripts',
  subagents: path.join(CLAUDE_BASE, 'agents'),
  rules: path.join(CLAUDE_BASE, 'rules'),
  docs: path.join(CLAUDE_BASE, 'docs'),
  edge_functions: 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/supabase/functions',
  memory_files: 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/memory',
} as const;

// Additional skill sources scanned alongside FOLDER_MAP.skills
const EXTRA_SKILL_SOURCES: Array<{ path: string; skill_type: string; trust_level: 'official' | 'verified' | 'community' | 'unknown' }> = [
  { path: PROJECT_SKILLS_STORE, skill_type: 'custom', trust_level: 'verified' },
];

// Additional script roots scanned alongside FOLDER_MAP.scripts
const EXTRA_SCRIPT_SOURCES: Array<{ path: string; root_label: string; trust_level: 'official' | 'verified' | 'community' | 'unknown' }> = [
  { path: 'C:/Users/Jennie Chu/Desktop/Projects/paperclip/scripts', root_label: 'paperclip', trust_level: 'verified' },
  { path: 'C:/Users/Jennie Chu/Desktop', root_label: 'desktop-loose', trust_level: 'community' },
];

type EntityName = keyof typeof FOLDER_MAP;

export interface DiskSyncResult {
  scanned: Record<EntityName, number>;
  upserted: Record<EntityName, number>;
  errors: string[];
  stale_marked: number;
  duration_ms: number;
}

// Read ~/.claude/plugins/installed_plugins.json and return the authoritative
// list of installed plugin paths. Dedupes by plugin name (first marketplace wins).
// This matches what Claude Code CLI actually loads at runtime.
function getInstalledPluginPaths(): Array<{ key: string; name: string; marketplace: string; installPath: string }> {
  const registryFile = path.join(FOLDER_MAP.plugins, 'installed_plugins.json');
  if (!fs.existsSync(registryFile)) return [];
  try {
    const reg = JSON.parse(fs.readFileSync(registryFile, 'utf-8'));
    const plugins = reg?.plugins || {};
    const seen = new Set<string>();
    const out: Array<{ key: string; name: string; marketplace: string; installPath: string }> = [];
    for (const [key, installs] of Object.entries(plugins)) {
      const [name, marketplace] = key.split('@');
      if (seen.has(name)) continue; // dedupe by name across marketplaces
      seen.add(name);
      const installList = Array.isArray(installs) ? installs : [installs];
      for (const inst of installList as any[]) {
        const installPath = inst?.installPath;
        if (installPath && fs.existsSync(installPath)) {
          out.push({ key, name, marketplace, installPath });
          break;
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

function tryReadJson(filePath: string): any {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function tryReadText(filePath: string, maxChars: number = 500): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.slice(0, maxChars);
  } catch {
    return '';
  }
}

// Parse YAML frontmatter from a markdown file.
// Handles both LF and CRLF line endings (Windows files use \r\n).
function parseFrontmatter(content: string): Record<string, string> {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const match = /^---\s*\n([\s\S]*?)\n---/.exec(normalized);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const rawLine of match[1].split('\n')) {
    const line = rawLine.replace(/\r$/, '').trim();
    if (!line) continue;
    const kv = /^([a-zA-Z_-]+):\s*(.+)$/.exec(line);
    if (kv) result[kv[1].trim()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return result;
}

function generateId(entity: EntityName, name: string): string {
  return `disk-${entity}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`;
}

// ─── Entity-specific scanners ─────────────────────────────────────────────

async function scanOneSkillFolder(
  dir: string,
  skillType: string,
  trustLevel: 'official' | 'verified' | 'community' | 'unknown',
): Promise<number> {
  if (!fs.existsSync(dir)) return 0;

  let upserted = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue;

    const skillPath = path.join(dir, e.name);
    // Look for SKILL.md at root or in versioned subdirs
    let skillMdPath = path.join(skillPath, 'SKILL.md');
    let version: string | null = null;
    if (!fs.existsSync(skillMdPath)) {
      try {
        const subEntries = fs.readdirSync(skillPath, { withFileTypes: true });
        // Try version directory first (e.g. "1.0.0", "2.0.0")
        const versionDir = subEntries.find(
          (se) =>
            se.isDirectory() &&
            /^\d+\.\d+/.test(se.name) &&
            fs.existsSync(path.join(skillPath, se.name, 'SKILL.md')),
        );
        if (versionDir) {
          skillMdPath = path.join(skillPath, versionDir.name, 'SKILL.md');
          version = versionDir.name;
        } else {
          // Try nested same-name folder (e.g. taste-skill/taste-skill/SKILL.md)
          const sameNameDir = subEntries.find(
            (se) => se.isDirectory() && fs.existsSync(path.join(skillPath, se.name, 'SKILL.md')),
          );
          if (sameNameDir) skillMdPath = path.join(skillPath, sameNameDir.name, 'SKILL.md');
        }
      } catch { /* skip */ }
    }
    if (!fs.existsSync(skillMdPath)) continue;

    const content = tryReadText(skillMdPath, 4000);
    const fm = parseFrontmatter(content);

    // Include trust level in ID so user/project skills don't overwrite plugin skills of same name
    const id = `disk-skills-${trustLevel === 'official' ? 'plugin' : 'user'}-${e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}`;
    try {
      const { error } = await supabase.from('skills_registry').upsert(
        {
          id,
          name: fm.name || e.name,
          description: fm.description || null,
          source_type: 'local_path',
          source_locator: skillPath,
          disk_path: skillPath,
          version,
          skill_type: skillType,
          frontmatter: fm,
          enabled: true,
          trust_level: trustLevel,
          last_synced_at: new Date().toISOString(),
          imported_by: 'disk_scan',
        },
        { onConflict: 'id' },
      );
      if (!error) upserted++;
    } catch { /* skip */ }
  }
  return upserted;
}

// Recursively find 'skills' directories inside installed plugins.
// Structure: ~/.claude/plugins/cache/{marketplace}/{plugin}/{version}/skills/
// OR deeper nestings like /claude-plugin/{name}/skills/
function findPluginSkillDirs(root: string, maxDepth = 8): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const full = path.join(dir, e.name);
        if (e.name === 'skills') out.push(full);
        else walk(full, depth + 1);
      }
    } catch { /* skip */ }
  };
  walk(root, 0);
  return out;
}

async function scanSkills(): Promise<number> {
  let total = 0;
  // Primary: ~/.claude/skills/
  total += await scanOneSkillFolder(FOLDER_MAP.skills, 'claude_code', 'community');
  // Extra sources: skills-store/ in project root
  for (const src of EXTRA_SKILL_SOURCES) {
    total += await scanOneSkillFolder(src.path, src.skill_type, src.trust_level);
  }
  // Plugin-provided skills: ONLY authoritative installed paths (one version
  // per plugin from installed_plugins.json). Matches CLI runtime count.
  const installed = getInstalledPluginPaths();
  for (const plugin of installed) {
    const skillDirs = findPluginSkillDirs(plugin.installPath, 6);
    for (const dir of skillDirs) {
      total += await scanOneSkillFolder(dir, 'plugin', 'official');
    }
  }
  return total;
}

async function scanMcp(): Promise<number> {
  const dir = FOLDER_MAP.mcp;
  if (!fs.existsSync(dir)) return 0;

  let upserted = 0;

  // Scan top-level .mcp.json files
  try {
    const topFiles = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of topFiles) {
      if (f.isFile() && f.name.endsWith('.json')) {
        const cfg = tryReadJson(path.join(dir, f.name));
        if (!cfg) continue;
        const servers = cfg.mcpServers || cfg.servers || { [f.name.replace('.json', '')]: cfg };
        for (const [serverName, serverCfg] of Object.entries(servers)) {
          const id = generateId('mcp', serverName);
          try {
            const { error } = await supabase.from('mcp_servers').upsert({
              id,
              name: serverName,
              description: (serverCfg as any)?.description || null,
              source_type: 'local_path',
              source_locator: path.join(dir, f.name),
              disk_path: path.join(dir, f.name),
              config_json: serverCfg as any,
              tool_list: [],
              tool_count: 0,
              enabled: true,
              trust_level: 'unknown',
              last_synced_at: new Date().toISOString(),
              imported_by: 'disk_scan',
            }, { onConflict: 'id' });
            if (!error) upserted++;
          } catch { /* skip */ }
        }
      }
    }
  } catch { /* skip */ }

  // Also scan directories (cloned MCP server repos)
  try {
    const dirs = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const d of dirs) {
      const serverPath = path.join(dir, d.name);
      const id = generateId('mcp', d.name);
      try {
        const { error } = await supabase.from('mcp_servers').upsert({
          id,
          name: d.name,
          description: `MCP server folder at ${d.name}`,
          source_type: 'local_path',
          source_locator: serverPath,
          disk_path: serverPath,
          config_json: {},
          tool_list: [],
          tool_count: 0,
          enabled: true,
          trust_level: 'unknown',
          last_synced_at: new Date().toISOString(),
          imported_by: 'disk_scan',
        }, { onConflict: 'id' });
        if (!error) upserted++;
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return upserted;
}

async function scanOneCommandsFolder(
  dir: string,
  scope: 'user' | 'project' | 'plugin',
  sourceLabel: string,
): Promise<number> {
  if (!fs.existsSync(dir)) return 0;
  let upserted = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith('.md')) continue;
      const cmdPath = path.join(dir, e.name);
      const content = tryReadText(cmdPath, 4000);
      const fm = parseFrontmatter(content);
      const name = '/' + (fm.name || e.name.replace('.md', ''));
      // ID dedupes to one row per (scope, name) so multiple plugin versions
      // of the same command collapse to a single canonical row.
      const nameSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
      const id = `disk-commands-${scope}-${nameSlug}`;
      try {
        const { error } = await supabase.from('slash_commands').upsert({
          id,
          name,
          description: fm.description || null,
          command_body: content,
          source_type: scope === 'plugin' ? 'plugin' : 'local_path',
          source_locator: cmdPath,
          disk_path: cmdPath,
          scope,
          agent_slug: fm.agent || null,
          enabled: true,
          last_synced_at: new Date().toISOString(),
          imported_by: 'disk_scan',
        }, { onConflict: 'id' });
        if (!error) upserted++;
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return upserted;
}

// Recursively find ALL 'commands' directories under a root.
function findCommandsDirs(root: string, maxDepth = 8): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const full = path.join(dir, e.name);
        if (e.name === 'commands') out.push(full);
        else walk(full, depth + 1);
      }
    } catch { /* skip */ }
  };
  walk(root, 0);
  return out;
}

async function scanCommands(): Promise<number> {
  let total = 0;
  // Primary: ~/.claude/commands/ (user-scoped)
  total += await scanOneCommandsFolder(FOLDER_MAP.commands, 'user', 'user');

  // Plugin-provided commands: walk ONLY installed plugin installPaths
  // (from installed_plugins.json), NOT the entire cache tree. This matches
  // Claude Code CLI runtime count — one version per plugin, deduped by name.
  const installed = getInstalledPluginPaths();
  for (const plugin of installed) {
    const commandsDirs = findCommandsDirs(plugin.installPath, 6);
    for (const dir of commandsDirs) {
      total += await scanOneCommandsFolder(dir, 'plugin', plugin.name);
    }
  }

  return total;
}

async function scanHooks(): Promise<number> {
  const dir = FOLDER_MAP.hooks;
  if (!fs.existsSync(dir)) return 0;

  let upserted = 0;

  // Look for hooks.json, settings.json, or individual .json files
  const candidates = ['hooks.json', 'settings.json'];
  for (const candidate of candidates) {
    const filePath = path.join(dir, candidate);
    if (!fs.existsSync(filePath)) continue;
    const cfg = tryReadJson(filePath);
    if (!cfg) continue;
    const hooks = cfg.hooks || cfg;
    // hooks is usually keyed by event type (PreToolUse, PostToolUse, etc.)
    for (const [event, entries] of Object.entries(hooks)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries as any[]) {
        const hookList = entry.hooks || [entry];
        for (const h of hookList) {
          const matcher = entry.matcher || '*';
          const command = h.command || h;
          if (typeof command !== 'string') continue;
          const id = generateId('hooks', `${event}-${matcher}-${command.slice(0, 20)}`);
          try {
            const { error } = await supabase.from('agent_hooks').upsert({
              id,
              event,
              matcher,
              command,
              description: `Hook imported from ${candidate}`,
              source_type: 'local_path',
              source_locator: filePath,
              disk_path: filePath,
              scope: 'user',
              enabled: true,
              last_synced_at: new Date().toISOString(),
              imported_by: 'disk_scan',
            }, { onConflict: 'id' });
            if (!error) upserted++;
          } catch { /* skip */ }
        }
      }
    }
  }
  return upserted;
}

async function scanPlugins(): Promise<number> {
  // Authoritative: walk ONLY installed_plugins.json (deduped by plugin name).
  // This matches Claude Code CLI's /reload-plugins count. No cache tree walking.
  const installed = getInstalledPluginPaths();
  let upserted = 0;

  for (const plugin of installed) {
    const candidates = ['plugin.json', '.claude-plugin/plugin.json', 'manifest.json', 'package.json'];
    let manifest: any = {};
    for (const c of candidates) {
      const p = path.join(plugin.installPath, c);
      if (fs.existsSync(p)) {
        const parsed = tryReadJson(p);
        if (parsed) { manifest = parsed; break; }
      }
    }

    // ID uses plugin name only (deduped — one row per logical plugin)
    const id = `disk-plugins-${plugin.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}`;
    try {
      const { error } = await supabase.from('plugin_registry').upsert({
        id,
        name: manifest.name || plugin.name,
        description: manifest.description || `Plugin from ${plugin.marketplace}`,
        source_type: 'local_path',
        source_locator: plugin.installPath,
        disk_path: plugin.installPath,
        source_ref: manifest.version || null,
        version: manifest.version || null,
        plugin_type: 'claude-code',
        manifest_json: { ...manifest, _marketplace: plugin.marketplace },
        enabled: true,
        trust_level: plugin.marketplace?.includes('official') ? 'official' : 'community',
        last_synced_at: new Date().toISOString(),
        imported_by: 'disk_scan',
      }, { onConflict: 'id' });
      if (!error) upserted++;
    } catch { /* skip */ }
  }

  return upserted;
}

// ─── Scripts scanner ──────────────────────────────────────────────────────
// Walks SCRIPT root + EXTRA_SCRIPT_SOURCES. Detects language by extension,
// parses header comment/docstring for description, upserts to script_registry.

const SCRIPT_EXTENSIONS: Record<string, 'python' | 'bash' | 'batch' | 'powershell' | 'node' | 'typescript'> = {
  '.py': 'python',
  '.sh': 'bash',
  '.bat': 'batch',
  '.cmd': 'batch',
  '.ps1': 'powershell',
  '.mjs': 'node',
  '.cjs': 'node',
  '.js': 'node',
  '.ts': 'typescript',
};

function buildExecuteCommand(absPath: string, lang: string): string {
  const quoted = `"${absPath}"`;
  switch (lang) {
    case 'python': return `python ${quoted}`;
    case 'bash': return `bash ${quoted}`;
    case 'batch': return quoted;
    case 'powershell': return `powershell -ExecutionPolicy Bypass -File ${quoted}`;
    case 'node': return `node ${quoted}`;
    case 'typescript': return `npx tsx ${quoted}`;
    default: return quoted;
  }
}

function extractScriptDescription(content: string, lang: string): string | null {
  const lines = content.split('\n').slice(0, 30);
  if (lang === 'python') {
    // Triple-quoted docstring at top
    const dm = /^"""([\s\S]*?)"""/m.exec(content.slice(0, 2000));
    if (dm) return dm[1].trim().split('\n')[0].trim() || null;
    // Shebang or comment line
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('#!')) continue;
      if (t.startsWith('#')) return t.replace(/^#+\s*/, '').slice(0, 200) || null;
      if (t && !t.startsWith('#')) break;
    }
  } else if (lang === 'batch') {
    for (const line of lines) {
      const t = line.trim();
      if (/^@?echo\s+off/i.test(t)) continue;
      if (/^(rem|::)\s+/i.test(t)) return t.replace(/^(rem|::)\s+/i, '').slice(0, 200) || null;
    }
  } else if (lang === 'powershell') {
    const bm = /^<#([\s\S]*?)#>/m.exec(content.slice(0, 2000));
    if (bm) return bm[1].trim().split('\n')[0].trim() || null;
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('#')) return t.replace(/^#+\s*/, '').slice(0, 200) || null;
    }
  } else {
    // node/ts/bash: // or /** */ or #
    const bm = /^\/\*\*?([\s\S]*?)\*\//m.exec(content.slice(0, 2000));
    if (bm) return bm[1].replace(/^\s*\*\s?/gm, '').trim().split('\n')[0].slice(0, 200) || null;
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('#!')) continue;
      if (t.startsWith('//')) return t.replace(/^\/+\s*/, '').slice(0, 200) || null;
      if (t.startsWith('#')) return t.replace(/^#+\s*/, '').slice(0, 200) || null;
      if (t && !t.startsWith('/*')) break;
    }
  }
  return null;
}

async function scanOneScriptFolder(
  dir: string,
  rootLabel: string,
  trustLevel: 'official' | 'verified' | 'community' | 'unknown',
  recursive = true,
  maxDepth = 2,
): Promise<number> {
  if (!fs.existsSync(dir)) return 0;
  let upserted = 0;

  const walk = (currentDir: string, depth: number): string[] => {
    if (depth > maxDepth) return [];
    const out: string[] = [];
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(currentDir, e.name);
        if (e.isFile()) {
          const ext = path.extname(e.name).toLowerCase();
          if (SCRIPT_EXTENSIONS[ext]) out.push(full);
        } else if (e.isDirectory() && recursive) {
          if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '__pycache__') continue;
          out.push(...walk(full, depth + 1));
        }
      }
    } catch { /* skip */ }
    return out;
  };

  const files = walk(dir, 0);

  for (const filePath of files) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 5 * 1024 * 1024) continue; // skip >5MB
      const ext = path.extname(filePath).toLowerCase();
      const lang = SCRIPT_EXTENSIONS[ext];
      const fileName = path.basename(filePath);
      const content = tryReadText(filePath, 4000);
      const description = extractScriptDescription(content, lang);
      const relPath = path.relative(dir, filePath).replace(/\\/g, '/');
      const idKey = `${rootLabel}-${relPath}`;
      const id = `disk-scripts-${idKey.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100)}`;

      const { error } = await supabase.from('script_registry').upsert(
        {
          id,
          name: fileName,
          description,
          language: lang,
          source_type: 'local_path',
          source_locator: filePath,
          disk_path: filePath,
          script_root: rootLabel,
          file_size_bytes: stat.size,
          executable_command: buildExecuteCommand(filePath, lang),
          working_directory: path.dirname(filePath),
          tags: [rootLabel, lang],
          category: rootLabel,
          enabled: true,
          trust_level: trustLevel,
          last_synced_at: new Date().toISOString(),
          imported_by: 'disk_scan',
        },
        { onConflict: 'id' },
      );
      if (!error) upserted++;
    } catch { /* skip */ }
  }
  return upserted;
}

async function scanScripts(): Promise<number> {
  let total = 0;
  total += await scanOneScriptFolder(FOLDER_MAP.scripts, 'crypto-pattern-scanner', 'verified', true, 2);
  for (const src of EXTRA_SCRIPT_SOURCES) {
    // Desktop loose: depth 0 (top-level only) to avoid walking entire Projects/ tree
    const maxDepth = src.root_label === 'desktop-loose' ? 0 : 2;
    const recursive = src.root_label !== 'desktop-loose';
    total += await scanOneScriptFolder(src.path, src.root_label, src.trust_level, recursive, maxDepth);
  }
  return total;
}

// ─── Claude Code Subagents scanner ────────────────────────────────────────
// Recursively find 'agents' subdirs in plugin installPaths.
function findPluginAgentsDirs(root: string, maxDepth = 6): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const full = path.join(dir, e.name);
        if (e.name === 'agents') out.push(full);
        else walk(full, depth + 1);
      }
    } catch { /* skip */ }
  };
  walk(root, 0);
  return out;
}

async function scanSubagents(): Promise<number> {
  const userDir = FOLDER_MAP.subagents;
  let upserted = 0;

  const walkMd = (currentDir: string, depth = 0, maxDepth = 2): string[] => {
    if (depth > maxDepth) return [];
    const out: string[] = [];
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(currentDir, e.name);
        if (e.isFile() && e.name.endsWith('.md')) out.push(full);
        else if (e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_')) {
          out.push(...walkMd(full, depth + 1, maxDepth));
        }
      }
    } catch { /* skip */ }
    return out;
  };

  // Collect all .md files from user dir + plugin agents dirs (from installed_plugins.json)
  const allFiles: Array<{ path: string; scope: 'user' | 'plugin'; pluginName?: string }> = [];
  if (fs.existsSync(userDir)) {
    for (const f of walkMd(userDir)) allFiles.push({ path: f, scope: 'user' });
  }
  const installed = getInstalledPluginPaths();
  for (const plugin of installed) {
    const agentDirs = findPluginAgentsDirs(plugin.installPath, 6);
    for (const dir of agentDirs) {
      for (const f of walkMd(dir)) allFiles.push({ path: f, scope: 'plugin', pluginName: plugin.name });
    }
  }

  for (const { path: filePath, scope, pluginName } of allFiles) {
    try {
      const content = tryReadText(filePath, 8000);
      const fm = parseFrontmatter(content);
      const fileName = path.basename(filePath, '.md');
      const name = fm.name || fileName;
      // ID includes scope so user agents don't collide with plugin agents of same name
      const id = `disk-subagent-${scope}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}`;

      let tools: string[] = [];
      if (fm.tools) {
        tools = fm.tools.split(',').map((t) => t.trim()).filter(Boolean);
      }

      const bodyMatch = /^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)/.exec(content);
      const systemPrompt = bodyMatch ? bodyMatch[1].trim().slice(0, 4000) : content.slice(0, 4000);

      // Category = pluginName for plugin agents, 'user' otherwise
      const category = scope === 'plugin' && pluginName ? pluginName : 'user';

      const { error } = await supabase.from('claude_subagents').upsert(
        {
          id,
          name,
          description: fm.description || null,
          model: fm.model || null,
          tools: tools.length ? tools : null,
          system_prompt: systemPrompt,
          source_type: 'local_path',
          source_locator: filePath,
          disk_path: filePath,
          frontmatter: fm,
          category,
          tags: [scope, category, fm.model || 'unknown-model'].filter(Boolean),
          enabled: true,
          trust_level: 'verified',
          last_synced_at: new Date().toISOString(),
          imported_by: 'disk_scan',
        },
        { onConflict: 'id' },
      );
      if (!error) upserted++;
    } catch { /* skip */ }
  }
  return upserted;
}

// ─── Rules + Docs scanner (unified reference_docs table) ──────────────────
async function scanReferenceDocs(): Promise<number> {
  let upserted = 0;

  const scanFolder = async (
    dir: string,
    docType: 'rule' | 'doc',
    autoLoadedDetector: (name: string) => boolean,
  ): Promise<number> => {
    if (!fs.existsSync(dir)) return 0;
    let n = 0;

    const walk = (currentDir: string, depth = 0, category = 'root'): Array<{ file: string; cat: string }> => {
      if (depth > 3) return [];
      const out: Array<{ file: string; cat: string }> = [];
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const e of entries) {
          const full = path.join(currentDir, e.name);
          if (e.isFile() && e.name.endsWith('.md')) {
            out.push({ file: full, cat: category });
          } else if (e.isDirectory() && !e.name.startsWith('.')) {
            const subCat = depth === 0 ? e.name : `${category}/${e.name}`;
            out.push(...walk(full, depth + 1, subCat));
          }
        }
      } catch { /* skip */ }
      return out;
    };

    const files = walk(dir);
    for (const { file, cat } of files) {
      try {
        const content = tryReadText(file, 4000);
        const fileName = path.basename(file, '.md');
        const preview = content.replace(/^#+\s*/gm, '').replace(/\n+/g, ' ').trim().slice(0, 300);
        const firstLine = content.split('\n').find((l) => l.trim() && !l.startsWith('---'));
        const description = firstLine?.replace(/^#+\s*/, '').slice(0, 200) || null;
        const id = `disk-${docType}-${(cat === 'root' ? '' : cat + '-')}${fileName}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .slice(0, 120);

        const { error } = await supabase.from('reference_docs').upsert(
          {
            id,
            name: fileName,
            description,
            doc_type: docType,
            category: cat,
            source_type: 'local_path',
            source_locator: file,
            disk_path: file,
            auto_loaded: autoLoadedDetector(fileName),
            word_count: content.split(/\s+/).length,
            preview,
            tags: [docType, cat],
            enabled: true,
            trust_level: 'verified',
            last_synced_at: new Date().toISOString(),
            imported_by: 'disk_scan',
          },
          { onConflict: 'id' },
        );
        if (!error) n++;
      } catch { /* skip */ }
    }
    return n;
  };

  // Rules: behaviors.md, skill-triggers.md, memory-flush.md are auto-loaded
  const autoLoadedRules = ['behaviors', 'skill-triggers', 'memory-flush'];
  upserted += await scanFolder(FOLDER_MAP.rules, 'rule', (name) => autoLoadedRules.includes(name));
  upserted += await scanFolder(FOLDER_MAP.docs, 'doc', () => false);
  return upserted;
}

// ─── Memory files scanner ─────────────────────────────────────────────────
// Walks crypto-pattern-scanner/memory/ recursively, tags by subfolder.
async function scanMemoryFiles(): Promise<number> {
  const dir = FOLDER_MAP.memory_files;
  if (!fs.existsSync(dir)) return 0;
  let upserted = 0;

  const walk = (currentDir: string, depth = 0, category = 'root'): Array<{ file: string; cat: string; type: string }> => {
    if (depth > 4) return [];
    const out: Array<{ file: string; cat: string; type: string }> = [];
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(currentDir, e.name);
        if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.json'))) {
          // Infer file_type from path
          let fileType = 'other';
          const lower = full.toLowerCase().replace(/\\/g, '/');
          if (lower.includes('/memory/today') || e.name === 'today.md') fileType = 'today';
          else if (e.name === 'patterns.md' || lower.includes('/patterns')) fileType = 'patterns';
          else if (lower.includes('/reports/')) fileType = 'reports';
          else if (lower.includes('/decisions/')) fileType = 'decisions';
          else if (lower.includes('/sops/')) fileType = 'sops';
          else if (lower.includes('/agents/')) fileType = 'agents';
          else if (lower.includes('/knowledge/')) fileType = 'knowledge';
          out.push({ file: full, cat: category, type: fileType });
        } else if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          const subCat = depth === 0 ? e.name : `${category}/${e.name}`;
          out.push(...walk(full, depth + 1, subCat));
        }
      }
    } catch { /* skip */ }
    return out;
  };

  const files = walk(dir);
  for (const { file, cat, type } of files) {
    try {
      const stat = fs.statSync(file);
      if (stat.size > 2 * 1024 * 1024) continue; // skip >2MB
      const content = tryReadText(file, 1000);
      const fileName = path.basename(file);
      const lines = content.split('\n');
      const preview = content.replace(/^#+\s*/gm, '').replace(/\n+/g, ' ').trim().slice(0, 300);
      const firstLine = lines.find((l) => l.trim() && !l.startsWith('---'));
      const description = firstLine?.replace(/^#+\s*/, '').slice(0, 200) || null;
      const relPath = path.relative(dir, file).replace(/\\/g, '/');
      const id = `disk-memory-${relPath.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 120)}`;

      const { error } = await supabase.from('memory_files').upsert(
        {
          id,
          name: fileName,
          description,
          file_type: type,
          category: cat,
          source_type: 'local_path',
          source_locator: file,
          disk_path: file,
          file_size_bytes: stat.size,
          line_count: lines.length,
          word_count: content.split(/\s+/).length,
          preview,
          last_modified_at: stat.mtime.toISOString(),
          tags: [type, cat],
          enabled: true,
          trust_level: 'verified',
          last_synced_at: new Date().toISOString(),
          imported_by: 'disk_scan',
        },
        { onConflict: 'id' },
      );
      if (!error) upserted++;
    } catch { /* skip */ }
  }
  return upserted;
}

// ─── Supabase Edge Functions scanner ──────────────────────────────────────
async function scanEdgeFunctions(): Promise<number> {
  const dir = FOLDER_MAP.edge_functions;
  if (!fs.existsSync(dir)) return 0;
  let upserted = 0;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith('_') || e.name.startsWith('.')) continue;

      const fnDir = path.join(dir, e.name);
      const indexCandidates = ['index.ts', 'index.js', 'mod.ts'];
      let entryFile = '';
      for (const c of indexCandidates) {
        const p = path.join(fnDir, c);
        if (fs.existsSync(p)) { entryFile = p; break; }
      }
      if (!entryFile) continue;

      const content = tryReadText(entryFile, 4000);
      const lines = content.split('\n');

      // Parse config.yaml if exists
      const configPath = path.join(fnDir, 'config.yaml');
      let config: any = {};
      let verifyJwt = true;
      if (fs.existsSync(configPath)) {
        const cfgText = fs.readFileSync(configPath, 'utf-8');
        config.raw = cfgText;
        const jwtMatch = /verify_jwt:\s*(true|false)/i.exec(cfgText);
        if (jwtMatch) verifyJwt = jwtMatch[1].toLowerCase() === 'true';
      }

      // Extract imports
      const imports: string[] = [];
      const importRegex = /^import\s+[^;]+from\s+["']([^"']+)["']/gm;
      let m: RegExpExecArray | null;
      while ((m = importRegex.exec(content)) !== null) imports.push(m[1]);

      // Description from first comment block
      let description: string | null = null;
      const firstBlockComment = /^\/\*\*?([\s\S]*?)\*\//m.exec(content);
      if (firstBlockComment) {
        description = firstBlockComment[1].replace(/^\s*\*\s?/gm, '').trim().split('\n')[0].slice(0, 200);
      } else {
        for (const line of lines.slice(0, 10)) {
          const t = line.trim();
          if (t.startsWith('//') && t.length > 3) {
            description = t.replace(/^\/+\s*/, '').slice(0, 200);
            break;
          }
        }
      }

      // Category from function name pattern
      let category = 'other';
      const name = e.name;
      if (name.includes('webhook')) category = 'webhook';
      else if (name.includes('email')) category = 'email';
      else if (name.includes('cron') || name.includes('schedule')) category = 'scheduler';
      else if (name.includes('shopify')) category = 'shopify';
      else if (name.includes('partnership') || name.includes('ctv') || name.includes('affiliate')) category = 'partnership';
      else if (name.includes('chatbot') || name.includes('agent')) category = 'ai';

      const id = `disk-edgefn-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}`;

      const { error } = await supabase.from('edge_functions').upsert(
        {
          id,
          name,
          description,
          source_type: 'local_path',
          source_locator: fnDir,
          disk_path: fnDir,
          entry_file: entryFile,
          config_json: config,
          verify_jwt: verifyJwt,
          imports,
          lines_of_code: lines.length,
          category,
          deployed_status: 'unknown',
          tags: [category, verifyJwt ? 'jwt-verified' : 'no-jwt'],
          enabled: true,
          trust_level: 'verified',
          last_synced_at: new Date().toISOString(),
          imported_by: 'disk_scan',
        },
        { onConflict: 'id' },
      );
      if (!error) upserted++;
    }
  } catch { /* skip */ }

  return upserted;
}

// Mark DB rows as stale if their disk_path no longer exists.
async function markStale(): Promise<number> {
  let marked = 0;
  const tables: Array<{ table: string; idField: string }> = [
    { table: 'mcp_servers', idField: 'id' },
    { table: 'slash_commands', idField: 'id' },
    { table: 'agent_hooks', idField: 'id' },
    { table: 'plugin_registry', idField: 'id' },
    { table: 'script_registry', idField: 'id' },
  ];
  for (const { table } of tables) {
    try {
      const { data } = await supabase
        .from(table)
        .select('id, disk_path')
        .eq('source_type', 'local_path')
        .not('disk_path', 'is', null);
      if (!data) continue;
      for (const row of data as any[]) {
        if (row.disk_path && !fs.existsSync(row.disk_path)) {
          await supabase.from(table).update({ enabled: false }).eq('id', row.id);
          marked++;
        }
      }
    } catch { /* skip */ }
  }
  return marked;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Scan all entity folders and upsert rows. Returns summary.
 */
export async function scanRegistryDisk(): Promise<DiskSyncResult> {
  const start = Date.now();
  const errors: string[] = [];

  const upserted: Record<EntityName, number> = {
    skills: 0, mcp: 0, commands: 0, hooks: 0, plugins: 0, scripts: 0,
    subagents: 0, rules: 0, docs: 0, edge_functions: 0, memory_files: 0,
  };
  const scanned: Record<EntityName, number> = {
    skills: 0, mcp: 0, commands: 0, hooks: 0, plugins: 0, scripts: 0,
    subagents: 0, rules: 0, docs: 0, edge_functions: 0, memory_files: 0,
  };

  // Count files in each folder first (quick walk)
  for (const [entity, folderPath] of Object.entries(FOLDER_MAP)) {
    if (fs.existsSync(folderPath)) {
      try {
        scanned[entity as EntityName] = fs.readdirSync(folderPath).length;
      } catch { scanned[entity as EntityName] = 0; }
    }
  }

  // Run all scanners in parallel (each is bounded by folder size)
  // scanReferenceDocs writes to both 'rules' and 'docs' buckets via doc_type; track via single slot
  const results = await Promise.allSettled([
    scanSkills().then((n) => (upserted.skills = n)),
    scanMcp().then((n) => (upserted.mcp = n)),
    scanCommands().then((n) => (upserted.commands = n)),
    scanHooks().then((n) => (upserted.hooks = n)),
    scanPlugins().then((n) => (upserted.plugins = n)),
    scanScripts().then((n) => (upserted.scripts = n)),
    scanSubagents().then((n) => (upserted.subagents = n)),
    scanReferenceDocs().then((n) => { upserted.rules = n; upserted.docs = n; }),
    scanEdgeFunctions().then((n) => (upserted.edge_functions = n)),
    scanMemoryFiles().then((n) => (upserted.memory_files = n)),
  ]);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      errors.push(`Scanner ${Object.keys(upserted)[i]} failed: ${r.reason}`);
    }
  });

  const staleMarked = await markStale();

  return {
    scanned,
    upserted,
    errors,
    stale_marked: staleMarked,
    duration_ms: Date.now() - start,
  };
}
