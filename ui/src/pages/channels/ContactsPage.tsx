// ContactsPage — Professional contacts management with avatars and rich details
// Features: Search, add/edit/delete, CSV import, avatar support, channel badges

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, X, Upload, Pencil, Trash2, Phone, Mail, User,
  Calendar, Tag, FileText, MoreHorizontal, ExternalLink
} from "lucide-react";

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

const emptyForm: ContactForm = {
  name: "",
  phone: "",
  zalo_id: "",
  email: "",
  channel: "",
  notes: "",
};

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
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Lỗi tạo liên hệ");
  }
  return res.json();
}

async function updateContact(id: string, form: Partial<ContactForm>): Promise<InboxContact> {
  const res = await fetch(`/api/channels/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Lỗi cập nhật liên hệ");
  }
  return res.json();
}

async function deleteContact(id: string): Promise<void> {
  const res = await fetch(`/api/channels/contacts/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Lỗi xóa liên hệ");
  }
}

function formatDate(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);

  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function parseCSV(text: string): Partial<ContactForm>[] {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
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
  }).filter((r) => r.name);
}

// Avatar component
function Avatar({ src, name, size = "md" }: { src?: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
  };

  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
  ];
  const colorIndex = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden shrink-0`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}
      <div className={`
        ${sizeClasses[size]} ${colors[colorIndex]} flex items-center justify-center
        font-semibold text-white ${src ? "hidden" : ""}
      `}>
        {name.charAt(0).toUpperCase()}
      </div>
    </div>
  );
}

// Channel badge
function ChannelBadge({ channel }: { channel: string }) {
  const ch = channel.toLowerCase();
  let color = "bg-muted text-muted-foreground";
  let icon = "🌐";

  if (ch.includes("zalo")) {
    color = "bg-blue-500/10 text-blue-500";
    icon = "💬";
  } else if (ch.includes("facebook") || ch.includes("fb")) {
    color = "bg-blue-600/10 text-blue-600";
    icon = "📘";
  } else if (ch.includes("telegram")) {
    color = "bg-sky-500/10 text-sky-500";
    icon = "✈️";
  } else if (ch.includes("email")) {
    color = "bg-orange-500/10 text-orange-500";
    icon = "📧";
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${color}`}>
      <span>{icon}</span>
      {channel}
    </span>
  );
}

export function ContactsPage() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<InboxContact | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"grid" | "table">("table");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["inbox-contacts", searchQuery],
    queryFn: () => fetchContacts(searchQuery || undefined),
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-contacts"] });
      closeModal();
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, f }: { id: string; f: Partial<ContactForm> }) => updateContact(id, f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-contacts"] });
      closeModal();
    },
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

  const openAdd = () => {
    setEditingContact(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (c: InboxContact) => {
    setEditingContact(c);
    setForm({
      name: c.name,
      phone: c.phone || "",
      zalo_id: c.zalo_id || "",
      email: c.email || "",
      channel: c.channel || "",
      notes: c.notes || "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingContact(null);
    setForm(emptyForm);
    setFormError(null);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setFormError("Tên là bắt buộc");
      return;
    }
    if (editingContact) {
      updateMut.mutate({ id: editingContact.id, f: form });
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
    if (rows.length === 0) {
      setImportStatus("Không tìm thấy dữ liệu hợp lệ");
      return;
    }
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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Search */}
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm liên hệ..."
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>

          {/* Stats */}
          <div className="text-sm text-muted-foreground hidden md:block">
            <span className="font-semibold text-foreground">{contacts.length}</span> liên hệ
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {importStatus && (
            <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
              {importStatus}
            </span>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            title="Nhập từ CSV"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Nhập CSV</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCSVImport}
          />

          <button
            onClick={openAdd}
            className="flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Thêm liên hệ</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-muted/20 rounded-xl animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-base font-medium mb-2">
                {searchQuery ? "Không tìm thấy liên hệ" : "Chưa có liên hệ nào"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? `Không có liên hệ nào khớp với "${searchQuery}"`
                  : "Thêm liên hệ đầu tiên để bắt đầu quản lý danh bạ"
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={openAdd}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Thêm liên hệ
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-background border-b border-border">
                <tr>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Liên hệ
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Số điện thoại
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                    Zalo ID
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    Kênh
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    Liên hệ cuối
                  </th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="group hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => openEdit(c)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={c.avatar_url} name={c.name} size="md" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{c.name}</div>
                          {c.email && (
                            <div className="text-[12px] text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {c.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{c.phone}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      {c.zalo_id ? (
                        <code className="text-[12px] bg-muted/50 px-2 py-1 rounded">
                          {c.zalo_id}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      {c.channel ? (
                        <ChannelBadge channel={c.channel} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(c.last_message_at)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(c);
                          }}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Xóa liên hệ "${c.name}"?`)) {
                              deleteMut.mutate(c.id);
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold">
                {editingContact ? "Chỉnh sửa liên hệ" : "Thêm liên hệ mới"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Tên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Nguyễn Văn A"
                    className="w-full h-10 pl-10 pr-4 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="0912 345 678"
                    className="w-full h-10 pl-10 pr-4 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full h-10 pl-10 pr-4 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Zalo ID */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Zalo ID</label>
                <input
                  type="text"
                  value={form.zalo_id}
                  onChange={(e) => setForm((f) => ({ ...f, zalo_id: e.target.value }))}
                  placeholder="ID Zalo (số hoặc tên)"
                  className="w-full h-10 px-4 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                />
              </div>

              {/* Channel */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Kênh liên lạc</label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                  className="w-full h-10 px-4 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                >
                  <option value="">— Chọn kênh —</option>
                  <option value="Zalo">Zalo</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Telegram">Telegram</option>
                  <option value="Email">Email</option>
                  <option value="Website">Website</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Ghi chú</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Thêm ghi chú về liên hệ này..."
                  className="w-full px-4 py-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none"
                />
              </div>

              {/* Error */}
              {formError && (
                <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
                  {formError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-muted/20">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMut.isPending || updateMut.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMut.isPending || updateMut.isPending
                  ? "Đang lưu..."
                  : editingContact
                  ? "Lưu thay đổi"
                  : "Thêm liên hệ"
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
