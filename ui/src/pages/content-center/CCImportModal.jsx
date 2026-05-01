import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button, Card } from '@gem/ui';

// JS Port of the clean_body logic from Python
function cleanBody(body) {
  let text = body;
  text = text.replace(/## 📝 Full Content\s*/gm, '');

  if (text.toLowerCase().includes('<html') || text.toLowerCase().includes('<!doctype')) {
    const match = text.match(/(<!doctype|<html)[\s\S]*/i);
    if (match) return match[0].trim();
  }

  // Handle stuck Vietnamese characters (e.g. m.Với) -> m.\n\nVới
  text = text.replace(/([a-z]\.)([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ])/g, '$1\n\n$2');

  let lines = text.split('\n');

  const markers = [
    "output format", "emoji rules", "facebook compliance", "knowledge files", 
    "brand identity", "tone of voice", "i will", "mental sandbox", "strict adherence",
    "generate the", "the user wants", "maximum of two", "drafting plan",
    "content structure", "here is the", "dưới đây là", "plan for",
    "kế hoạch:", "the knowledge files have been read", "i will now draft"
  ];

  let lastAiIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    if (markers.some(m => lineLower.includes(m))) {
      lastAiIdx = i;
    }
  }

  if (lastAiIdx >= 0) {
    lines = lines.slice(lastAiIdx + 1);
  }

  // Remove leading chatter
  while (lines.length > 0) {
    const line = lines[0].trim().toLowerCase();
    if (!line) {
      lines.shift();
      continue;
    }
    let isChatter = false;
    const chatterPattern = /^(chào chị|em chào|em sẽ|em đã|chị muốn|bây giờ, em|đây là bản|chị xem|đây là bài|chúc chị|nếu chị|hy vọng|chị thấy|dạ |đầu tiên,|chị đã|đã rõ|tuyệt vời|quan trọng:|cấu trúc bài|đã nắm|được ạ|đã đọc|nội dung cần|với bài|chị vui lòng|tất cả các file|dạ vâng)/;
    if (chatterPattern.test(line) && line.split(' ').length < 150) {
      isChatter = true;
    }
    if (/^\d+\.\s+(câu chuyện|insight|hành trình|emoji|hình ảnh|tiêu đề)/.test(line)) {
      isChatter = true;
    }
    if (isChatter) {
      lines.shift();
      continue;
    }
    break;
  }

  // Remove trailing chatter
  while (lines.length > 0) {
    const line = lines[lines.length - 1].trim().toLowerCase();
    if (!line) {
      lines.pop();
      continue;
    }
    let isChatter = false;
    const chatterPatternEnd = /^(chị có muốn|chị thấy sao|chúc chị|hy vọng|em đã hoàn thành|đã tạo|quy trình của em|em đã lưu|em đã xong|nếu chị cần|nếu chị muốn)/;
    
    if (chatterPatternEnd.test(line)) isChatter = true;
    if (line.includes("thực hiện tác vụ nào khác")) isChatter = true;
    if (line.startsWith("image prompt:")) isChatter = true;
    
    if (isChatter) {
      lines.pop();
      continue;
    }
    break;
  }

  text = lines.join('\n').trim();

  // Restore Image prompt if it was removed or separate it cleanly
  const imagePromptMatch = body.match(/\n*(Image prompt:[\s\S]*)$/i);
  if (imagePromptMatch) {
    // Check if current text already has it
    if (!text.toLowerCase().includes('image prompt:')) {
      text += '\n\n' + imagePromptMatch[1];
    } else {
      const parts = text.split(/\n*Image prompt:/i);
      if (parts.length > 1) {
        text = parts[0].trim() + '\n\nImage prompt:' + parts.slice(1).join('Image prompt:');
      }
    }
  }

  text = text.replace(/\n{3,}/g, '\n\n');
  return text;
}

// Simple CSV parser for standard format
function parseCSV(csvText) {
  const lines = [];
  let currentLine = [];
  let currentVal = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentVal);
      currentVal = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      if (char === '\r') i++;
      currentLine.push(currentVal);
      lines.push(currentLine);
      currentLine = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  
  if (currentVal || currentLine.length > 0) {
    currentLine.push(currentVal);
    lines.push(currentLine);
  }
  
  if (lines.length < 2) return [];
  
  const headers = lines[0].map(h => h.trim().toLowerCase());
  const bodyIdx = headers.findIndex(h => h === 'body');
  const nameIdx = headers.findIndex(h => h === 'name' || h === 'title');
  const typeIdx = headers.findIndex(h => h === 'content type' || h === 'type');
  
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length < Math.max(bodyIdx, nameIdx, typeIdx) + 1) continue;
    
    let body = bodyIdx >= 0 ? row[bodyIdx] : '';
    const name = nameIdx >= 0 ? row[nameIdx] : '';
    const type = typeIdx >= 0 ? row[typeIdx] : 'latc';
    
    if (!body && !name) continue;
    
    results.push({
      title: name.trim() || 'Imported Script',
      body: cleanBody(body),
      content_type: type.toLowerCase().includes('social') ? 'social_post' : 
                    type.toLowerCase().includes('tmt') ? 'tmt' : 
                    type.toLowerCase().includes('clip') ? 'short_clip' : 'latc',
      status: 'draft',
      track: 'wealth', // Default track
    });
  }
  
  return results;
}

