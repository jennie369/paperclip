// SortableTabBar — horizontal drag-drop tab bar with localStorage persistence.
// Used by Registry Marketplace subtabs and any other horizontal tab bar.
// Pattern mirrors DraggableSidebarSection but uses horizontalListSortingStrategy.

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface TabDef {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  tooltip?: string;
}

interface SortableTabBarProps {
  /** Unique key for localStorage (e.g. 'registry-subtabs') */
  storageKey: string;
  tabs: TabDef[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** Optional tooltip wrapper component */
  tipComponent?: React.ComponentType<{ text: string; children: React.ReactNode }>;
}

function loadOrder(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(`tab-order:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveOrder(key: string, order: string[]): void {
  try {
    localStorage.setItem(`tab-order:${key}`, JSON.stringify(order));
  } catch { /* ignore */ }
}

function mergeOrder(saved: string[] | null, current: string[]): string[] {
  if (!saved) return current;
  const currentSet = new Set(current);
  const result: string[] = [];
  for (const id of saved) if (currentSet.has(id)) result.push(id);
  for (const id of current) if (!saved.includes(id)) result.push(id);
  return result;
}

function SortableTab({
  tab,
  isActive,
  onClick,
  tipComponent: Tip,
}: {
  tab: TabDef;
  isActive: boolean;
  onClick: () => void;
  tipComponent?: React.ComponentType<{ text: string; children: React.ReactNode }>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const Icon = tab.icon;
  const btn = (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors cursor-grab active:cursor-grabbing ${
        isActive
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      }`}
    >
      {Icon && <Icon className="size-3.5" />}
      <span>{tab.label}</span>
    </button>
  );

  if (Tip && tab.tooltip) {
    return <Tip text={tab.tooltip}>{btn}</Tip>;
  }
  return btn;
}

export function SortableTabBar({ storageKey, tabs, activeTab, onTabChange, tipComponent }: SortableTabBarProps) {
  const defaultIds = tabs.map((t) => t.id);

  const [order, setOrder] = useState<string[]>(() => mergeOrder(loadOrder(storageKey), defaultIds));

  // Re-sync when tabs change (new tabs added/removed)
  useEffect(() => {
    setOrder((prev) => mergeOrder(prev, defaultIds));
  }, [defaultIds.join(',')]);

  useEffect(() => {
    saveOrder(storageKey, order);
  }, [storageKey, order]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setOrder((prev) => {
        const oldIdx = prev.indexOf(String(active.id));
        const newIdx = prev.indexOf(String(over.id));
        if (oldIdx === -1 || newIdx === -1) return prev;
        return arrayMove(prev, oldIdx, newIdx);
      });
    },
    [],
  );

  const tabMap = new Map(tabs.map((t) => [t.id, t]));
  const sortedTabs = order.map((id) => tabMap.get(id)).filter(Boolean) as TabDef[];

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={horizontalListSortingStrategy}>
        <div className="flex items-center gap-0.5 border-b border-border overflow-x-auto">
          {sortedTabs.map((tab) => (
            <SortableTab
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              tipComponent={tipComponent}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
