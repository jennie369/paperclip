// Knowledge Graph Routes — 11 API endpoints
// Mounts at: /api/ops/kg

import { Router } from 'express';
import { supabase } from './zalo-personal/supabase.js';
import { seedKnowledgeGraph } from './kg-seeder.js';
import { scanForDuplicates, mergeEntities } from './kg-dedup.js';
import type { KGExtractionResult } from './kg-types.js';

const router = Router();

// ═══════════════════════════════════════════════════════
// GET /entities — List/search entities
// ═══════════════════════════════════════════════════════
router.get('/entities', async (req, res) => {
  try {
    const { type, search, limit = '50', offset = '0' } = req.query;
    let query = supabase
      .from('kg_entities')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (type) query = query.eq('entity_type', type as string);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data, total: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// GET /entities/:id — Entity detail + related relations
// ═══════════════════════════════════════════════════════
router.get('/entities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: entity, error } = await supabase
      .from('kg_entities')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return res.status(404).json({ error: 'Entity not found' });

    // Fetch related relations (both directions)
    const { data: relations } = await supabase
      .from('kg_relations')
      .select('*')
      .or(`source_entity_id.eq.${id},target_entity_id.eq.${id}`);

    // Fetch related entity names for display
    const relatedIds = new Set<string>();
    for (const r of relations || []) {
      relatedIds.add(r.source_entity_id);
      relatedIds.add(r.target_entity_id);
    }
    relatedIds.delete(id);

    const { data: relatedEntities } = relatedIds.size > 0
      ? await supabase
          .from('kg_entities')
          .select('id, external_id, entity_type, name')
          .in('id', Array.from(relatedIds))
      : { data: [] };

    res.json({ entity, relations: relations || [], related_entities: relatedEntities || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// POST /entities — Create/upsert entity
// ═══════════════════════════════════════════════════════
router.post('/entities', async (req, res) => {
  try {
    const { external_id, entity_type, name, description, metadata, confidence, source } = req.body;
    if (!external_id || !entity_type || !name) {
      return res.status(400).json({ error: 'external_id, entity_type, name required' });
    }

    const { data, error } = await supabase
      .from('kg_entities')
      .upsert(
        {
          external_id,
          entity_type,
          name,
          description: description || null,
          metadata: metadata || {},
          confidence: confidence ?? 1.0,
          source: source || 'manual',
        },
        { onConflict: 'external_id' },
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// DELETE /entities/:id — Delete entity (cascades relations)
// ═══════════════════════════════════════════════════════
router.delete('/entities/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('kg_entities')
      .delete()
      .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// GET /graph — Visualization data (top 50 by degree)
// ═══════════════════════════════════════════════════════
router.get('/graph', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const typeFilter = req.query.types as string | undefined;

    // Get all relations to compute degree
    let relQuery = supabase.from('kg_relations').select('*');
    const { data: allRelations } = await relQuery;

    // Compute degree centrality
    const degree = new Map<string, number>();
    for (const r of allRelations || []) {
      degree.set(r.source_entity_id, (degree.get(r.source_entity_id) || 0) + 1);
      degree.set(r.target_entity_id, (degree.get(r.target_entity_id) || 0) + 1);
    }

    // Sort by degree DESC, take top N
    const topIds = Array.from(degree.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    // If not enough entities with relations, pad with recent entities
    if (topIds.length < limit) {
      let padQuery = supabase
        .from('kg_entities')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(limit);
      if (typeFilter) {
        const types = typeFilter.split(',');
        padQuery = padQuery.in('entity_type', types);
      }
      const { data: padEntities } = await padQuery;
      const existing = new Set(topIds);
      for (const e of padEntities || []) {
        if (!existing.has(e.id) && topIds.length < limit) {
          topIds.push(e.id);
          existing.add(e.id);
        }
      }
    }

    if (topIds.length === 0) {
      return res.json({ entities: [], relations: [] });
    }

    // Fetch entities
    let entQuery = supabase
      .from('kg_entities')
      .select('id, external_id, entity_type, name, description, metadata, confidence, created_at, updated_at')
      .in('id', topIds);
    if (typeFilter) {
      const types = typeFilter.split(',');
      entQuery = entQuery.in('entity_type', types);
    }
    const { data: entities } = await entQuery;

    // Filter relations to only include edges between visible entities
    const visibleIds = new Set((entities || []).map(e => e.id));
    const filteredRelations = (allRelations || []).filter(
      r => visibleIds.has(r.source_entity_id) && visibleIds.has(r.target_entity_id),
    );

    res.json({ entities: entities || [], relations: filteredRelations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// POST /traverse — Recursive CTE traversal (max 3 hops)
// ═══════════════════════════════════════════════════════
router.post('/traverse', async (req, res) => {
  try {
    const { start_id, external_id, max_depth = 3, rel_types } = req.body;

    // Resolve external_id to UUID if provided
    let entityId = start_id;
    if (!entityId && external_id) {
      const { data } = await supabase
        .from('kg_entities')
        .select('id')
        .eq('external_id', external_id)
        .single();
      if (!data) return res.status(404).json({ error: 'Entity not found' });
      entityId = data.id;
    }

    if (!entityId) return res.status(400).json({ error: 'start_id or external_id required' });

    const { data, error } = await supabase.rpc('kg_traverse', {
      start_id: entityId,
      max_depth: Math.min(max_depth, 3),
      rel_types: rel_types || null,
    });

    if (error) return res.status(500).json({ error: error.message });

    // Also fetch the relations between traversed entities
    const traversedIds = (data || []).map((d: any) => d.entity_id);
    const { data: relations } = traversedIds.length > 0
      ? await supabase
          .from('kg_relations')
          .select('*')
          .or(
            traversedIds.map((id: string) =>
              `source_entity_id.eq.${id},target_entity_id.eq.${id}`
            ).join(',')
          )
      : { data: [] };

    // Filter to only internal relations
    const idSet = new Set(traversedIds);
    const internalRelations = (relations || []).filter(
      (r: any) => idSet.has(r.source_entity_id) && idSet.has(r.target_entity_id),
    );

    res.json({ entities: data || [], relations: internalRelations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// POST /ingest — Accept LLM extraction results → upsert
// ═══════════════════════════════════════════════════════
router.post('/ingest', async (req, res) => {
  try {
    const { entities, relations } = req.body as KGExtractionResult;
    let entitiesUpserted = 0;
    let relationsUpserted = 0;

    // Upsert entities
    for (const e of entities || []) {
      const { error } = await supabase
        .from('kg_entities')
        .upsert(
          {
            external_id: e.external_id,
            entity_type: e.entity_type,
            name: e.name,
            description: e.description || null,
            confidence: e.confidence,
            source: 'chat',
          },
          { onConflict: 'external_id' },
        );
      if (!error) entitiesUpserted++;
    }

    // Upsert relations
    for (const r of relations || []) {
      const { data: src } = await supabase
        .from('kg_entities')
        .select('id')
        .eq('external_id', r.source)
        .single();
      const { data: tgt } = await supabase
        .from('kg_entities')
        .select('id')
        .eq('external_id', r.target)
        .single();
      if (src && tgt) {
        const { error } = await supabase
          .from('kg_relations')
          .upsert(
            {
              source_entity_id: src.id,
              target_entity_id: tgt.id,
              relation_type: r.relation_type,
              confidence: r.confidence,
              source: 'chat',
            },
            { onConflict: 'source_entity_id,target_entity_id,relation_type' },
          );
        if (!error) relationsUpserted++;
      }
    }

    res.json({ entities_upserted: entitiesUpserted, relations_upserted: relationsUpserted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// POST /seed — Trigger data seeding from existing tables
// ═══════════════════════════════════════════════════════
router.post('/seed', async (_req, res) => {
  try {
    const result = await seedKnowledgeGraph();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// GET /stats — Entity/relation counts by type
// ═══════════════════════════════════════════════════════
router.get('/stats', async (_req, res) => {
  try {
    // Entity counts by type
    const { data: entities } = await supabase
      .from('kg_entities')
      .select('entity_type');
    const entityCounts: Record<string, number> = {};
    for (const e of entities || []) {
      entityCounts[e.entity_type] = (entityCounts[e.entity_type] || 0) + 1;
    }

    // Relation counts by type
    const { data: relations } = await supabase
      .from('kg_relations')
      .select('relation_type');
    const relationCounts: Record<string, number> = {};
    for (const r of relations || []) {
      relationCounts[r.relation_type] = (relationCounts[r.relation_type] || 0) + 1;
    }

    res.json({
      entities: entityCounts,
      relations: relationCounts,
      total_entities: (entities || []).length,
      total_relations: (relations || []).length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// GET /dedup — List pending dedup candidates
// ═══════════════════════════════════════════════════════
router.get('/dedup', async (req, res) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const { data, error } = await supabase
      .from('kg_dedup_candidates')
      .select(`
        *,
        entity_a:entity_a_id(id, external_id, name, entity_type),
        entity_b:entity_b_id(id, external_id, name, entity_type)
      `)
      .eq('status', status)
      .order('name_similarity', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// POST /merge — Merge source entity into target
// ═══════════════════════════════════════════════════════
router.post('/merge', async (req, res) => {
  try {
    const { target_id, source_id } = req.body;
    if (!target_id || !source_id) {
      return res.status(400).json({ error: 'target_id and source_id required' });
    }
    const success = await mergeEntities(target_id, source_id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
