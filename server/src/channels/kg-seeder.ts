// Knowledge Graph Seeder — Seed from existing Paperclip data
// Sources: paperclip_agents, gem_sops, channel_instances, crm_contacts, concepts

import { supabase } from './zalo-personal/supabase.js';

interface SeedResult {
  entities_upserted: number;
  relations_upserted: number;
  errors: string[];
}

async function upsertEntity(
  external_id: string,
  entity_type: string,
  name: string,
  description: string | null,
  metadata: Record<string, unknown>,
  source = 'system',
): Promise<string | null> {
  const { data, error } = await supabase
    .from('kg_entities')
    .upsert(
      { external_id, entity_type, name, description, metadata, source, confidence: 1.0 },
      { onConflict: 'external_id' },
    )
    .select('id')
    .single();
  if (error) {
    console.warn(`[KG Seed] Entity upsert failed: ${external_id}`, error.message);
    return null;
  }
  return data.id;
}

async function upsertRelation(
  source_entity_id: string,
  target_entity_id: string,
  relation_type: string,
  source = 'system',
): Promise<boolean> {
  const { error } = await supabase
    .from('kg_relations')
    .upsert(
      { source_entity_id, target_entity_id, relation_type, confidence: 1.0, source },
      { onConflict: 'source_entity_id,target_entity_id,relation_type' },
    );
  if (error) {
    console.warn(`[KG Seed] Relation upsert failed:`, error.message);
    return false;
  }
  return true;
}

// Helper: resolve entity ID by external_id
async function resolveEntityId(external_id: string): Promise<string | null> {
  const { data } = await supabase
    .from('kg_entities')
    .select('id')
    .eq('external_id', external_id)
    .single();
  return data?.id ?? null;
}

export async function seedKnowledgeGraph(): Promise<SeedResult> {
  const result: SeedResult = { entities_upserted: 0, relations_upserted: 0, errors: [] };

  // ── 1. Agents (from paperclip_agents) ──
  const { data: agents } = await supabase
    .from('paperclip_agents')
    .select('slug, display_name, model, provider, enabled, description');

  if (agents) {
    for (const a of agents) {
      const id = await upsertEntity(
        `agent:${a.slug}`,
        'agent',
        a.display_name || a.slug,
        a.description || null,
        { model: a.model, provider: a.provider, enabled: a.enabled },
      );
      if (id) result.entities_upserted++;
    }
    console.log(`[KG Seed] ${agents.length} agents seeded`);
  }

  // ── 2. SOPs (from gem_sops) ──
  const { data: sops } = await supabase
    .from('gem_sops')
    .select('sop_id, name, domain, priority, status, sop_type, depends_on, outputs_to, assigned_agents');

  if (sops) {
    for (const s of sops) {
      const id = await upsertEntity(
        `sop:${s.sop_id}`,
        'sop',
        s.name || s.sop_id,
        null,
        { domain: s.domain, priority: s.priority, status: s.status, sop_type: s.sop_type },
      );
      if (id) result.entities_upserted++;
    }

    // SOP relations (depends_on, outputs_to, assigned_to)
    for (const s of sops) {
      const sourceId = await resolveEntityId(`sop:${s.sop_id}`);
      if (!sourceId) continue;

      // depends_on relations
      const deps = Array.isArray(s.depends_on) ? s.depends_on : [];
      for (const dep of deps) {
        const targetId = await resolveEntityId(`sop:${dep}`);
        if (targetId && await upsertRelation(sourceId, targetId, 'depends_on')) {
          result.relations_upserted++;
        }
      }

      // outputs_to relations
      const outputs = Array.isArray(s.outputs_to) ? s.outputs_to : [];
      for (const out of outputs) {
        const targetId = await resolveEntityId(`sop:${out}`);
        if (targetId && await upsertRelation(sourceId, targetId, 'outputs_to')) {
          result.relations_upserted++;
        }
      }

      // assigned_agents relations
      const assigned = Array.isArray(s.assigned_agents) ? s.assigned_agents : [];
      for (const agentSlug of assigned) {
        const targetId = await resolveEntityId(`agent:${agentSlug}`);
        if (targetId && await upsertRelation(sourceId, targetId, 'assigned_to')) {
          result.relations_upserted++;
        }
      }
    }
    console.log(`[KG Seed] ${sops.length} SOPs seeded with relations`);
  }

  // ── 3. Channels (from channel_instances) ──
  const { data: channels } = await supabase
    .from('channel_instances')
    .select('id, name, channel_type, agent_slug');

  if (channels) {
    for (const ch of channels) {
      const id = await upsertEntity(
        `channel:${ch.name || ch.id}`,
        'channel',
        ch.name || ch.channel_type || 'Unknown Channel',
        null,
        { channel_type: ch.channel_type, agent_slug: ch.agent_slug },
      );
      if (id) result.entities_upserted++;

      // Agent handles channel
      if (ch.agent_slug && id) {
        const agentId = await resolveEntityId(`agent:${ch.agent_slug}`);
        if (agentId) {
          const entityId = await resolveEntityId(`channel:${ch.name || ch.id}`);
          if (entityId && await upsertRelation(agentId, entityId, 'handles')) {
            result.relations_upserted++;
          }
        }
      }
    }
    console.log(`[KG Seed] ${channels.length} channels seeded`);
  }

  // ── 4. CRM Contacts (from crm_contacts) ──
  const { data: contacts } = await supabase
    .from('crm_contacts')
    .select('id, name, stage, channel')
    .limit(200);

  if (contacts) {
    for (const c of contacts) {
      const id = await upsertEntity(
        `customer:${c.id}`,
        'customer',
        c.name || 'Khách chưa rõ tên',
        null,
        { stage: c.stage, channel: c.channel },
      );
      if (id) result.entities_upserted++;
    }
    console.log(`[KG Seed] ${contacts.length} customers seeded`);
  }

  // ── 5. Concept entities (hardcoded) ──
  const concepts = [
    { ext: 'concept:gemral-ecosystem', name: 'Gemral Ecosystem', type: 'organization' as const },
    { ext: 'concept:gem-frequency', name: 'GEM Frequency Method', type: 'concept' as const },
    { ext: 'concept:yinyang-masters', name: 'YinYang Masters', type: 'organization' as const },
    { ext: 'concept:trading-education', name: 'Trading Education', type: 'concept' as const },
    { ext: 'concept:crystal-spiritual', name: 'Crystal Spiritual', type: 'concept' as const },
    { ext: 'concept:content-pipeline', name: 'Content Pipeline', type: 'concept' as const },
  ];

  for (const c of concepts) {
    const id = await upsertEntity(c.ext, c.type, c.name, null, {});
    if (id) result.entities_upserted++;
  }
  console.log(`[KG Seed] ${concepts.length} concepts seeded`);

  console.log(`[KG Seed] DONE: ${result.entities_upserted} entities, ${result.relations_upserted} relations`);
  return result;
}
