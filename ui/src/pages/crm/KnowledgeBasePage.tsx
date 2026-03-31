// Knowledge Base Page — collections, documents, search test

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Database, FileText, Trash2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SimpleModal } from "./components/SimpleModal";

const collectionTypes = [
  { value: 'document', label: 'Tài liệu' },
  { value: 'faq', label: 'FAQ' },
  { value: 'product', label: 'Sản phẩm' },
  { value: 'course', label: 'Khóa học' },
  { value: 'policy', label: 'Chính sách' },
];

export function KnowledgeBasePage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [colForm, setColForm] = useState({ name: '', description: '', collection_type: 'document' });
  const [docForm, setDocForm] = useState({ title: '', content: '' });
  const [showFAQ, setShowFAQ] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', collection_id: '' });
  const [syncMsg, setSyncMsg] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['kb', 'stats'],
    queryFn: async () => { const r = await fetch('/api/channels/crm/kb/stats'); return r.json(); },
    staleTime: 30_000,
  });

  const { data: collections, isLoading } = useQuery({
    queryKey: ['kb', 'collections'],
    queryFn: async () => { const r = await fetch('/api/channels/crm/kb/collections'); return r.json(); },
    staleTime: 15_000,
  });

  const inv = () => qc.invalidateQueries({ queryKey: ['kb'] });

  const createColMut = useMutation({
    mutationFn: async (d: any) => {
      const r = await fetch('/api/channels/crm/kb/collections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      return r.json();
    },
    onSettled: () => { inv(); setShowCreate(false); setColForm({ name: '', description: '', collection_type: 'document' }); },
  });

  const deleteColMut = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/channels/crm/kb/collections/${id}`, { method: 'DELETE' }); },
    onSettled: inv,
  });

  const addFAQMut = useMutation({
    mutationFn: async (d: any) => {
      const r = await fetch('/api/channels/crm/kb/faq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      return r.json();
    },
    onSettled: () => { inv(); setShowFAQ(false); setFaqForm({ question: '', answer: '', collection_id: '' }); },
  });

  const syncShopify = async () => {
    setSyncMsg('Đang sync sản phẩm Shopify...');
    try {
      const r = await fetch('/api/channels/crm/kb/sync/shopify', { method: 'POST' });
      const d = await r.json();
      setSyncMsg(d.message || 'Đã bắt đầu sync');
      setTimeout(() => { inv(); setSyncMsg(''); }, 5000);
    } catch { setSyncMsg('Lỗi sync Shopify'); }
  };

  const syncCourses = async () => {
    setSyncMsg('Đang sync khóa học...');
    try {
      const r = await fetch('/api/channels/crm/kb/sync/courses', { method: 'POST' });
      const d = await r.json();
      setSyncMsg(d.message || 'Đã bắt đầu sync');
      setTimeout(() => { inv(); setSyncMsg(''); }, 5000);
    } catch { setSyncMsg('Lỗi sync khóa học'); }
  };

  const addDocMut = useMutation({
    mutationFn: async ({ collectionId, title, content }: any) => {
      const r = await fetch('/api/channels/crm/kb/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection_id: collectionId, title, content }),
      });
      return r.json();
    },
    onSettled: () => { inv(); setShowAddDoc(null); setDocForm({ title: '', content: '' }); },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const r = await fetch('/api/channels/crm/kb/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 5 }),
      });
      const data = await r.json();
      setSearchResults(data.results || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Tạo bộ sưu tập
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center"><div className="text-2xl font-bold">{stats.collections}</div><div className="text-xs text-muted-foreground">Bộ sưu tập</div></Card>
          <Card className="p-4 text-center"><div className="text-2xl font-bold">{stats.documents}</div><div className="text-xs text-muted-foreground">Tài liệu</div></Card>
          <Card className="p-4 text-center"><div className="text-2xl font-bold">{stats.chunks}</div><div className="text-xs text-muted-foreground">Chunks</div></Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowFAQ(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Thêm FAQ
        </Button>
        <Button variant="outline" size="sm" onClick={syncShopify}>
          Sync Shopify
        </Button>
        <Button variant="outline" size="sm" onClick={syncCourses}>
          Sync Khóa học
        </Button>
        {syncMsg && <span className="text-sm text-blue-600 self-center">{syncMsg}</span>}
      </div>

      {/* Search Test */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-2">Thử tìm kiếm KB</h3>
        <div className="flex gap-2">
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="VD: thạch anh hồng, khóa học trading..." className="flex-1"
            onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <Button size="sm" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {searchResults !== null && (
          <div className="mt-3 space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không tìm thấy kết quả.</p>
            ) : searchResults.map((r: any, i: number) => (
              <div key={i} className="border rounded-md p-3 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{r.document_title}</span>
                  <span>{r.source_type}</span>
                </div>
                <p className="text-sm">{r.content?.slice(0, 200)}...</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Collections */}
      <Card>
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : !(collections || []).length ? (
          <div className="flex flex-col items-center gap-3 p-12">
            <Database className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Chưa có bộ sưu tập nào.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bộ sưu tập</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Loại</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Docs</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Chunks</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Thao tác</th>
            </tr></thead>
            <tbody>{(collections || []).map((c: any) => (
              <tr key={c.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-3"><p className="font-medium">{c.name}</p>{c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}</td>
                <td className="px-4 py-3 text-xs">{c.collection_type}</td>
                <td className="px-4 py-3 text-right tabular-nums">{c.document_count}</td>
                <td className="px-4 py-3 text-right tabular-nums">{c.chunk_count}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => { setShowAddDoc(c.id); setDocForm({ title: '', content: '' }); }} className="p-1 rounded hover:bg-blue-500/10 text-blue-600" title="Thêm tài liệu">
                      <FileText className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteColMut.mutate(c.id)} className="p-1 rounded hover:bg-red-500/10 text-red-600" title="Xóa">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>

      {/* Create Collection */}
      <SimpleModal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo bộ sưu tập" footer={<>
        <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
        <Button disabled={!colForm.name.trim() || createColMut.isPending} onClick={() => createColMut.mutate(colForm)}>Tạo</Button>
      </>}>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Tên *</label><Input value={colForm.name} onChange={e => setColForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Sản phẩm đá phong thủy" /></div>
          <div><label className="text-sm font-medium">Mô tả</label><Input value={colForm.description} onChange={e => setColForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><label className="text-sm font-medium">Loại</label>
            <select value={colForm.collection_type} onChange={e => setColForm(f => ({ ...f, collection_type: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {collectionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select></div>
        </div>
      </SimpleModal>

      {/* Add FAQ */}
      <SimpleModal open={showFAQ} onClose={() => setShowFAQ(false)} title="Thêm FAQ" footer={<>
        <Button variant="outline" onClick={() => setShowFAQ(false)}>Hủy</Button>
        <Button disabled={!faqForm.question.trim() || !faqForm.answer.trim() || addFAQMut.isPending} onClick={() => addFAQMut.mutate(faqForm)}>
          {addFAQMut.isPending ? 'Đang thêm...' : 'Thêm FAQ'}
        </Button>
      </>}>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Bộ sưu tập</label>
            <select value={faqForm.collection_id} onChange={e => setFaqForm(f => ({ ...f, collection_id: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">— Chọn bộ sưu tập —</option>
              {(collections || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div><label className="text-sm font-medium">Câu hỏi *</label>
            <Input value={faqForm.question} onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))} placeholder="VD: Thạch anh hồng có công dụng gì?" /></div>
          <div><label className="text-sm font-medium">Câu trả lời *</label>
            <textarea value={faqForm.answer} onChange={e => setFaqForm(f => ({ ...f, answer: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]" placeholder="Trả lời chi tiết..." /></div>
        </div>
      </SimpleModal>

      {/* Add Document */}
      <SimpleModal open={!!showAddDoc} onClose={() => setShowAddDoc(null)} title="Thêm tài liệu" footer={<>
        <Button variant="outline" onClick={() => setShowAddDoc(null)}>Hủy</Button>
        <Button disabled={!docForm.content.trim() || addDocMut.isPending} onClick={() => showAddDoc && addDocMut.mutate({ collectionId: showAddDoc, ...docForm })}>
          {addDocMut.isPending ? 'Đang xử lý...' : 'Thêm & xử lý'}
        </Button>
      </>}>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Tiêu đề</label><Input value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} placeholder="VD: Catalog Q1 2026" /></div>
          <div><label className="text-sm font-medium">Nội dung *</label>
            <textarea value={docForm.content} onChange={e => setDocForm(f => ({ ...f, content: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[150px]" placeholder="Dán nội dung tài liệu vào đây..." /></div>
        </div>
      </SimpleModal>
    </div>
  );
}
