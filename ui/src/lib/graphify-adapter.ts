// Graphify → Paperclip Knowledge Graph adapter
//
// Converts the NetworkX node-link JSON produced by graphify
// (`graphify-out/graph.json`) into KGEntity[] / KGRelation[] that
// the existing Paperclip ForceGraph3D component can render directly.
//
// Graphify node shape:
//   { id, label, file_type, source_file, source_location, community }
// Graphify link shape:
//   { source, target, relation, confidence, weight, confidence_score,
//     source_file, source_location }

import type { KGEntity, KGRelation, EntityType, RelationType } from "@/api/kg-types";

export interface GraphifyNode {
  id: string;
  label: string;
  file_type?: string;       // 'code' | 'doc' | 'image' | 'paper'
  source_file?: string;
  source_location?: string;
  community?: number;
}

export interface GraphifyLink {
  source: string;
  target: string;
  relation?: string;
  confidence?: "EXTRACTED" | "INFERRED" | "AMBIGUOUS";
  confidence_score?: number;
  weight?: number;
  source_file?: string;
  source_location?: string;
}

export interface GraphifyJSON {
  directed?: boolean;
  multigraph?: boolean;
  graph?: Record<string, unknown>;
  nodes: GraphifyNode[];
  links: GraphifyLink[];
  hyperedges?: unknown[];
}

export interface GraphifyImportStats {
  total_entities: number;
  total_relations: number;
  communities: number;
  by_entity_type: Record<string, number>;
  by_relation: Record<string, number>;
  extracted_pct: number;
  inferred_pct: number;
}

// ──────────────────────────────────────────────────────────
// Heuristic classifier — same shape as App Phong Thủy
// ──────────────────────────────────────────────────────────
const CODE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|swift|c|cpp|h|hpp|cs|rb|php|lua|zig|scala|ps1|sh)$/i;
const DOC_EXT_RE  = /\.(md|mdx|rst|txt|adoc)$/i;
const FUNC_RE     = /\(\)$/;
const PASCAL_RE   = /^[A-Z][A-Za-z0-9_]*$/;

export function classifyGraphifyNode(node: GraphifyNode): EntityType {
  const label = node.label ?? node.id ?? "";
  const fileType = node.file_type ?? "";

  if (fileType === "doc" || fileType === "paper") return "code_doc";
  if (fileType === "image") return "code_concept";

  if (FUNC_RE.test(label)) return "code_function";
  if (DOC_EXT_RE.test(label)) return "code_doc";
  if (CODE_EXT_RE.test(label)) return "code_module";
  if (PASCAL_RE.test(label)) return "code_class";

  return "code_concept";
}

const RELATION_MAP: Record<string, RelationType> = {
  contains: "contains",
  calls: "calls",
  invokes: "calls",
  uses: "calls",
  imports: "imports",
  import: "imports",
  requires: "imports",
  extends: "extends",
  inherits: "extends",
  implements: "implements",
  references: "references",
  refers_to: "references",
  mentions: "references",
};

export function classifyGraphifyLink(link: GraphifyLink): RelationType {
  if (link.confidence === "INFERRED" || link.confidence === "AMBIGUOUS") {
    return "inferred_link";
  }
  const rel = (link.relation ?? "").toLowerCase().trim();
  return RELATION_MAP[rel] ?? "references";
}

// ──────────────────────────────────────────────────────────
// Main transform — produces Paperclip-shaped entities + relations
// ──────────────────────────────────────────────────────────
export function graphifyToPaperclip(
  raw: GraphifyJSON,
): { entities: KGEntity[]; relations: KGRelation[]; stats: GraphifyImportStats } {
  const entities: KGEntity[] = [];
  const relations: KGRelation[] = [];

  const byEntityType: Record<string, number> = {};
  const byRelation: Record<string, number> = {};
  const communitySet = new Set<number>();

  const now = new Date().toISOString();

  for (const n of raw.nodes ?? []) {
    const entity_type = classifyGraphifyNode(n);
    byEntityType[entity_type] = (byEntityType[entity_type] ?? 0) + 1;
    if (typeof n.community === "number") communitySet.add(n.community);

    entities.push({
      id: n.id,
      external_id: n.id,
      entity_type,
      name: n.label ?? n.id,
      description: n.source_file
        ? `${n.source_file}${n.source_location ? ":" + n.source_location : ""}`
        : null,
      metadata: {
        source_file: n.source_file,
        source_location: n.source_location,
        community: n.community,
        file_type: n.file_type,
      },
      confidence: 1.0,
      source: "graphify",
      source_ref: n.source_file ?? null,
      created_at: now,
      updated_at: now,
    });
  }

  let edgeId = 0;
  let extracted = 0;
  let inferred = 0;
  for (const l of raw.links ?? []) {
    const relation_type = classifyGraphifyLink(l);
    byRelation[relation_type] = (byRelation[relation_type] ?? 0) + 1;
    if (l.confidence === "EXTRACTED") extracted++;
    else if (l.confidence === "INFERRED" || l.confidence === "AMBIGUOUS") inferred++;

    relations.push({
      id: `gfy_r_${edgeId++}`,
      source_entity_id: String(l.source),
      target_entity_id: String(l.target),
      relation_type,
      confidence: l.confidence_score ?? (l.confidence === "EXTRACTED" ? 1.0 : 0.5),
      metadata: {
        raw_relation: l.relation,
        confidence_label: l.confidence,
        weight: l.weight,
        source_file: l.source_file,
        source_location: l.source_location,
      },
      source: "graphify",
      created_at: now,
    });
  }

  const totalRelations = relations.length || 1;
  const stats: GraphifyImportStats = {
    total_entities: entities.length,
    total_relations: relations.length,
    communities: communitySet.size,
    by_entity_type: byEntityType,
    by_relation: byRelation,
    extracted_pct: Math.round((extracted / totalRelations) * 100),
    inferred_pct: Math.round((inferred / totalRelations) * 100),
  };

  return { entities, relations, stats };
}
