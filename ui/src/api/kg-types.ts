// Knowledge Graph Frontend Types — shared with API client

export type EntityType =
  | "person"
  | "agent"
  | "sop"
  | "task"
  | "product"
  | "customer"
  | "channel"
  | "event"
  | "concept"
  | "organization"
  // Graphify code/knowledge graph entities
  | "code_module"
  | "code_class"
  | "code_function"
  | "code_concept"
  | "code_doc";

export type RelationType =
  | "works_on"
  | "manages"
  | "assigned_to"
  | "created"
  | "belongs_to"
  | "part_of"
  | "depends_on"
  | "outputs_to"
  | "interested_in"
  | "purchased"
  | "completed"
  | "scheduled_for"
  | "located_in"
  | "active_on"
  | "handles"
  | "responds_to"
  | "executes"
  | "monitors"
  | "asked_about"
  | "related_to"
  // Graphify code/knowledge relations
  | "contains"
  | "calls"
  | "imports"
  | "extends"
  | "implements"
  | "references"
  | "inferred_link";

export interface KGEntity {
  id: string;
  external_id: string;
  entity_type: EntityType;
  name: string;
  description: string | null;
  metadata: Record<string, unknown>;
  confidence: number;
  source: string;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface KGRelation {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: RelationType;
  confidence: number;
  metadata: Record<string, unknown>;
  source: string;
  created_at: string;
}

export interface KGGraphData {
  entities: KGEntity[];
  relations: KGRelation[];
}

export interface KGStats {
  entities: Record<string, number>;
  relations: Record<string, number>;
  total_entities: number;
  total_relations: number;
}

export interface KGDedupCandidate {
  id: string;
  entity_a_id: string;
  entity_b_id: string;
  entity_a?: KGEntity;
  entity_b?: KGEntity;
  vector_similarity: number | null;
  name_similarity: number | null;
  status: "pending" | "merged" | "rejected";
  created_at: string;
}

export interface KGExtractionResult {
  entities: Array<{
    external_id: string;
    entity_type: string;
    name: string;
    description?: string;
    confidence: number;
  }>;
  relations: Array<{
    source: string;
    target: string;
    relation_type: string;
    confidence: number;
  }>;
}
