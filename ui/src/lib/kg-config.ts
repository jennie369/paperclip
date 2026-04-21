// Knowledge Graph Config — Entity types, colors, mass, relation types
// Used by ForceGraph3D and all KG components

import type { EntityType, RelationType } from "@/api/kg-types";

export interface EntityTypeConfig {
  color: string;
  textClass?: string;
  bgClass?: string;
  mass: number;
  icon: string;
  label: string;
  tooltip: string;
}

export interface RelationTypeConfig {
  label: string;
  color: string;
  bgClass?: string;
  dashed: boolean;
}

export const ENTITY_TYPES: Record<EntityType, EntityTypeConfig> = {
  person: {
    color: "#F59E0B",
    textClass: "text-[#F59E0B]",
    bgClass: "bg-[#F59E0B]/20",
    mass: 1.0,
    icon: "👤",
    label: "Người",
    tooltip: "Khách hàng, nhân viên, KOL",
  },
  agent: {
    color: "#8B5CF6",
    textClass: "text-[#8B5CF6]",
    bgClass: "bg-[#8B5CF6]/20",
    mass: 1.5,
    icon: "🤖",
    label: "Agent",
    tooltip: "Paperclip AI Agents",
  },
  sop: {
    color: "#10B981",
    textClass: "text-[#10B981]",
    bgClass: "bg-[#10B981]/20",
    mass: 1.0,
    icon: "📋",
    label: "SOP",
    tooltip: "Quy trình vận hành chuẩn",
  },
  task: {
    color: "#EF4444",
    textClass: "text-[#EF4444]",
    bgClass: "bg-[#EF4444]/20",
    mass: 0.8,
    icon: "✅",
    label: "Task",
    tooltip: "Issues, heartbeat tasks",
  },
  product: {
    color: "#EC4899",
    textClass: "text-[#EC4899]",
    bgClass: "bg-[#EC4899]/20",
    mass: 1.2,
    icon: "📦",
    label: "Sản phẩm",
    tooltip: "Khóa học, crystal, app features",
  },
  customer: {
    color: "#F97316",
    textClass: "text-[#F97316]",
    bgClass: "bg-[#F97316]/20",
    mass: 1.0,
    icon: "💎",
    label: "Khách hàng",
    tooltip: "CRM contacts",
  },
  channel: {
    color: "#06B6D4",
    textClass: "text-[#06B6D4]",
    bgClass: "bg-[#06B6D4]/20",
    mass: 1.3,
    icon: "📡",
    label: "Kênh",
    tooltip: "Zalo, FB, YouTube, Telegram",
  },
  event: {
    color: "#F43F5E",
    textClass: "text-[#F43F5E]",
    bgClass: "bg-[#F43F5E]/20",
    mass: 0.7,
    icon: "📅",
    label: "Sự kiện",
    tooltip: "Meetings, deadlines, launches",
  },
  concept: {
    color: "#6366F1",
    textClass: "text-[#6366F1]",
    bgClass: "bg-[#6366F1]/20",
    mass: 1.4,
    icon: "💡",
    label: "Khái niệm",
    tooltip: "Trading, spiritual, GEM method",
  },
  organization: {
    color: "#0EA5E9",
    textClass: "text-[#0EA5E9]",
    bgClass: "bg-[#0EA5E9]/20",
    mass: 1.6,
    icon: "🏢",
    label: "Tổ chức",
    tooltip: "Gemral, YinYang Masters, partners",
  },
  // ────────────────────────────────────────────
  // Graphify code/knowledge graph entities
  // (used by the Graphify tab in KnowledgeGraphPage)
  // ────────────────────────────────────────────
  code_module: {
    color: "#3B82F6",
    textClass: "text-[#3B82F6]",
    bgClass: "bg-[#3B82F6]/20",
    mass: 1.8,
    icon: "📄",
    label: "File / Module",
    tooltip: "Source file from graphify",
  },
  code_class: {
    color: "#F97316",
    textClass: "text-[#F97316]",
    bgClass: "bg-[#F97316]/20",
    mass: 1.5,
    icon: "🏛️",
    label: "Class",
    tooltip: "Class declaration",
  },
  code_function: {
    color: "#22D3EE",
    textClass: "text-[#22D3EE]",
    bgClass: "bg-[#22D3EE]/20",
    mass: 0.9,
    icon: "⚙️",
    label: "Function",
    tooltip: "Function or method",
  },
  code_concept: {
    color: "#A78BFA",
    textClass: "text-[#A78BFA]",
    bgClass: "bg-[#A78BFA]/20",
    mass: 1.1,
    icon: "💡",
    label: "Concept",
    tooltip: "Abstract concept extracted from docs",
  },
  code_doc: {
    color: "#84CC16",
    textClass: "text-[#84CC16]",
    bgClass: "bg-[#84CC16]/20",
    mass: 1.0,
    icon: "📝",
    label: "Doc",
    tooltip: "Markdown / documentation file",
  },
};