// Split Markdown by headings (H1, H2, or H3) or HR (---)
function parseMarkdown(mdText) {
  // Try split by '---' if there are multiple sections
  let sections = mdText.split(/\n---\n/);
  if (sections.length < 2) {
    // Try split by ### or ##
    sections = mdText.split(/\n(?=###? )/);
  }
  
  const results = [];
  for (const sec of sections) {
    const trimSec = sec.trim();
    if (!trimSec) continue;
    
    let title = 'Imported Script';
    let body = trimSec;
    
    const titleMatch = trimSec.match(/^(?:###|##|#)\s+(.+)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
      body = trimSec.replace(/^(?:###|##|#)\s+(.+)\n*/, '').trim();
    }
    
    results.push({
      title,
      body: cleanBody(body),
      content_type: 'latc',
      status: 'draft',
      track: 'wealth'
    });
  }
  return results;
}

export default function CCImportModal({ isOpen, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError('');
      setSuccessCount(0);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Vui lòng chọn file.');
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setError('');
    
    try {
      const text = await file.text();
      let scriptsToImport = [];
      
      const ext = file.name.split('.').pop().toLowerCase();
      
      if (ext === 'csv') {
        scriptsToImport = parseCSV(text);
      } else if (ext === 'md' || ext === 'txt') {
        scriptsToImport = parseMarkdown(text);
      } else {
        throw new Error('Định dạng file không được hỗ trợ. Vui lòng dùng CSV, MD, hoặc TXT.');
      }
      
      if (scriptsToImport.length === 0) {
        throw new Error('Không tìm thấy nội dung hợp lệ trong file.');
      }
      
      let imported = 0;
      for (const script of scriptsToImport) {
        const res = await fetch('/api/ops/content-pipeline/scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(script)
        });
        
        if (!res.ok) {
          console.error(`Failed to import script: ${script.title}`);
        } else {
          imported++;
        }
        setProgress(Math.round((imported / scriptsToImport.length) * 100));
      }
      
      setSuccessCount(imported);
      setTimeout(() => {
        onImportSuccess?.();
        onClose();
      }, 1500);
      
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi import.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4">
      <Card variant="glass" className="w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-gold" />
            <h2 className="font-heading font-semibold text-txt">Import Nội Dung</h2>
          </div>
          <button
            onClick={onClose}
            className="text-txt-3 hover:text-txt transition-colors"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {!isProcessing && successCount === 0 ? (
            <>
              <div 
                className="border-2 border-dashed border-border hover:border-gold/50 rounded-xl p-8 text-center cursor-pointer transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  accept=".csv,.md,.txt" 
                  onChange={handleFileChange}
                />
                <FileText size={32} className="mx-auto text-txt-3 mb-3" />
                <p className="text-sm font-semibold text-txt mb-1">
                  {file ? file.name : "Kéo thả hoặc Click để chọn file"}
                </p>
                <p className="text-xs text-txt-3">
                  Hỗ trợ: CSV, Markdown (.md), Text (.txt)
                </p>
              </div>
              
              {error && (
                <div className="flex items-center gap-2 text-danger bg-danger/10 p-3 rounded-lg text-sm">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              {successCount > 0 && progress === 100 ? (
                <>
                  <CheckCircle2 size={48} className="mx-auto text-success mb-4" />
                  <p className="font-heading font-bold text-lg text-txt mb-1">Import Thành Công!</p>
                  <p className="text-sm text-txt-2">Đã import {successCount} kịch bản.</p>
                </>
              ) : (
                <>
                  <Loader2 size={40} className="mx-auto text-gold animate-spin mb-4" />
                  <p className="font-heading font-bold text-txt mb-2">Đang xử lý nội dung...</p>
                  <div className="w-full bg-bg-3 rounded-full h-2 mt-4 overflow-hidden">
                    <div 
                      className="bg-gold h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-txt-3 mt-2">{progress}% hoàn thành</p>
                </>
              )}
            </div>
          )}
        </div>
        
        {!isProcessing && successCount === 0 && (
          <div className="p-4 border-t border-border/50 bg-bg-2 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>Hủy</Button>
            <Button variant="gold" onClick={handleImport} disabled={!file}>
              Bắt Đầu Import
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
