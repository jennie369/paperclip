// Shared CRM notes panel — dùng chung cho CustomerSidebar (inbox) + CustomerDetailPage.
// CRUD đầy đủ: thêm · sửa inline autosave · xoá · chọn nhiều · xoá hàng loạt.
// Token paperclip (shadcn): border / muted / muted-foreground / primary / destructive.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Trash2, Check, X, Pencil } from "lucide-react";
import { crmApi } from "@/api/crm";

interface Note {
  id: string;
  content: string;
  created_by?: string;
  created_at?: string;
  pinned?: boolean;
}

interface Props {
  customerId: string;
  notes: Note[];
  onChanged: () => void;
}

function timeAgo(d?: string): string {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 3600000) return Math.round(ms / 60000) + " phút trước";
  if (ms < 86400000) return Math.round(ms / 3600000) + " giờ trước";
  return Math.round(ms / 86400000) + " ngày trước";
}

export function CustomerNotes({ customerId, notes, onChanged }: Props) {
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const addMut = useMutation({
    mutationFn: () => crmApi.addNote(customerId, newNote.trim()),
    onSuccess: () => { setNewNote(""); onChanged(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => crmApi.updateNote(customerId, id, { content }),
    onSuccess: () => { setEditingId(null); onChanged(); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => crmApi.deleteNote(customerId, id),
    onSuccess: onChanged,
  });
  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => crmApi.bulkDeleteNotes(customerId, ids),
    onSuccess: () => { setSelected(new Set()); onChanged(); },
  });

  const toggleSel = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allSelected = notes.length > 0 && selected.size === notes.length;
  const saveEdit = () => {
    const v = editDraft.trim();
    const cur = notes.find((n) => n.id === editingId);
    if (v && cur && v !== cur.content) updateMut.mutate({ id: editingId!, content: v });
    else setEditingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-muted-foreground font-medium">Ghi chú nhanh</span>
        {notes.length > 0 && (
          <button
            type="button"
            onClick={() => setSelected(allSelected ? new Set() : new Set(notes.map((n) => n.id)))}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            {allSelected ? "Bỏ chọn" : "Chọn tất cả"}
          </button>
        )}
      </div>

      {/* Add */}
      <div className="flex gap-1">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Thêm ghi chú..."
          className="flex-1 text-xs px-2 py-1.5 rounded border bg-muted/20 focus:outline-none focus:ring-1 focus:ring-ring"
          onKeyDown={(e) => { if (e.key === "Enter" && newNote.trim()) addMut.mutate(); }}
        />
        <button
          onClick={() => newNote.trim() && addMut.mutate()}
          disabled={!newNote.trim() || addMut.isPending}
          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-30"
        >
          +
        </button>
      </div>

      {/* Bulk-select action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between mt-2 px-2 py-1.5 rounded-md bg-destructive/10 text-destructive text-[11px]">
          <span>Đã chọn {selected.size}</span>
          <button
            onClick={() => bulkDeleteMut.mutate(Array.from(selected))}
            disabled={bulkDeleteMut.isPending}
            className="inline-flex items-center gap-1 font-semibold hover:underline"
          >
            <Trash2 className="h-3 w-3" /> Xoá đã chọn
          </button>
        </div>
      )}

      {/* List */}
      {notes.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {notes.map((n) => (
            <div key={n.id} className="flex items-start gap-2 text-xs bg-muted/20 rounded-md px-2 py-1.5 group">
              <input
                type="checkbox"
                checked={selected.has(n.id)}
                onChange={() => toggleSel(n.id)}
                className="mt-0.5 shrink-0 accent-primary"
              />
              <div className="min-w-0 flex-1">
                {editingId === n.id ? (
                  <div className="flex items-start gap-1">
                    <textarea
                      autoFocus
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      rows={2}
                      className="flex-1 text-xs px-1.5 py-1 rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                    <button onMouseDown={(e) => e.preventDefault()} onClick={saveEdit} className="p-1 rounded hover:bg-muted" title="Lưu">
                      <Check className="h-3 w-3 text-green-600" />
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-foreground/90 whitespace-pre-wrap break-words cursor-text rounded hover:bg-muted/40 px-0.5"
                    title="Bấm để sửa"
                    onClick={() => { setEditingId(n.id); setEditDraft(n.content); }}
                  >
                    {n.content}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">{n.created_by || "board"} · {timeAgo(n.created_at)}</p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingId(n.id); setEditDraft(n.content); }} className="p-1 rounded hover:bg-muted" title="Sửa">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <button onClick={() => deleteMut.mutate(n.id)} disabled={deleteMut.isPending} className="p-1 rounded hover:bg-destructive/10" title="Xoá">
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