export const RELATION_TYPES: Record<string, RelationTypeConfig> = {
  works_on: { label: "Làm việc trên", color: "#6B7280", bgClass: "bg-[#6B7280]", dashed: false },
  manages: { label: "Quản lý", color: "#8B5CF6", bgClass: "bg-[#8B5CF6]", dashed: false },
  assigned_to: { label: "Phân công cho", color: "#10B981", bgClass: "bg-[#10B981]", dashed: false },
  created: { label: "Tạo bởi", color: "#6B7280", bgClass: "bg-[#6B7280]", dashed: true },
  belongs_to: { label: "Thuộc về", color: "#3B82F6", bgClass: "bg-[#3B82F6]", dashed: false },
  part_of: { label: "Một phần của", color: "#3B82F6", bgClass: "bg-[#3B82F6]", dashed: true },
  depends_on: { label: "Phụ thuộc vào", color: "#EF4444", bgClass: "bg-[#EF4444]", dashed: false },
  outputs_to: { label: "Đầu ra cho", color: "#F59E0B", bgClass: "bg-[#F59E0B]", dashed: false },
  interested_in: { label: "Quan tâm", color: "#EC4899", bgClass: "bg-[#EC4899]", dashed: true },
  purchased: { label: "Đã mua", color: "#10B981", bgClass: "bg-[#10B981]", dashed: false },
  completed: { label: "Hoàn thành", color: "#22C55E", bgClass: "bg-[#22C55E]", dashed: false },
  scheduled_for: { label: "Lên lịch cho", color: "#F97316", bgClass: "bg-[#F97316]", dashed: true },
  located_in: { label: "Ở tại", color: "#6B7280", bgClass: "bg-[#6B7280]", dashed: true },
  active_on: { label: "Hoạt động trên", color: "#06B6D4", bgClass: "bg-[#06B6D4]", dashed: false },
  handles: { label: "Xử lý", color: "#8B5CF6", bgClass: "bg-[#8B5CF6]", dashed: false },
  responds_to: { label: "Phản hồi", color: "#8B5CF6", bgClass: "bg-[#8B5CF6]", dashed: true },
  executes: { label: "Thực thi", color: "#EF4444", bgClass: "bg-[#EF4444]", dashed: false },
  monitors: { label: "Giám sát", color: "#F59E0B", bgClass: "bg-[#F59E0B]", dashed: true },
  asked_about: { label: "Hỏi về", color: "#EC4899", bgClass: "bg-[#EC4899]", dashed: true },
  related_to: { label: "Liên quan", color: "#9CA3AF", bgClass: "bg-[#9CA3AF]", dashed: true },
  // Graphify code/knowledge relations
  contains:      { label: "Contains",   color: "#60A5FA", bgClass: "bg-[#60A5FA]", dashed: false },
  calls:         { label: "Calls",      color: "#22D3EE", bgClass: "bg-[#22D3EE]", dashed: false },
  imports:       { label: "Imports",    color: "#A78BFA", bgClass: "bg-[#A78BFA]", dashed: false },
  extends:       { label: "Extends",    color: "#F97316", bgClass: "bg-[#F97316]", dashed: false },
  implements:    { label: "Implements", color: "#FB923C", bgClass: "bg-[#FB923C]", dashed: true },
  references:    { label: "References", color: "#9CA3AF", bgClass: "bg-[#9CA3AF]", dashed: true },
  inferred_link: { label: "Inferred",   color: "#6B7280", bgClass: "bg-[#6B7280]", dashed: true },
};

// Adaptive force params based on node count (GoClaw v2.47.3 standard — compact layout)
export function getForceParams(nodeCount: number) {
  if (nodeCount < 30) {
    // Very tight — nodes cluster like reference image
    return { charge: -30, linkDistance: 20, centerStrength: 0.5, collideRadius: 8 };
  }
  if (nodeCount <= 60) {
    return { charge: -40, linkDistance: 28, centerStrength: 0.4, collideRadius: 10 };
  }
  // Large graph — stay compact
  return { charge: -50, linkDistance: 35, centerStrength: 0.3, collideRadius: 12 };
}

// Tick cap: log(n) * 30
export function getTickCap(nodeCount: number): number {
  return Math.ceil(Math.log(Math.max(nodeCount, 2)) * 30);
}

// Depth-based opacity for visualization
export function getDepthOpacity(depth: number): number {
  switch (depth) {
    case 0: return 1.0;   // selected
    case 1: return 1.0;   // 1-hop
    case 2: return 0.8;   // 2-hop
    case 3: return 0.6;   // 3-hop
    default: return 0.4;  // unconnected
  }
}

// Entity Mass scaling
export function getEntityMass(type: string): number {
  switch (type) {
    case "organization": return 8;
    case "project": return 6;
    case "person": return 4;
    case "task": return 3;
    default: return 2;
  }
}

// Edge styles
export const EDGE_DEFAULT = { color: "#374151", opacity: 0.3, width: 1 };
export const EDGE_HIGHLIGHT = { color: "#FFBD59", opacity: 1.0, width: 2.5 };

