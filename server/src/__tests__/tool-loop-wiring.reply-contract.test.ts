// Guard: agent [[CALL: …]] markers must be EXECUTED, not just scrubbed.
// Incident 27/09: router imported only the ToolExecutionContext type — parseToolCalls /
// executeToolCalls had zero callers, so postProcessReply stripped every tool call and
// sales-closer never created a Shopify order (nor tickets / identity checks) for ~10 days.
// Runs in the pre-commit reply-contract gate (filename matches "reply-contract").
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

vi.mock('../channels/zalo-personal/supabase.js', () => ({ supabase: {} }));
vi.mock('../channels/crm/mcp-server.js', () => ({}));
vi.mock('../channels/crm/agent-tool-handlers.js', () => ({ GATED_TOOL_NAMES: new Set() }));

const { parseToolCalls, ALLOWED_TOOLS } = await import('../channels/agent-tools.js');

const channelsDir = resolve(__dirname, '../channels');
const routerSrc = readFileSync(join(channelsDir, 'router.ts'), 'utf-8');
// Live code only: drop // line comments and /* */ blocks so a commented-out call can't pass.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const routerCode = stripComments(routerSrc);

describe('marker tool loop wiring (router.ts)', () => {
  it('runAgentWithConfig runs the tool loop BEFORE postProcessReply', () => {
    const loopIdx = routerCode.search(/^\s*reply = await runMarkerToolLoop\(/m);
    const postIdx = routerCode.search(/^\s*reply = await postProcessReply\(reply, config, mediaLib\)/m);
    expect(loopIdx, 'runMarkerToolLoop call missing from runAgentWithConfig').toBeGreaterThan(-1);
    expect(postIdx, 'hoisted postProcessReply call not found').toBeGreaterThan(-1);
    expect(loopIdx, 'tool loop must run before postProcessReply strips [[CALL:]]').toBeLessThan(postIdx);
  });

  it('the loop actually parses and executes calls', () => {
    const start = routerSrc.indexOf('async function runMarkerToolLoop(');
    expect(start).toBeGreaterThan(-1);
    const body = routerSrc.slice(start, routerSrc.indexOf('\n}\n', start));
    expect(body).toMatch(/parseToolCalls\(/);
    expect(body).toMatch(/executeToolCalls\(/);
  });

  it('agent-tools executor has a caller outside agent-tools.ts', () => {
    const callers = readdirSync(channelsDir)
      .filter((f) => f.endsWith('.ts') && f !== 'agent-tools.ts')
      .filter((f) => /executeToolCalls\(|executeTool\(/.test(stripComments(readFileSync(join(channelsDir, f), 'utf-8'))));
    expect(callers.length, 'executeToolCalls/executeTool has no caller — tool calls are dead').toBeGreaterThan(0);
  });
});

describe('agent prompt CALL examples parse (format drift)', () => {
  const agentsDir = process.env.AGENTS_DIR
    || resolve(__dirname, '../../../../crypto-pattern-scanner/agents');
  const files = existsSync(agentsDir)
    ? readdirSync(agentsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .flatMap((d) => ['AGENTS.md', 'TOOLS.md'].map((f) => join(agentsDir, d.name, f)))
        .filter((p) => existsSync(p))
    : [];

  // Whitelisted-tool examples; <placeholder> → "x" so the SHAPE is still checked.
  const exampleRe = /\[\[\s*CALL\s*:\s*([a-z_]+)\(([^\n]*?)\)\s*\]\]/g;
  const examples: Array<{ file: string; name: string; raw: string }> = [];
  for (const file of files) {
    const txt = readFileSync(file, 'utf-8');
    for (const m of txt.matchAll(exampleRe)) {
      if (/^\s*(\.\.\.|…|args)?\s*$/.test(m[2])) continue; // prose stub, not an example
      if (!(ALLOWED_TOOLS as readonly string[]).includes(m[1])) continue;
      const raw = m[0].replace(/"<[^>]*>"/g, '"x"').replace(/<[^>]*>/g, '1');
      examples.push({ file, name: m[1], raw });
    }
  }

  it.skipIf(examples.length === 0)('every concrete CALL example in agent files yields a parsed call', () => {
    const broken = examples.filter((e) => parseToolCalls(e.raw).calls.length !== 1);
    expect(
      broken.map((b) => `${b.file}: ${b.raw.slice(0, 120)}`),
      'these prompt examples would be silently dropped by parseToolCalls',
    ).toEqual([]);
  });

  it('create_shopify_order contract form parses with typed args', () => {
    const { calls } = parseToolCalls(
      '[[CALL: create_shopify_order(variant_id="41620252164273", quantity=1, customer_phone="0938674413", discount_pct=10)]]',
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toMatchObject({ variant_id: '41620252164273', quantity: 1, discount_pct: 10 });
  });
});
