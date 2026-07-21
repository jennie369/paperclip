// Registry Marketplace Routes — CRUD + import for:
//   • MCP servers        → /api/registry/mcp/*
//   • Slash commands     → /api/registry/commands/*
//   • Agent hooks        → /api/registry/hooks/*
//   • Plugin registry    → /api/registry/plugins/*
//   • Skills (existing)  → /api/registry/skills/*  (proxies to company-skills.ts if present)
//
// Mounted at /api/registry/*. Each entity exposes the same endpoint shape:
//   GET    /:entity          list
//   GET    /:entity/stats    counts
//   GET    /:entity/:id      detail
//   POST   /:entity          create (upsert)
//   PATCH  /:entity/:id      update
//   DELETE /:entity/:id      delete
//   POST   /:entity/import   import from GitHub URL

import { Router } from 'express';
import { supabase } from './zalo-personal/supabase.js';

const router = Router();

// Generic factory — creates a CRUD handler set for a Supabase table.
function makeCrudRoutes(
  table: string,
  idColumn: string = 'id',
  editableColumns: string[] = [],
) {
  const sub = Router();

  sub.get('/', async (req, res) => {
    try {
      // Honor ?limit= query (default 500, hard cap 5000) so large registries
      // like memory_files (400+ rows) are fully returned. Without this, the
      // old hardcoded 200 caused entries beyond updated_at-DESC position #200
      // to silently disappear from dropdowns and pickers.
      const rawLimit = Number(req.query.limit ?? 500);
      const limit = Number.isFinite(rawLimit)
        ? Math.max(1, Math.min(5000, Math.trunc(rawLimit)))
        : 500;
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      res.json(data || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  sub.get('/stats', async (_req, res) => {
    try {
      const [total, enabled] = await Promise.all([
        supabase.from(table).select('*', { count: 'exact', head: true }),
        supabase.from(table).select('*', { count: 'exact', head: true }).eq('enabled', true),
      ]);
      res.json({
        total: total.count || 0,
        enabled: enabled.count || 0,
        disabled: (total.count || 0) - (enabled.count || 0),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  sub.get('/:id', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq(idColumn, req.params.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: `${table} ${req.params.id} không tồn tại` });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  sub.post('/', async (req, res) => {
    try {
      const body = req.body || {};
      body.updated_at = new Date().toISOString();
      if (!body.imported_by) body.imported_by = 'user_ui';
      const { data, error } = await supabase
        .from(table)
        .upsert(body, { onConflict: idColumn })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  sub.patch('/:id', async (req, res) => {
    try {
      const patch: Record<string, any> = {};
      if (editableColumns.length > 0) {
        for (const [k, v] of Object.entries(req.body || {})) {
          if (editableColumns.includes(k)) patch[k] = v;
        }
      } else {
        Object.assign(patch, req.body || {});
      }
      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: 'Không có field hợp lệ' });
      }
      patch.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from(table)
        .update(patch)
        .eq(idColumn, req.params.id)
        .select()
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Không tồn tại' });
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  sub.delete('/:id', async (req, res) => {
    try {
      const { error } = await supabase.from(table).delete().eq(idColumn, req.params.id);
      if (error) throw error;
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return sub;
}

// ═══════════════════════════════════════════════════════
// MCP Servers
// ═══════════════════════════════════════════════════════
router.use(
  '/mcp',
  makeCrudRoutes('mcp_servers', 'id', [
    'name', 'description', 'config_json', 'enabled', 'trust_level',
    'tool_list', 'tool_count', 'source_type', 'source_locator', 'source_ref',
    'disk_path',
  ]),
);

// ═══════════════════════════════════════════════════════
// Slash Commands
// ═══════════════════════════════════════════════════════
router.use(
  '/commands',
  makeCrudRoutes('slash_commands', 'id', [
    'name', 'description', 'command_body', 'scope', 'agent_slug',
    'enabled', 'source_type', 'source_locator', 'disk_path',
  ]),
);

// ═══════════════════════════════════════════════════════
// Agent Hooks
// ═══════════════════════════════════════════════════════
router.use(
  '/hooks',
  makeCrudRoutes('agent_hooks', 'id', [
    'event', 'matcher', 'command', 'description', 'scope', 'agent_slug',
    'enabled', 'source_type', 'source_locator', 'disk_path',
  ]),
);

// ═══════════════════════════════════════════════════════
// Plugin Registry
// ═══════════════════════════════════════════════════════
router.use(
  '/plugins',
  makeCrudRoutes('plugin_registry', 'id', [
    'name', 'description', 'source_type', 'source_locator', 'source_ref',
    'version', 'plugin_type', 'manifest_json', 'enabled', 'trust_level',
    'disk_path',
  ]),
);

// ═══════════════════════════════════════════════════════
// Skills — uses skills_registry table (new, simpler schema).
// Primary source: disk scan from ~/.claude/skills/ + skills-store/.
// Falls back to company_skills table if skills_registry empty.
// ═══════════════════════════════════════════════════════
router.use(
  '/skills',
  makeCrudRoutes('skills_registry', 'id', [
    'name', 'description', 'source_type', 'source_locator', 'source_ref',
    'version', 'skill_type', 'frontmatter', 'enabled', 'trust_level',
    'disk_path',
  ]),
);

// ═══════════════════════════════════════════════════════
// Scripts — .py/.bat/.sh/.ps1/.mjs/.js files from project roots
// ═══════════════════════════════════════════════════════
router.use(
  '/scripts',
  makeCrudRoutes('script_registry', 'id', [
    'name', 'description', 'language', 'source_type', 'source_locator',
    'source_ref', 'disk_path', 'script_root', 'executable_command',
    'working_directory', 'tags', 'category', 'linked_cron_id',
    'linked_sop_ids', 'metadata', 'enabled', 'trust_level',
  ]),
);

// ═══════════════════════════════════════════════════════
// Claude Code Subagents — ~/.claude/agents/*.md (42 subagents)
// ═══════════════════════════════════════════════════════
router.use(
  '/subagents',
  makeCrudRoutes('claude_subagents', 'id', [
    'name', 'description', 'model', 'tools', 'system_prompt',
    'source_type', 'source_locator', 'disk_path', 'frontmatter',
    'category', 'tags', 'enabled', 'trust_level',
  ]),
);

// ═══════════════════════════════════════════════════════
// Reference Docs — ~/.claude/rules/ + ~/.claude/docs/
// ═══════════════════════════════════════════════════════
router.use(
  '/reference-docs',
  makeCrudRoutes('reference_docs', 'id', [
    'name', 'description', 'doc_type', 'category', 'source_type',
    'source_locator', 'disk_path', 'auto_loaded', 'word_count', 'preview',
    'tags', 'enabled', 'trust_level',
  ]),
);

// ═══════════════════════════════════════════════════════
// Supabase Edge Functions — supabase/functions/*
// ═══════════════════════════════════════════════════════
router.use(
  '/edge-functions',
  makeCrudRoutes('edge_functions', 'id', [
    'name', 'description', 'source_type', 'source_locator', 'disk_path',
    'entry_file', 'config_json', 'verify_jwt', 'imports', 'lines_of_code',
    'category', 'deployed_status', 'last_deployed_at', 'tags', 'enabled',
    'trust_level',
  ]),
);

// ═══════════════════════════════════════════════════════
// Dropdown Options — SSOT for all dropdown values (notify_channels,
// hooks, preconditions, trigger_types, cron_expressions, executor_types,
// db_tables, input_sources, output_destinations).
// Replaces the hardcoded arrays in ui/api/registry-options.ts.
//
// NOTE: The /catalog and /by-category routes MUST be registered BEFORE
// the CRUD mount, otherwise the CRUD factory's GET /:id route shadows
// them (treats 'catalog' or 'by-category' as an id lookup).
// ═══════════════════════════════════════════════════════

// GET /dropdown-options/catalog — return ALL categories as a map
router.get('/dropdown-options/catalog', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('dropdown_options')
      .select('*')
      .eq('enabled', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    const catalog: Record<string, any[]> = {};
    for (const row of data || []) {
      const cat = (row as any).category;
      if (!catalog[cat]) catalog[cat] = [];
      catalog[cat].push(row);
    }
    res.json(catalog);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /dropdown-options/by-category/:category — list options in one category
router.get('/dropdown-options/by-category/:category', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dropdown_options')
      .select('*')
      .eq('category', req.params.category)
      .eq('enabled', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.use(
  '/dropdown-options',
  makeCrudRoutes('dropdown_options', 'id', [
    'category', 'value', 'label', 'description', 'sort_order',
    'metadata', 'enabled', 'system_defined', 'created_by',
  ]),
);

// ═══════════════════════════════════════════════════════
// GLOBAL SEARCH — unified search across ALL registries
// GET /search?q=foo&limit=50
// Returns: { results: [{ entity, id, name, description, match_field }] }
// ═══════════════════════════════════════════════════════
router.get('/search', async (req, res) => {
  try {
    const q = ((req.query.q as string) || '').trim();
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
    if (!q || q.length < 2) {
      return res.json({ results: [], query: q });
    }
    const like = `%${q}%`;
    const perEntity = Math.max(5, Math.floor(limit / 15));

    const searchTable = async (table: string, entity: string, fields: string[], idField = 'id') => {
      try {
        const orClause = fields.map((f) => `${f}.ilike.${like}`).join(',');
        const { data } = await supabase
          .from(table)
          .select('*')
          .or(orClause)
          .limit(perEntity);
        return (data || []).map((row: any) => ({
          entity,
          id: row[idField] || row.id,
          name: row.name || row.title || row.display_name || row[idField],
          description: row.description || row.preview || null,
          category: row.category || row.file_type || row.language || row.doc_type || null,
          disk_path: row.disk_path || row.source_locator || null,
          raw: row,
        }));
      } catch {
        return [];
      }
    };

    const all = await Promise.all([
      searchTable('mcp_servers', 'mcp', ['name', 'description']),
      searchTable('slash_commands', 'commands', ['name', 'description', 'command_body']),
      searchTable('agent_hooks', 'hooks', ['event', 'matcher', 'command', 'description']),
      searchTable('plugin_registry', 'plugins', ['name', 'description']),
      searchTable('skills_registry', 'skills', ['name', 'description']),
      searchTable('script_registry', 'scripts', ['name', 'description']),
      searchTable('claude_subagents', 'subagents', ['name', 'description', 'system_prompt']),
      searchTable('reference_docs', 'reference_docs', ['name', 'description', 'preview']),
      searchTable('edge_functions', 'edge_functions', ['name', 'description']),
      searchTable('memory_files', 'memory_files', ['name', 'description', 'preview']),
      searchTable('dropdown_options', 'dropdown_options', ['value', 'label', 'description']),
      searchTable('gem_sops', 'sops', ['sop_id', 'name', 'description', 'body_markdown'], 'sop_id'),
      searchTable('gem_pipelines', 'pipelines', ['title', 'description'], 'pipeline_id'),
      searchTable('paperclip_agents', 'agents', ['slug', 'display_name', 'description'], 'slug'),
      searchTable('cron_registry', 'crons', ['display_name', 'description']),
    ]);

    const results = all.flat().slice(0, limit);
    res.json({
      query: q,
      results,
      counts: {
        mcp: all[0].length,
        commands: all[1].length,
        hooks: all[2].length,
        plugins: all[3].length,
        skills: all[4].length,
        scripts: all[5].length,
        subagents: all[6].length,
        reference_docs: all[7].length,
        edge_functions: all[8].length,
        memory_files: all[9].length,
        dropdown_options: all[10].length,
        sops: all[11].length,
        pipelines: all[12].length,
        agents: all[13].length,
        crons: all[14].length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// Memory Files — project memory/ browser (today, patterns, reports, decisions, sops, agents)
// ═══════════════════════════════════════════════════════
router.use(
  '/memory-files',
  makeCrudRoutes('memory_files', 'id', [
    'name', 'description', 'file_type', 'category', 'source_type',
    'source_locator', 'disk_path', 'preview', 'tags', 'enabled', 'trust_level',
  ]),
);

// ═══════════════════════════════════════════════════════
// Live-data views: Training / Content Calendar / Email Campaigns / Shopify Products
// These are read-only proxies to existing tables — no new registry tables.
// ═══════════════════════════════════════════════════════

// Training enrollments — who's enrolled in what agent training
router.get('/training/enrollments', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('training_enrollments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/training/stats', async (_req, res) => {
  try {
    const [enrollments, lessons] = await Promise.all([
      supabase.from('training_enrollments').select('*', { count: 'exact', head: true }),
      supabase.from('training_lessons').select('*', { count: 'exact', head: true }),
    ]);
    res.json({
      enrollments: enrollments.count || 0,
      lessons: lessons.count || 0,
    });
  } catch (err: any) {
    res.json({ enrollments: 0, lessons: 0 });
  }
});

// Content calendar — upcoming scheduled posts
router.get('/content-calendar', async (req, res) => {
  try {
    const { status, from } = req.query;
    // Column is `scheduled_date` (DATE) — `scheduled_at` never existed, so this
    // endpoint answered 500 every time. "Upcoming" also has to mean upcoming:
    // without a floor the 500-row window filled with the oldest events in the
    // table, which for a calendar is the exact opposite of what it promises.
    const floor = (from as string) || new Date().toISOString().slice(0, 10);
    let q = supabase
      .from('cc_calendar_events')
      .select('*')
      .gte('scheduled_date', floor)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true, nullsFirst: true })
      .limit(500);
    if (status) q = q.eq('status', status as string);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/content-calendar/stats', async (_req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [total, upcoming, published] = await Promise.all([
      supabase.from('cc_calendar_events').select('*', { count: 'exact', head: true }),
      supabase.from('cc_calendar_events').select('*', { count: 'exact', head: true }).gte('scheduled_date', today),
      supabase.from('cc_calendar_events').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    ]);
    res.json({
      total: total.count || 0,
      upcoming: upcoming.count || 0,
      published: published.count || 0,
    });
  } catch (err: any) {
    res.json({ total: 0, upcoming: 0, published: 0 });
  }
});

// Email campaigns — active + scheduled
router.get('/email-campaigns', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('cc_email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/email-campaigns/stats', async (_req, res) => {
  try {
    const [total, active, sent] = await Promise.all([
      supabase.from('cc_email_campaigns').select('*', { count: 'exact', head: true }),
      supabase.from('cc_email_campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('cc_email_sends').select('*', { count: 'exact', head: true }),
    ]);
    res.json({
      total_campaigns: total.count || 0,
      active_campaigns: active.count || 0,
      total_sends: sent.count || 0,
    });
  } catch (err: any) {
    res.json({ total_campaigns: 0, active_campaigns: 0, total_sends: 0 });
  }
});

// Shopify products — pricing catalog SSOT
router.get('/shopify-products', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('shopify_products')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/shopify-products/stats', async (_req, res) => {
  try {
    const [total, variants, orders] = await Promise.all([
      supabase.from('shopify_products').select('*', { count: 'exact', head: true }),
      supabase.from('shopify_product_variants').select('*', { count: 'exact', head: true }),
      supabase.from('shopify_orders').select('*', { count: 'exact', head: true }),
    ]);
    res.json({
      products: total.count || 0,
      variants: variants.count || 0,
      orders: orders.count || 0,
    });
  } catch (err: any) {
    res.json({ products: 0, variants: 0, orders: 0 });
  }
});

// ═══════════════════════════════════════════════════════
// GitHub import — public repos only
// ═══════════════════════════════════════════════════════
// POST /api/registry/sync/scan
// Scan ~/.claude/{skills,mcp-configs,commands,hooks,plugins}/ and reconcile
// with DB. Manual user-triggered OR called once at server startup. NO cron.
router.post('/sync/scan', async (_req, res) => {
  try {
    const { scanRegistryDisk } = await import('../services/registry-disk-sync.js');
    const result = await scanRegistryDisk();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/registry/import/github
// Body: { entity: 'mcp'|'commands'|'hooks'|'plugins'|'skills', url: string, name?: string }
// For Phase 3.3: actual git clone is implemented in github-importer.ts.
// This route wraps it and returns the imported row.
router.post('/import/github', async (req, res) => {
  try {
    const { entity, url, name } = req.body || {};
    if (!entity || !url) {
      return res.status(400).json({ error: 'entity và url bắt buộc' });
    }
    const { importFromGithub } = await import('../services/github-importer.js');
    const result = await importFromGithub(entity, url, name);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// Aggregate stats for dashboard widget
// ═══════════════════════════════════════════════════════
router.get('/stats/all', async (_req, res) => {
  try {
    const [
      mcp, commands, hooks, plugins, skills, scripts, subagents, rules, docs, edgeFns,
      memoryFiles, training, calendar, emailCampaigns, shopifyProducts, dropdownOptionsRes,
    ] = await Promise.all([
      supabase.from('mcp_servers').select('*', { count: 'exact', head: true }),
      supabase.from('slash_commands').select('*', { count: 'exact', head: true }),
      supabase.from('agent_hooks').select('*', { count: 'exact', head: true }),
      supabase.from('plugin_registry').select('*', { count: 'exact', head: true }),
      supabase.from('skills_registry').select('*', { count: 'exact', head: true }),
      supabase.from('script_registry').select('*', { count: 'exact', head: true }),
      supabase.from('claude_subagents').select('*', { count: 'exact', head: true }),
      supabase.from('reference_docs').select('*', { count: 'exact', head: true }).eq('doc_type', 'rule'),
      supabase.from('reference_docs').select('*', { count: 'exact', head: true }).eq('doc_type', 'doc'),
      supabase.from('edge_functions').select('*', { count: 'exact', head: true }),
      supabase.from('memory_files').select('*', { count: 'exact', head: true }),
      supabase.from('training_enrollments').select('*', { count: 'exact', head: true }),
      supabase.from('cc_calendar_events').select('*', { count: 'exact', head: true }),
      supabase.from('cc_email_campaigns').select('*', { count: 'exact', head: true }),
      supabase.from('shopify_products').select('*', { count: 'exact', head: true }),
      supabase.from('dropdown_options').select('*', { count: 'exact', head: true }),
    ]);
    const dropdownOptions = dropdownOptionsRes.count || 0;
    res.json({
      mcp: mcp.count || 0,
      commands: commands.count || 0,
      hooks: hooks.count || 0,
      plugins: plugins.count || 0,
      skills: skills.count || 0,
      scripts: scripts.count || 0,
      subagents: subagents.count || 0,
      rules: rules.count || 0,
      docs: docs.count || 0,
      edge_functions: edgeFns.count || 0,
      memory_files: memoryFiles.count || 0,
      training_enrollments: training.count || 0,
      content_calendar: calendar.count || 0,
      email_campaigns: emailCampaigns.count || 0,
      shopify_products: shopifyProducts.count || 0,
      dropdown_options: dropdownOptions,
    });
  } catch (err: any) {
    res.json({
      mcp: 0, commands: 0, hooks: 0, plugins: 0, skills: 0, scripts: 0,
      subagents: 0, rules: 0, docs: 0, edge_functions: 0,
      memory_files: 0, training_enrollments: 0, content_calendar: 0,
      email_campaigns: 0, shopify_products: 0,
    });
  }
});

// ═══════════════════════════════════════════════════════
// Phase 9 (R-1 no-readonly) — actions for drawer + row buttons
// ═══════════════════════════════════════════════════════

// Whitelisted root paths for /file endpoint. Same approach as
// sop-engine-routes.ts /knowledge/file but works with absolute paths from
// the registry tables (where rows store full disk_path strings).
const FILE_ROOTS_ALLOWLIST = [
  'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/',
  'C:/Users/Jennie Chu/Desktop/Projects/paperclip/',
  'D:/Claude Projects/App Content Jennie/',
  'C:/Users/Jennie Chu/.claude/',
];
const FILE_MAX_BYTES = 1_000_000;
const FILE_ALLOWED_EXT = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '.py', '.ts', '.tsx', '.js', '.mjs', '.sql', '.html', '.bat', '.ps1', '.sh']);

function safeResolveAbsolute(absPath: string): string | null {
  // Normalize Windows backslashes → forward slashes for comparison
  const normalized = absPath.replace(/\\/g, '/');
  // Reject path traversal
  if (normalized.includes('..')) return null;
  // Must be inside one of the whitelisted roots
  const allowed = FILE_ROOTS_ALLOWLIST.some((root) => normalized.toLowerCase().startsWith(root.toLowerCase()));
  if (!allowed) return null;
  return normalized;
}

// GET /api/registry/file?path=ABS_PATH — read raw file content for drawer preview
router.get('/file', async (req, res) => {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const requested = (req.query.path as string) || '';
    if (!requested) return res.status(400).json({ error: 'path query param required' });

    const safe = safeResolveAbsolute(requested);
    if (!safe) return res.status(403).json({ error: 'Path không nằm trong whitelist roots' });

    if (!fs.existsSync(safe)) return res.status(404).json({ error: 'File không tồn tại' });

    const stat = fs.statSync(safe);
    if (stat.isDirectory()) return res.status(400).json({ error: 'Target là directory' });

    const ext = path.extname(safe).toLowerCase();
    if (!FILE_ALLOWED_EXT.has(ext)) {
      return res.status(415).json({ error: `Extension ${ext} không được phép` });
    }

    let content: string;
    let truncated = false;
    if (stat.size > FILE_MAX_BYTES) {
      // Read first 1MB only
      const fd = fs.openSync(safe, 'r');
      const buf = Buffer.alloc(FILE_MAX_BYTES);
      fs.readSync(fd, buf, 0, FILE_MAX_BYTES, 0);
      fs.closeSync(fd);
      content = buf.toString('utf-8');
      truncated = true;
    } else {
      content = fs.readFileSync(safe, 'utf-8');
    }

    res.json({
      content,
      size: stat.size,
      truncated,
      modified: stat.mtime.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/registry/scripts/:id/execute — run a registered script via spawnHidden
// Body: { args?: string[], env?: Record<string,string> } (both optional)
router.post('/scripts/:id/execute', async (req, res) => {
  try {
    // Look up script row
    const { data: script, error } = await supabase
      .from('script_registry')
      .select('id, name, language, disk_path, script_root, file_name')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!script) return res.status(404).json({ error: 'Script không tồn tại trong script_registry' });

    const fullPath = script.disk_path ||
      (script.script_root && script.file_name ? `${script.script_root}/${script.file_name}` : null);
    if (!fullPath) return res.status(400).json({ error: 'Script không có disk_path hoặc script_root+file_name' });

    const safe = safeResolveAbsolute(fullPath);
    if (!safe) return res.status(403).json({ error: 'Script path không nằm trong whitelist' });

    const fs = await import('node:fs');
    if (!fs.existsSync(safe)) return res.status(404).json({ error: `Script file không tồn tại: ${safe}` });

    // Pick interpreter by language/extension
    const path = await import('node:path');
    const ext = path.extname(safe).toLowerCase();
    let cmd: string;
    let args: string[];
    if (ext === '.py') {
      cmd = 'python';
      args = [safe, ...(req.body?.args || [])];
    } else if (ext === '.js' || ext === '.mjs') {
      cmd = 'node';
      args = [safe, ...(req.body?.args || [])];
    } else if (ext === '.ps1') {
      cmd = 'powershell';
      args = ['-NoProfile', '-File', safe, ...(req.body?.args || [])];
    } else if (ext === '.bat' || ext === '.cmd') {
      cmd = 'cmd';
      args = ['/c', safe, ...(req.body?.args || [])];
    } else if (ext === '.sh') {
      cmd = 'bash';
      args = [safe, ...(req.body?.args || [])];
    } else {
      return res.status(400).json({ error: `Extension ${ext} không support execute` });
    }

    // Use child_process.spawn (NOT shell:true) — same pattern as cron-registry executeCronNow
    const cp = await import('node:child_process');
    const child = cp.spawn(cmd, args, {
      windowsHide: true,
      env: { ...process.env, ...(req.body?.env || {}) },
      cwd: path.dirname(safe),
    });

    let stdout = '';
    let stderr = '';
    const TIMEOUT_MS = 120_000;

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, TIMEOUT_MS);

    child.stdout?.setEncoding("utf8");
    child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); if (stdout.length > 200_000) stdout = stdout.slice(-200_000); });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); if (stderr.length > 50_000) stderr = stderr.slice(-50_000); });

    child.on('close', (code) => {
      clearTimeout(timer);
      // Update last_run_* on script row (if those columns exist)
      supabase
        .from('script_registry')
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: code === 0 ? 'success' : 'failed',
          last_run_exit_code: code,
        })
        .eq('id', req.params.id)
        .then(() => {});

      res.json({
        ok: code === 0,
        exit_code: code,
        stdout: stdout.slice(-10_000), // tail 10KB
        stderr: stderr.slice(-10_000),
        script: script.name,
        path: safe,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      res.status(500).json({ error: `spawn failed: ${err.message}` });
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/registry/mcp/:id/test — probe an MCP server config to validate it loads
router.post('/mcp/:id/test', async (req, res) => {
  try {
    const { data: mcp, error } = await supabase
      .from('mcp_servers')
      .select('id, name, config_json')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!mcp) return res.status(404).json({ error: 'MCP server không tồn tại' });

    const cfg = mcp.config_json || {};
    if (!cfg.command && !cfg.url) {
      return res.status(400).json({ error: 'config_json thiếu command hoặc url' });
    }

    // For HTTP MCP — just GET the URL
    if (cfg.url) {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 10_000);
      try {
        const r = await fetch(cfg.url, { signal: ctrl.signal });
        clearTimeout(timeout);
        return res.json({ ok: r.ok, status: r.status, mode: 'http', url: cfg.url });
      } catch (err: any) {
        clearTimeout(timeout);
        return res.json({ ok: false, mode: 'http', error: err.message });
      }
    }

    // For stdio MCP — spawn briefly with --help or --version, capture stdout
    const cp = await import('node:child_process');
    const child = cp.spawn(cfg.command, [...(cfg.args || []), '--version'], {
      windowsHide: true,
      env: { ...process.env, ...(cfg.env || {}) },
    });

    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 10_000);

    child.stdout?.setEncoding("utf8");
    child.stdout?.on('data', (c) => { out += c.toString(); if (out.length > 5_000) out = out.slice(-5_000); });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on('data', (c) => { err += c.toString(); if (err.length > 5_000) err = err.slice(-5_000); });

    child.on('close', (code) => {
      clearTimeout(timer);
      res.json({
        ok: code === 0 || out.length > 0, // many MCPs print version to stdout then exit non-zero
        exit_code: code,
        mode: 'stdio',
        command: cfg.command,
        stdout: out,
        stderr: err,
      });
    });

    child.on('error', (e) => {
      clearTimeout(timer);
      res.json({ ok: false, mode: 'stdio', error: e.message });
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
