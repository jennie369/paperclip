const fs = require('fs');

function updateComponent(filePath, componentName) {
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Add props to signature
  const sigRegex = new RegExp(`export function ${componentName}\\(\\)\\s*\\{`);
  code = code.replace(sigRegex, `export function ${componentName}({ label = "${componentName.replace('Sidebar', '')}", onLabelChange }: { label?: string, onLabelChange?: (label: string) => void }) {`);

  // 2. Add React imports if missing
  if (!code.includes('useRef') || !code.includes('useEffect')) {
    code = code.replace(/import \{.*?\} from "react";/, 'import { useState, useCallback, useMemo, useRef, useEffect } from "react";');
  }

  // 3. Add hooks for inline editing
  const hookInjectStr = `
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setEditValue(label);
  }, [label, isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() !== "" && editValue !== label && onLabelChange) {
      onLabelChange(editValue);
    } else {
      setEditValue(label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.stopPropagation();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      setEditValue(label);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);
  `;
  
  const hookTarget = 'const { selectedCompanyId } = useCompany();';
  code = code.replace(hookTarget, hookInjectStr + '\n  ' + hookTarget);

  // 4. Update the render DOM
  const oldTextSpan = `<span className="text-[10px] font-medium uppercase tracking-widest font-mono text-muted-foreground/60">\n              ${componentName.replace('Sidebar', '')}\n            </span>`;
  
  const newTextSpan = `
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="text-[10px] font-medium uppercase tracking-widest font-mono text-foreground bg-accent border border-border rounded px-1 flex-1 min-w-0 outline-none focus:ring-1 focus:ring-ring h-4"
            />
          ) : (
            <span
              onDoubleClick={handleDoubleClick}
              className="text-[10px] font-medium uppercase tracking-widest font-mono text-muted-foreground/60 flex-1 min-w-0 cursor-pointer hover:text-foreground transition-colors select-none"
              title="Double click to rename"
            >
              {label}
            </span>
          )}`;
  
  // replace the CollapsibleTrigger too to use asChild so we don't have block input
  const oldHeader = `<CollapsibleTrigger className="flex items-center gap-1 flex-1 min-w-0">\n            <ChevronRight\n              className={cn(\n                "h-3 w-3 text-muted-foreground/60 transition-transform opacity-0 group-hover:opacity-100",\n                open && "rotate-90"\n              )}\n            />\n            <span className="text-[10px] font-medium uppercase tracking-widest font-mono text-muted-foreground/60">\n              ${componentName.replace('Sidebar', '')}\n            </span>\n          </CollapsibleTrigger>`;

  const newHeader = `<CollapsibleTrigger asChild>
            <button className="flex items-center justify-center p-0.5 -ml-0.5 mr-0.5 cursor-pointer rounded hover:bg-muted/50 text-muted-foreground/60">
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform opacity-0 group-hover:opacity-100",
                  open && "rotate-90"
                )}
              />
            </button>
          </CollapsibleTrigger>
          ${newTextSpan}`;

  code = code.replace(oldHeader, newHeader);
  fs.writeFileSync(filePath, code);
}

updateComponent('ui/src/components/SidebarAgents.tsx', 'SidebarAgents');
updateComponent('ui/src/components/SidebarProjects.tsx', 'SidebarProjects');
console.log('Updated Agents and Projects inline edit');
