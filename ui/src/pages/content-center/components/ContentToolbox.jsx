/**
 * ContentToolbox — Fixed-position sidebar with categorized draggable items.
 * Generic — không gate by content type. Extracted from EmailResultPanel.jsx
 * 2026-05-17 cho ContentResultPanel global refactor.
 *
 * Spec: memory/reports/2026-05-17-content-result-panel-global-design.md
 *
 * Props:
 *   show          — boolean: show/hide
 *   onClose       — () => void: close button handler
 *   categories    — Array<{ id, label, icon, items: Array<{id, label, description, icon, html}> }>
 *   openState     — { [categoryId]: boolean }: which categories are expanded
 *   onToggleCategory — (id: string) => void
 *   onInsert      — (item) => void: click handler when user clicks toolbox item
 */
import { Plus, ChevronDown, ChevronRight, GripVertical, X } from 'lucide-react';

export function ContentToolbox({
  show,
  onClose,
  categories,
  openState,
  onToggleCategory,
  onInsert,
}) {
  if (!show) return null;

  return (
    <div
      className="rounded-card border border-border bg-glass-bg overflow-hidden z-50"
      style={{ position: 'fixed', right: '16px', top: '80px', width: '190px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-gold/10 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Plus size={14} className="text-gold" />
          <span className="text-xs font-semibold text-gold">Toolbox</span>
        </div>
        <button onClick={onClose} className="text-txt-3 hover:text-txt transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-2">
        {categories.map((category) => (
          <div key={category.id} className="mb-2">
            <button
              onClick={() => onToggleCategory(category.id)}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 text-left rounded bg-glass-bg hover:bg-bg-3 transition-colors"
            >
              {openState[category.id]
                ? <ChevronDown size={12} className="text-txt-3" />
                : <ChevronRight size={12} className="text-txt-3" />}
              <category.icon size={12} className="text-gold" />
              <span className="text-xxs font-semibold text-txt-2">{category.label}</span>
              <span className="text-xxs text-txt-3 ml-auto">({category.items.length})</span>
            </button>

            {openState[category.id] && (
              <div className="flex flex-col gap-1 mt-1 pl-1">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'copy';
                      e.dataTransfer.setData('application/x-email-toolbox', JSON.stringify(item));
                      e.dataTransfer.setData('text/html', item.html);
                      e.dataTransfer.setData('text/plain', item.label);
                      window.__emailPendingDropHtml = item.html;
                    }}
                    onClick={() => onInsert(item)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded border border-transparent bg-white/[0.03] hover:bg-gold/10 hover:border-gold/20 cursor-grab transition-all group"
                    title={`${item.description} — Kéo vào content preview hoặc click để thêm`}
                  >
                    <GripVertical size={10} className="text-txt-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    <item.icon size={12} className="text-gold flex-shrink-0" />
                    <span className="text-xxs text-txt-2 leading-tight">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Hint */}
        <div className="mt-2 p-2 rounded bg-purple/5 border border-purple/10 text-center">
          <p className="text-xxs text-txt-3 leading-relaxed">
            Kéo thả trực tiếp vào content preview hoặc click để chèn
          </p>
        </div>
      </div>
    </div>
  );
}

export default ContentToolbox;
