import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { SidebarSection } from './SidebarSection';

interface DraggableSidebarSectionProps {
  sectionId: string;
  label: string;
  itemIds: string[];
  childrenMap: Record<string, React.ReactNode>;
  onLabelChange?: (newLabel: string) => void;
}

// Single sortable row wrapper.
function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative group/row">
      <button
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 cursor-grab active:cursor-grabbing z-10 p-0.5 transition-opacity"
        aria-label="Kéo để sắp xếp"
        title="Kéo để sắp xếp lại tab"
      >
        <GripVertical className="size-3 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}

export function DraggableSidebarSection({ sectionId, label, itemIds, childrenMap, onLabelChange }: DraggableSidebarSectionProps) {
  // Use useSortable for the section itself so sections can be reordered
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sectionId });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <SidebarSection 
        label={label}
        dragHandleListeners={listeners}
        dragHandleAttributes={attributes}
        onLabelChange={onLabelChange}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {itemIds.map((id) => {
            const child = childrenMap[id];
            if (!child) return null;
            return (
              <SortableRow key={id} id={id}>
                {child}
              </SortableRow>
            );
          })}
        </SortableContext>
      </SidebarSection>
    </div>
  );
}
