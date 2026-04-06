// Knowledge Graph Dedup — Auto-detect and merge duplicate entities
// Uses pg_trgm name similarity for dedup candidates

import { supabase } from './zalo-personal/supabase.js';

interface DedupScanResult {
  candidates_found: number;
  auto_merged: number;
}

/**
 * Scan all entities for potential duplicates using name similarity.
 * - similarity >= 0.95 AND same entity_type → auto-merge
 * - similarity >= 0.80 AND same entity_type → dedup candidate (pending review)
 */
export async function scanForDuplicates(): Promise<DedupScanResult> {
  const result: DedupScanResult = { candidates_found: 0, auto_merged: 0 };

  // Find pairs with high name similarity within same entity_type
  const { data: pairs, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT a.id AS a_id, b.id AS b_id,
             similarity(a.name, b.name) AS name_sim
      FROM kg_entities a
      JOIN kg_entities b ON a.entity_type = b.entity_type
        AND a.id < b.id
        AND similarity(a.name, b.name) >= 0.80
      WHERE NOT EXISTS (
        SELECT 1 FROM kg_dedup_candidates d
        WHERE (d.entity_a_id = a.id AND d.entity_b_id = b.id)
           OR (d.entity_a_id = b.id AND d.entity_b_id = a.id)
      )
      ORDER BY name_sim DESC
      LIMIT 100
    `,
  });

  if (error || !pairs) {
    // Fallback: use supabase-js to find duplicates manually
    console.warn('[KG Dedup] RPC exec_sql not available, using manual scan');
    return await manualDedupScan();
  }

  for (const pair of pairs as any[]) {
    if (pair.name_sim >= 0.95) {
      // Auto-merge: high confidence
      await mergeEntities(pair.a_id, pair.b_id);
      result.auto_merged++;
    } else {
      // Create dedup candidate for review
      await supabase.from('kg_dedup_candidates').insert({
        entity_a_id: pair.a_id,
        entity_b_id: pair.b_id,
        name_similarity: pair.name_sim,
        status: 'pending',
      });
      result.candidates_found++;
    }
  }

  console.log(
    `[KG Dedup] Scan done: ${result.candidates_found} candidates, ${result.auto_merged} auto-merged`,
  );
  return result;
}

async function manualDedupScan(): Promise<DedupScanResult> {
  const result: DedupScanResult = { candidates_found: 0, auto_merged: 0 };

  // Load all entities grouped by type, compare names in JS
  const { data: entities } = await supabase
    .from('kg_entities')
    .select('id, name, entity_type')
    .order('entity_type');

  if (!entities) return result;

  const byType = new Map<string, typeof entities>();
  for (const e of entities) {
    const arr = byType.get(e.entity_type) || [];
    arr.push(e);
    byType.set(e.entity_type, arr);
  }

  for (const [, group] of byType) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const sim = jaroWinkler(group[i].name.toLowerCase(), group[j].name.toLowerCase());
        if (sim >= 0.95) {
          await mergeEntities(group[i].id, group[j].id);
          result.auto_merged++;
        } else if (sim >= 0.80) {
          await supabase.from('kg_dedup_candidates').insert({
            entity_a_id: group[i].id,
            entity_b_id: group[j].id,
            name_similarity: sim,
            status: 'pending',
          });
          result.candidates_found++;
        }
      }
    }
  }

  return result;
}

/**
 * Merge source entity into target:
 * 1. Re-point all relations from source → target
 * 2. Delete duplicate relations
 * 3. Delete source entity
 */
export async function mergeEntities(targetId: string, sourceId: string): Promise<boolean> {
  // Re-point source relations to target
  await supabase
    .from('kg_relations')
    .update({ source_entity_id: targetId })
    .eq('source_entity_id', sourceId);

  await supabase
    .from('kg_relations')
    .update({ target_entity_id: targetId })
    .eq('target_entity_id', sourceId);

  // Delete self-referencing relations (from merge)
  await supabase
    .from('kg_relations')
    .delete()
    .eq('source_entity_id', targetId)
    .eq('target_entity_id', targetId);

  // Delete the source entity (cascades remaining relations via FK)
  const { error } = await supabase
    .from('kg_entities')
    .delete()
    .eq('id', sourceId);

  if (error) {
    console.warn('[KG Dedup] Merge failed:', error.message);
    return false;
  }

  // Update dedup candidates
  await supabase
    .from('kg_dedup_candidates')
    .update({ status: 'merged' })
    .or(`entity_a_id.eq.${sourceId},entity_b_id.eq.${sourceId}`);

  return true;
}

// Simple Jaro-Winkler similarity (JS fallback when pg_trgm RPC unavailable)
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchWindow = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}
