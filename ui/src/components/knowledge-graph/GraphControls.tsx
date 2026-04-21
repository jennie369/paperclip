// Graph Controls — Search, type filter, depth toggle, zoom, fullscreen, stats

import { Search, Maximize2, Minimize2, Eye, EyeOff, BarChart3 } from "lucide-react";
import { ENTITY_TYPES } from "@/lib/kg-config";
import { useGraphStore } from "./useGraphStore";
import type { EntityType, KGStats } from "@/api/kg-types";

interface GraphControlsProps {
  stats: KGStats | undefined;
  visibleCount: number;
  onRefresh: () => void;
  onSeed: () => void;
  seeding: boolean;
}

const ALL_TYPES = Object.keys(ENTITY_TYPES) as EntityType[];

export default function GraphControls({
  stats,
  visibleCount,
  onRefresh,
  onSeed,
  seeding,
}: GraphControlsProps) {
  const {
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    maxDepth,
    setMaxDepth,
    isFullscreen,
    toggleFullscreen,
    showLabels,
    toggleLabels,
    showStats,
    toggleStats,
  } = useGraphStore();

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]" title="Tìm kiếm theo Tên và Mô tả của Thực thể">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm thực thể..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            title="Nhập chuỗi tìm kiếm..."
          />
        </div>

        {/* Depth toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          {[1, 2, 3].map((d) => (
            <button
              key={d}
              onClick={() => setMaxDepth(d)}
              title={`Lọc đến ${d} node liên kết xung quanh`}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                maxDepth === d
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d} hop
            </button>
          ))}
        </div>

        {/* Toggle buttons */}
        <button
          onClick={toggleLabels}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground"
          title={showLabels ? "Ẩn nhãn" : "Hiện nhãn"}
        >
          {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={toggleStats}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground"
          title={showStats ? "Ẩn thống kê" : "Hiện thống kê"}
        >
          <BarChart3 className="w-4 h-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground"
          title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Seed button */}
        <button
          onClick={onSeed}
          disabled={seeding}
          className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded hover:bg-primary/20 disabled:opacity-50"
          title="Tạo lại các liên kết mặc định và seed Graph dữ liệu hệ thống"
        >
          {seeding ? "Đang seed..." : "Seed dữ liệu"}
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded hover:bg-muted/80"
          title="Tải lại toàn bộ dữ liệu 3D Graphic Canvas từ đầu"
        >
          Làm mới
        </button>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_TYPES.map((type) => {
          const config = ENTITY_TYPES[type];
          const isActive = activeFilters.size === 0 || activeFilters.has(type);
          const count = stats?.entities[type] || 0;

          return (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              title={`Bật/Tắt hiển thị cho Loại: ${config.label}`}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? `${config.bgClass || ""} ${config.textClass || ""} ring-1 ring-border`
                  : `opacity-40 hover:opacity-70 ${config.textClass || ""} bg-transparent`
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${config.bgClass?.replace('/20', '') || ""}`}
              />
              {config.label}
              <span className="text-muted-foreground">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Stats bar */}
      {showStats && stats && (
        <div className="text-xs text-muted-foreground flex items-center gap-3">
          <span>{stats.total_entities} thực thể</span>
          <span>·</span>
          <span>{stats.total_relations} quan hệ</span>
          <span>·</span>
          <span>Hiện {visibleCount} nodes</span>
          <span>·</span>
          <span>Depth: {maxDepth}</span>
        </div>
      )}
    </div>
  );
}
