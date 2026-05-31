import { useState, useCallback, useEffect } from "react";
import { type DragEndEvent, type DragOverEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

export const DEFAULT_STATIC_ITEMS: Record<string, string[]> = {
  "kenh-chat": [
    "/inbox",
    "/channels/inbox",
    "/channels/settings",
    "/war-room",
    "/training",
    "/training/history",
    "/training/audit-log",
    "/agents-config/sessions",
  ],
  "van-hanh": [
    "/ops/content-pipeline",
    "/ops/sop-engine",
    "/ops/affiliate",
    "/ops/scanner",
    "/ops/knowledge-graph",
    "/analytics",
  ],
  "trung-tam-noi-dung": [
    "/cc",
    "/cc/ai-gen",
    "/cc/scripts",
    "/cc/calendar",
    "/cc/repurpose",
    "/cc/analytics",
    "/cc/image-gen",
    "/cc/video-reels",
    "/cc/email",
    "/cc/funnels",
    "/cc/settings",
  ],
  "cau-hinh": ["/ops/sop-registry", "/agents/all", "/agents-config", "/config"],
  "crm": [
    "/crm",
    "/crm/customers",
    "/crm/tickets",
    "/crm/orders",
    "/crm/campaigns",
    "/crm/knowledge-base",
    "/crm-messaging",
  ],
  "work": [
    "/timetable",
    "/issues",
    "/delegations",
    "/routines",
    "/goals",
    "/workflows",
    "/channels/qa",
    "/ops/console",
  ],
  "company": ["/org", "/skills", "/costs", "/activity"],
};

export function useSidebarStaticItems(companyConfig?: any) {
  const [items, setItems] = useState<Record<string, string[]>>(() => {
    if (companyConfig?.items) {
      return companyConfig.items;
    }
    const saved = localStorage.getItem("sidebar-static-items-v1");
    if (saved) {
      try {
        const parsed: Record<string, string[]> = JSON.parse(saved);
        const allParsedItems = new Set<string>();
        Object.values(parsed).forEach((arr) => {
          if (Array.isArray(arr)) arr.forEach((val) => allParsedItems.add(val));
        });

        // Ensure all default keys exist, and append new default items that don't exist anywhere
        const merged: Record<string, string[]> = { ...DEFAULT_STATIC_ITEMS, ...parsed };
        for (const [key, defaultArr] of Object.entries(DEFAULT_STATIC_ITEMS)) {
          if (!merged[key]) merged[key] = [];
          defaultArr.forEach((defaultItem) => {
            if (!allParsedItems.has(defaultItem)) {
              merged[key].push(defaultItem);
            }
          });
        }
        return merged;
      } catch (e) {}
    }
    return DEFAULT_STATIC_ITEMS;
  });

  // Keep local storage synced for fallback
  useEffect(() => {
    localStorage.setItem("sidebar-static-items-v1", JSON.stringify(items));
  }, [items]);

  // If company config changes (e.g. switching companies), update items
  useEffect(() => {
    if (companyConfig?.items) {
      setItems(companyConfig.items);
    }
  }, [companyConfig?.items]);

  const DEFAULT_SECTION_ORDER = [
    "kenh-chat",
    "van-hanh",
    "trung-tam-noi-dung",
    "cau-hinh",
    "crm",
    "work",
    "company",
    "projects",
    "agents"
  ];

  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    if (companyConfig?.sectionOrder) {
      return companyConfig.sectionOrder;
    }
    const saved = localStorage.getItem("sidebar-static-sections-v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...parsed];
          for (const s of DEFAULT_SECTION_ORDER) {
            if (!merged.includes(s)) merged.push(s);
          }
          return merged;
        }
      } catch (e) {}
    }
    return DEFAULT_SECTION_ORDER;
  });

  useEffect(() => {
    localStorage.setItem("sidebar-static-sections-v1", JSON.stringify(sectionOrder));
  }, [sectionOrder]);

  useEffect(() => {
    if (companyConfig?.sectionOrder) {
      setSectionOrder(companyConfig.sectionOrder);
    }
  }, [companyConfig?.sectionOrder]);

  const [sectionLabels, setSectionLabels] = useState<Record<string, string>>(() => {
    if (companyConfig?.sectionLabels) {
      return companyConfig.sectionLabels;
    }
    const saved = localStorage.getItem("sidebar-static-labels-v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem("sidebar-static-labels-v1", JSON.stringify(sectionLabels));
  }, [sectionLabels]);

  useEffect(() => {
    if (companyConfig?.sectionLabels) {
      setSectionLabels(companyConfig.sectionLabels);
    }
  }, [companyConfig?.sectionLabels]);

  const findContainer = (id: string) => {
    if (id in items) return id;
    return Object.keys(items).find((key) => items[key].includes(id));
  };

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);

      // Are we dragging a section?
      if (sectionOrder.includes(activeId)) return;

      const activeContainer = findContainer(activeId);
      const overContainer = findContainer(overId);

      if (!activeContainer || !overContainer || activeContainer === overContainer) {
        return;
      }

      setItems((prev) => {
        const activeItems = prev[activeContainer];
        const overItems = prev[overContainer];
        const activeIndex = activeItems.indexOf(activeId);
        const overIndex = overItems.indexOf(overId);

        let newIndex;
        if (overId in prev) {
          // Dropping directly over a container
          newIndex = overItems.length + 1;
        } else {
          // Dropping over another item
          const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top > over.rect.top + over.rect.height;

          const modifier = isBelowOverItem ? 1 : 0;
          newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
        }

        return {
          ...prev,
          [activeContainer]: prev[activeContainer].filter((item) => item !== activeId),
          [overContainer]: [
            ...prev[overContainer].slice(0, newIndex),
            activeItems[activeIndex],
            ...prev[overContainer].slice(newIndex, prev[overContainer].length),
          ],
        };
      });
    },
    [items, sectionOrder]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      // Handling section reorder
      if (sectionOrder.includes(activeId) && sectionOrder.includes(overId)) {
        setSectionOrder((prev) => {
          const oldIdx = prev.indexOf(activeId);
          const newIdx = prev.indexOf(overId);
          if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
            return arrayMove(prev, oldIdx, newIdx);
          }
          return prev;
        });
        return;
      }

      const activeContainer = findContainer(activeId);
      const overContainer = findContainer(overId);

      if (!activeContainer || !overContainer || activeContainer !== overContainer) {
        return;
      }

      const activeIndex = items[activeContainer].indexOf(activeId);
      const overIndex = items[overContainer].indexOf(overId);

      if (activeIndex !== overIndex) {
        setItems((items) => ({
          ...items,
          [overContainer]: arrayMove(items[overContainer], activeIndex, overIndex),
        }));
      }
    },
    [items, sectionOrder]
  );

  return {
    items,
    sectionOrder,
    sectionLabels,
    setSectionLabels,
    handleDragOver,
    handleDragEnd,
  };
}
