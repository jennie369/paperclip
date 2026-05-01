const fs = require('fs');

let code = fs.readFileSync('ui/src/components/Sidebar.tsx', 'utf8');

// 1. In Sidebar.tsx, rewrite StaticSectionWrapper to use SidebarSection and SortableSectionWrapper.
const oldStaticSectionWrapper = /function StaticSectionWrapper\(\{ sectionId, label, items, itemComponents[\s\S]*?\}\)/;

const newStaticSectionWrapper = `function StaticSectionWrapper({ sectionId, label, items, itemComponents }: { sectionId: string, label: string, items: string[], itemComponents: Record<string, React.ReactNode> }) {
  return (
    <SortableSectionWrapper id={sectionId}>
      <SidebarSection label={label}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-0.5 min-h-[10px]">
            {items.map(itemId => itemComponents[itemId] ? (
              <SortableStaticItem key={itemId} id={itemId}>
                {itemComponents[itemId]}
              </SortableStaticItem>
            ) : null)}
          </div>
        </SortableContext>
      </SidebarSection>
    </SortableSectionWrapper>
  );
}`;

code = code.replace(oldStaticSectionWrapper, newStaticSectionWrapper);

// 2. Wrap SidebarProjects and SidebarAgents with SortableSectionWrapper in the mapped rendering
const oldSectionMap = `if (sectionId === "projects") return <SidebarProjects key={sectionId} />;\n                if (sectionId === "agents") return <SidebarAgents key={sectionId} />;\n                \n                return (\n                  <StaticSectionWrapper \n                    key={sectionId}\n                    sectionId={sectionId} \n                    label={SECTION_LABELS[sectionId]} \n                    items={staticItems[sectionId] || []} \n                    itemComponents={ITEM_COMPONENTS} \n                  />\n                );`;

const newSectionMap = `if (sectionId === "projects") return <SortableSectionWrapper key={sectionId} id={sectionId}><SidebarProjects /></SortableSectionWrapper>;\n                if (sectionId === "agents") return <SortableSectionWrapper key={sectionId} id={sectionId}><SidebarAgents /></SortableSectionWrapper>;\n                \n                return (\n                  <StaticSectionWrapper \n                    key={sectionId}\n                    sectionId={sectionId} \n                    label={SECTION_LABELS[sectionId]} \n                    items={staticItems[sectionId] || []} \n                    itemComponents={ITEM_COMPONENTS} \n                  />\n                );`;

code = code.replace(oldSectionMap, newSectionMap);

// 3. Add handleUniversalDragEnd and handleUniversalDragOver 
const oldHandleDragEnd = `const handleDragEndSections = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setSectionOrder((prev) => {
        const oldIdx = prev.indexOf(String(active.id));
        const newIdx = prev.indexOf(String(over.id));
        if (oldIdx === -1 || newIdx === -1) return prev;
        return arrayMove(prev, oldIdx, newIdx);
      });
    },
    [setSectionOrder]
  );`;

const newHandleDragEnd = `${oldHandleDragEnd}

  const handleUniversalDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      if (typeof active.id === 'string' && active.id.startsWith('/')) {
        handleDragEndStatic(event);
      } else {
        handleDragEndSections(event);
      }
    },
    [handleDragEndSections, handleDragEndStatic]
  );

  const handleUniversalDragOver = useCallback(
    (event: DragEndEvent) => {
      const { active } = event;
      if (typeof active.id === 'string' && active.id.startsWith('/')) {
        handleDragOverStatic(event);
      }
    },
    [handleDragOverStatic]
  );`;

code = code.replace(oldHandleDragEnd, newHandleDragEnd);

// 4. Consolidate DndContexts
const oldDndStart = `<DndContext id="items-context" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndStatic} onDragOver={handleDragOverStatic}>
          <DndContext id="sections-context" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSections}>`;

const newDndStart = `<DndContext id="universal-context" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleUniversalDragEnd} onDragOver={handleUniversalDragOver}>`;

const oldDndEnd = `</DndContext>
        </DndContext>`;

const newDndEnd = `</DndContext>`;

code = code.replace(oldDndStart, newDndStart);
code = code.replace(oldDndEnd, newDndEnd);

fs.writeFileSync('ui/src/components/Sidebar.tsx', code);
console.log("Done");
