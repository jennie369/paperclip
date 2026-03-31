// Import Page — CSV upload + preview + batch import

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ImportState = 'idle' | 'preview' | 'importing' | 'done';

interface PreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

interface ImportResult {
  created: number;
  updated: number;
  matched_gemral: number;
  errors: number;
  total: number;
}

const fieldMapping: Record<string, string> = {
  'Email': 'email', 'Phone': 'phone', 'First Name': 'display_name',
  'Last Name': 'display_name_last', 'Name': 'display_name',
  'Total Spent': 'total_revenue', 'Total Orders': 'total_orders',
  'City': 'shipping_province', 'Province': 'shipping_province',
  'Tags': 'ai_tags',
};

export function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>('idle');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1, 6).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));

      // Auto-map known columns
      const autoMap: Record<string, string> = {};
      headers.forEach(h => {
        const match = fieldMapping[h];
        if (match) autoMap[h] = match;
      });

      setPreview({ headers, rows, totalRows: lines.length - 1 });
      setMapping(autoMap);
      setState('preview');
    };
    reader.readAsText(file);
  };

  const importMut = useMutation({
    mutationFn: async () => {
      setState('importing');
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error('Không có file');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));

      const res = await fetch('/api/channels/crm/import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Import failed');
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setState('done');
    },
    onError: () => {
      setResult({ created: 0, updated: 0, matched_gemral: 0, errors: 1, total: 0 });
      setState('done');
    },
  });

  const crmFields = ['— Bỏ qua —', 'display_name', 'email', 'phone', 'status', 'ai_tags', 'total_revenue', 'total_orders', 'internal_notes', 'shipping_province'];

  return (
    <div className="space-y-4 p-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Import khách hàng</h1>

      {/* STEP 1: Upload */}
      {state === 'idle' && (
        <Card className="p-8">
          <div className="text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-2">Chọn file CSV để import</h3>
            <p className="text-sm text-muted-foreground mb-4">Hỗ trợ CSV từ Shopify, Google Contacts, hoặc file tùy chỉnh</p>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
            <Button onClick={() => fileRef.current?.click()}>
              <FileText className="mr-1.5 h-4 w-4" /> Chọn file CSV
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: Preview + Mapping */}
      {state === 'preview' && preview && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-2">Xem trước ({preview.totalRows} dòng)</h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full">
                <thead><tr className="border-b bg-muted/30">
                  {preview.headers.map((h, i) => <th key={i} className="px-2 py-1 text-left">{h}</th>)}
                </tr></thead>
                <tbody>{preview.rows.map((row, i) => (
                  <tr key={i} className="border-b">
                    {row.map((c, j) => <td key={j} className="px-2 py-1 max-w-[150px] truncate">{c}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Map cột CSV → CRM</h3>
            <div className="grid grid-cols-2 gap-3">
              {preview.headers.map(h => (
                <div key={h} className="flex items-center gap-2">
                  <span className="text-sm w-32 truncate font-mono">{h}</span>
                  <span className="text-muted-foreground">→</span>
                  <select value={mapping[h] || ''} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                    className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm">
                    {crmFields.map(f => <option key={f} value={f === '— Bỏ qua —' ? '' : f}>{f}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setState('idle'); setPreview(null); }}>Hủy</Button>
            <Button onClick={() => importMut.mutate()}>
              Import {preview.totalRows} khách hàng
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Importing */}
      {state === 'importing' && (
        <Card className="p-8 text-center">
          <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary mb-4" />
          <h3 className="text-lg font-medium">Đang import...</h3>
          <p className="text-sm text-muted-foreground mt-1">Vui lòng không đóng trang</p>
        </Card>
      )}

      {/* STEP 4: Result */}
      {state === 'done' && result && (
        <Card className="p-6">
          <div className="text-center mb-4">
            {result.errors === 0 ? (
              <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-2" />
            ) : (
              <AlertTriangle className="h-10 w-10 mx-auto text-yellow-500 mb-2" />
            )}
            <h3 className="text-lg font-medium">Import hoàn tất</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center text-sm max-w-md mx-auto">
            <div className="rounded-md bg-green-500/10 p-3">
              <div className="text-2xl font-bold text-green-600">{result.created}</div>
              <div className="text-muted-foreground">Tạo mới</div>
            </div>
            <div className="rounded-md bg-blue-500/10 p-3">
              <div className="text-2xl font-bold text-blue-600">{result.updated}</div>
              <div className="text-muted-foreground">Cập nhật</div>
            </div>
            <div className="rounded-md bg-purple-500/10 p-3">
              <div className="text-2xl font-bold text-purple-600">{result.matched_gemral}</div>
              <div className="text-muted-foreground">Liên kết Gemral</div>
            </div>
            <div className="rounded-md bg-red-500/10 p-3">
              <div className="text-2xl font-bold text-red-600">{result.errors}</div>
              <div className="text-muted-foreground">Lỗi</div>
            </div>
          </div>
          <div className="text-center mt-4">
            <Button onClick={() => { setState('idle'); setPreview(null); setResult(null); }}>Import thêm</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
