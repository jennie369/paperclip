// Knowledge Graph Config — Entity types, colors, mass, relation types
// Used by ForceGraph3D and all KG components

import type { EntityType, RelationType } from "@/api/kg-types";

export interface EntityTypeConfig {
  color: string;
  mass: number;
  icon: string;
  label: string;
  tooltip: string;
}

export interface RelationTypeConfig {
  label: string;
  color: string;
  dashed: boolean;
}

export const ENTITY_TYPES: Record<EntityType, EntityTypeConfig> = {
  person: {
    color: "#F59E0B",
    mass: 1.0,
    icon: "👤",
    label: "Người",
    tooltip: "Khách hàng, nhân viên, KOL",
  },
  agent: {
    color: "#8B5CF6",
    mass: 1.5,
    icon: "🤖",
    label: "Agent",
    tooltip: "Paperclip AI Agents",
  },
  sop: {
    color: "#10B981",
    mass: 1.0,
    icon: "📋",
    label: "SOP",
    tooltip: "Quy trình vận hành chuẩn",
  },
  task: {
    color: "#EF4444",
    mass: 0.8,
    icon: "✅",
    label: "Task",
    tooltip: "Issues, heartbeat tasks",
  },
  product: {
    color: "#EC4899",
    mass: 1.2,
    icon: "📦",
    label: "Sản phẩm",
    tooltip: "Khóa học, crystal, app features",
  },
  customer: {
    color: "#F97316",
    mass: 1.0,
    icon: "💎",
    label: "Khách hàng",
    tooltip: "CRM contacts",
  },
  channel: {
    color: "#06B6D4",
    mass: 1.3,
    icon: "📡",
    label: "Kênh",
    tooltip: "Zalo, FB, YouTube, Telegram",
  },
  event: {
    color: "#F43F5E",
    mass: 0.7,
    icon: "📅",
    label: "Sự kiện",
    tooltip: "Meetings, deadlines, launches",
  },
  concept: {
    color: "#6366F1",
    mass: 1.4,
    icon: "💡",
    label: "Khái niệm",
    tooltip: "Trading, spiritual, GEM method",
  },
  organization: {
    color: "#0EA5E9",
    mass: 1.6,
    icon: "🏢",
    label: "Tổ chức",
    tooltip: "Gemral, YinYang Masters, partners",
  },
};

export const RELATION_TYPES: Record<string, RelationTypeConfig> = {
  works_on: { label: "Làm việc trên", color: "#6B7280", dashed: false },
  manages: { label: "Quản lý", color: "#8B5CF6", dashed: false },
  assigned_to: { label: "Phân công cho", color: "#10B981", dashed: false },
  created: { label: "Tạo bởi", color: "#6B7280", dashed: true },
  belongs_to: { label: "Thuộc về", color: "#3B82F6", dashed: false },
  part_of: { label: "Một phần của", color: "#3B82F6", dashed: true },
  depends_on: { label: "Phụ thuộc vào", color: "#EF4444", dashed: false },
  outputs_to: { label: "Đầu ra cho", color: "#F59E0B", dashed: false },
  interested_in: { label: "Quan tâm", color: "#EC4899", dashed: true },
  purchased: { label: "Đã mua", color: "#10B981", dashed: false },
  completed: { label: "Hoàn thành", color: "#22C55E", dashed: false },
  scheduled_for: { label: "Lên lịch cho", color: "#F97316", dashed: true },
  located_in: { label: "Ở tại", color: "#6B7280", dashed: true },
  active_on: { label: "Hoạt động trên", color: "#06B6D4", dashed: false },
  handles: { label: "Xử lý", color: "#8B5CF6", dashed: false },
  responds_to: { label: "Phản hồi", color: "#8B5CF6", dashed: true },
  executes: { label: "Thực thi", color: "#EF4444", dashed: false },
  monitors: { label: "Giám sát", color: "#F59E0B", dashed: true },
  asked_about: { label: "Hỏi về", color: "#EC4899", dashed: true },
  related_to: { label: "Liên quan", color: "#9CA3AF", dashed: true },
};

// Adaptive force params based on node count
export function getForceParams(nodeCount: number) {
  if (nodeCount < 30) {
    return { charge: -120, linkDistance: 60, centerStrength: 0.05, collideRadius: 15 };
  }
  if (nodeCount < 60) {
    return { charge: -80, linkDistance: 80, centerStrength: 0.03, collideRadius: 12 };
  }
  return { charge: -50, linkDistance: 100, centerStrength: 0.02, collideRadius: 10 };
}

// Tick cap: log(n) * 30
export function getTickCap(nodeCount: number): number {
  return Math.ceil(Math.log(Math.max(nodeCount, 2)) * 30);
}

// Depth-based opacity for visualization
export function getDepthOpacity(depth: number): number {
  switch (depth) {
    case 0: return 1.0;   // selected
    case 1: return 1.0;   // 1-hop: bright
    case 2: return 0.6;   // 2-hop
    case 3: return 0.3;   // 3-hop
    default: return 0.1;  // unconnected
  }
}

// Edge styles
export const EDGE_DEFAULT = { color: "#374151", opacity: 0.3, width: 1 };
export const EDGE_HIGHLIGHT = { color: "#FFBD59", opacity: 1.0, width: 2.5 };
