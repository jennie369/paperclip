// FIX 8: Contacts Page (A1-A7) — Danh bạ hội thoại
// Table of contacts with search, add, edit, CSV import

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, X, Upload, Pencil, Trash2 } from "lucide-react";

interface InboxContact {
  id: string;
  name: string;
  phone?: string | null;
  zalo_id?: string | null;
  facebook_id?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  channel?: string | null;
  last_message_at?: string | null;
  notes?: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface ContactForm {
  name: string;
  phone: string;
  zalo_id: string;
  email: string;
  channel: string;
  notes: string;
}

const emptyForm: ContactForm = { name: "", phone: "", zalo_id: "", email: "", channel: "", notes: "" };

async function fetchContacts(search?: string): Promise<InboxContact[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("limit", "100");
  const res = await fetch(`/api/channels/contacts?${params}`);
  if (!res.ok) throw new Error("Không thể tải danh bạ");
  return res.json();
}

async function createContact(form: ContactForm): Promise<InboxContact> {
  const res = await fetch("/api/channels/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Lỗi tạo liên hệ"); }
  return res.json();
}

async function updateContact(id: string, form: Partial<ContactForm>): Promise<InboxContact> {
  const res = await fetch(`/api/channels/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Lỗi cập nhật liên hệ"); }
  return res.json();
}

async function deleteContact(id: string): Promise<void> {
  const res = await fetch(`/api/channels/contacts/${id}`, { method: "DELETE" });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Lỗi xóa liên hệ"); }
}

function formatTime(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function parseCSV(text: string): Partial<ContactForm>[] {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return {
      name: obj["name"] || obj["tên"] || obj["ho va ten"] || "",
      phone: obj["phone"] || obj["sdt"] || obj["so dien thoai"] || "",
      zalo_id: obj["zalo_id"] || obj["zalo id"] || "",
      email: obj["email"] || "",
      channel: obj["channel"] || obj["kenh"] || "",
      notes: obj["notes"] || obj["ghi chu"] || "",
    };
  }).filter(r => r.name);
}

export function ContactsPage() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["inbox-contacts", searchQuery],
    queryFn: () => fetchContacts(searchQuery || undefined),
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: createContact,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inbox-contacts"] }); closeModal(); },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, f }: { id: string; f: Partial<ContactForm> }) => updateContact(id, f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inbox-contacts"] }); closeModal(); },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox-contacts"] }),
  });

  const handleSearch = (val: string) => {
    setSearchInput(val);
    clearTimeout((window as any).__contactsSearchTimer);
    (window as any).__contactsSearchTimer = setTimeout(() => setSearchQuery(val), 400);
  };

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setFormError(null); setShowModal(true); };
  const openEdit = (c: InboxContact) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone || "", zalo_id: c.zalo_id || "", email: c.email || "", channel: c.channel || "", notes: c.notes || "" });
    setFormError(null);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm); setFormError(null); };

  const handleSubmit = () => {
    if (!form.name.trim()) { setFormError("Tên là bắt buộc"); return; }
    if (editingId) {
      updateMut.mutate({ id: editingId, f: form });
    } else {
      createMut.mutate(form);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus("Đang nhập...");
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) { setImportStatus("Không tìm thấy dữ liệu hợp lệ trong CSV"); return; }
    let success = 0;
    let failed = 0;
    for (const row of rows) {
      if (!row.name) continue;
      try {
        await createContact(row as ContactForm);
        success++;
      } catch {
        failed++;
      }
    }
    qc.invalidateQueries({ queryKey: ["inbox-contacts"] });
    setImportStatus(`Đã nhập ${success} liên hệ${failed > 0 ? `, ${failed} lỗi` : ""}`);
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setImportStatus(null), 4000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm liên hệ..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-[13px] rounded-md border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          {importStatus && (
            <span className="text-[12px] text-muted-foreground">{importStatus}</span>
          )}
          {/* A7: CSV import */}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-md border hover:bg-muted"
            title="Nhập từ CSV"
          >
            <Upload className="h-3.5 w-3.5" />
            Nhập CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCSVImport} />
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm liên hệ
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Đang tải...</div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-2xl opacity-30 mb-2">👤</div>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? `Không tìm thấy liên hệ nào khớp với "${searchQuery}"` : "Chưa có liên hệ nào"}
            </p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-background border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tên</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">SĐT</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Zalo ID</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Kênh</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Lần cuối</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-semibold text-violet-600 shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        {c.email && <div className="text-[11px] text-muted-foreground">{c.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">{c.zalo_id || "—"}</td>
                  <td className="px-4 py-3">
                    {c.channel ? (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-muted/50 text-muted-foreground">{c.channel}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatTime(c.last_message_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Xóa liên hệ "${c.name}"?`)) deleteMut.mutate(c.id); }}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"
                        title="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t text-[11px] text-muted-foreground">
        {contacts.length} liên hệ
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">{editingId ? "Chỉnh sửa liên hệ" : "Thêm liên hệ mới"}</h3>
              <button onClick={closeModal} className="p-0.5 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {(["name", "phone", "zalo_id", "email", "channel", "notes"] as (keyof ContactForm)[]).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 capitalize">
                    {field === "name" ? "Tên *" : field === "phone" ? "SĐT" : field === "zalo_id" ? "Zalo ID" : field === "email" ? "Email" : field === "channel" ? "Kênh" : "Ghi chú"}
                  </label>
                  {field === "notes" ? (
                    <textarea
                      value={form[field]}
                      onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                      rows={2}
                      className="w-full border rounded-md px-3 py-2 text-[13px] bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                  ) : (
                    <input
                      type={field === "email" ? "email" : "text"}
                      value={form[field]}
                      onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                      className="w-full border rounded-md px-3 py-2 text-[13px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  )}
                </div>
              ))}
              {formError && <p className="text-xs text-red-500">{formError}</p>}
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <button onClick={closeModal} className="px-3 py-1.5 text-[13px] rounded-md border hover:bg-muted">Hủy</button>
              <button
                onClick={handleSubmit}
                disabled={createMut.isPending || updateMut.isPending}
                className="px-3 py-1.5 text-[13px] rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createMut.isPending || updateMut.isPending ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm liên hệ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
