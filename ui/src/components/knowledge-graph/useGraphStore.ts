// Knowledge Graph Zustand Store — Selection, highlights, filters, depth, fullscreen

import { create } from "zustand";
import type { EntityType } from "@/api/kg-types";

interface GraphState {
  // Selection
  selectedEntityId: string | null;
  hoveredEntityId: string | null;

  // Highlights (connected entity IDs at each depth)
  highlightedIds: Map<string, number>; // entityId → depth

  // Filters
  activeFilters: Set<EntityType>;
  searchQuery: string;
  maxDepth: number;

  // UI
  isFullscreen: boolean;
  showLabels: boolean;
  showStats: boolean;

  // Actions
  selectEntity: (id: string | null) => void;
  hoverEntity: (id: string | null) => void;
  setHighlights: (highlights: Map<string, number>) => void;
  toggleFilter: (type: EntityType) => void;
  setAllFilters: (types: EntityType[]) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setMaxDepth: (depth: number) => void;
  toggleFullscreen: () => void;
  toggleLabels: () => void;
  toggleStats: () => void;
  reset: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  selectedEntityId: null,
  hoveredEntityId: null,
  highlightedIds: new Map(),
  activeFilters: new Set<EntityType>(),
  searchQuery: "",
  maxDepth: 2,
  isFullscreen: false,
  showLabels: true,
  showStats: true,

  selectEntity: (id) => set({ selectedEntityId: id }),
  hoverEntity: (id) => set({ hoveredEntityId: id }),
  setHighlights: (highlights) => set({ highlightedIds: highlights }),

  toggleFilter: (type) =>
    set((state) => {
      const next = new Set(state.activeFilters);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { activeFilters: next };
    }),

  setAllFilters: (types) => set({ activeFilters: new Set(types) }),
  clearFilters: () => set({ activeFilters: new Set() }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setMaxDepth: (depth) => set({ maxDepth: Math.min(Math.max(depth, 1), 3) }),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleStats: () => set((s) => ({ showStats: !s.showStats })),
  reset: () =>
    set({
      selectedEntityId: null,
      hoveredEntityId: null,
      highlightedIds: new Map(),
      activeFilters: new Set(),
      searchQuery: "",
      maxDepth: 2,
      isFullscreen: false,
      showLabels: true,
      showStats: true,
    }),
}));
