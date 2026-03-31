import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/api/client";

interface AgentFile {
  name: string;
  missing: boolean;
  size: number;
  content: string;
  updatedAt?: string;
}

const FILE_DESCRIPTIONS: Record<string, string> = {
  "SOUL.md": "Nhân cách, giọng điệu, ranh giới ứng xử của agent",
  "AGENTS.md": "Hướng dẫn vận hành, quy trình xử lý công việc",
  "HEARTBEAT.md": "Cấu hình heartbeat — lịch tự động kiểm tra/báo cáo",
  "TOOLS.md": "Danh sách công cụ agent được phép sử dụng",
};

export function AgentFilesTab({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const [selectedFile, setSelectedFile] = useState("SOUL.md");
  const [editContent, setEditContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["agent-files", slug],
    queryFn: () => api.get<{ files: AgentFile[] }>(`/channels/agent-configs/${slug}/files`),
  });

  const files = data?.files || [];
  const currentFile = files.find((f) => f.name === selectedFile);

  const saveMut = useMutation({
    mutationFn: () =>
      api.put(`/channels/agent-configs/${slug}/files/${selectedFile}`, { content: editContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-files", slug] });
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function selectFile(name: string) {
    if (isDirty && !confirm("Thay đổi chưa lưu sẽ bị mất. Tiếp tục?")) return;
    setSelectedFile(name);
    const file = files.find((f) => f.name === name);
    setEditContent(file?.content || "");
    setIsDirty(false);
    setSaved(false);
  }

  // Sync editor content when file data loads or selected file changes
  useEffect(() => {
    if (currentFile && !isDirty) {
      setEditContent(currentFile.content || "");
    }
  }, [currentFile?.name, currentFile?.content]);

  function estimateTokens(text: string): number {
    if (!text) return 0;
    let ascii = 0, nonAscii = 0;
    for (const ch of text) {
      if (ch.charCodeAt(0) < 128) ascii++;
      else nonAscii++;
    }
    return Math.ceil(ascii / 4 + nonAscii / 1.5);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[600px]">
      {/* File Sidebar */}
      <div className="w-48 border rounded-lg overflow-hidden shrink-0">
        <div className="p-2 border-b bg-muted/30">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">Tệp Agent</h3>
        </div>
        <div className="divide-y">
          {files.map((file) => (
            <button
              key={file.name}
              onClick={() => selectFile(file.name)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                selectedFile === file.name
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{file.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 ml-5.5">
                {file.missing ? (
                  <span className="text-[10px] text-orange-500">chưa tạo</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    ~{estimateTokens(file.content)} tokens
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* File Editor */}
      <div className="flex-1 border rounded-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20">
          <div>
            <div className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {selectedFile}
              {isDirty && <span className="text-xs text-orange-500">(chưa lưu)</span>}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {FILE_DESCRIPTIONS[selectedFile] || "Tệp cấu hình agent"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Đã lưu
              </span>
            )}
            <Button
              size="sm"
              onClick={() => saveMut.mutate()}
              disabled={!isDirty || saveMut.isPending}
            >
              {saveMut.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Lưu
            </Button>
          </div>
        </div>

        {/* Editor */}
        <textarea
          className="flex-1 p-4 font-mono text-sm bg-background resize-none focus:outline-none"
          value={editContent}
          onChange={(e) => {
            setEditContent(e.target.value);
            setIsDirty(true);
          }}
          placeholder={`Nội dung ${selectedFile}...`}
          spellCheck={false}
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t bg-muted/10 text-[10px] text-muted-foreground">
          <span>{editContent.length} ký tự · ~{estimateTokens(editContent)} tokens</span>
          {currentFile?.updatedAt && (
            <span>Cập nhật: {new Date(currentFile.updatedAt).toLocaleString("vi-VN")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
