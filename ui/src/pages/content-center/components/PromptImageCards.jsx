/**
 * PromptImageCards — Shared component
 * Hiển thị tối đa 7 prompt ảnh trích xuất từ output AI (social content).
 * Dùng chung: CCAIGen (social_post type), CCScriptDetail, ContentTab results.
 *
 * Props:
 *   output       — string: toàn bộ raw output từ AI
 *   onCopy       — (text: string) => void: callback khi copy (optional, mặc định dùng clipboard)
 *   addToast     — ({ type, message }) => void: toast function
 */
import { useState, useCallback } from 'react';
import { ImageIcon, Copy, Check } from 'lucide-react';
import { Button } from '@gem/ui';

// Parser: trích tối đa 7 prompt từ raw output
function parsePromptCards(output) {
  if (!output) return [];
  const lower = output.toLowerCase();
  if (!lower.includes('prompt cho ')) return [];

  const firstIdx = lower.indexOf('prompt cho ');
  const workingText = firstIdx >= 0 ? output.slice(firstIdx) : output;
  const parts = workingText.split(/(?=PROMPT CHO )/i).map(s => s.trim()).filter(Boolean).slice(0, 7);

  if (parts.length > 1) return parts;

  // Fallback: phân tách theo "Ảnh N" heading
  const lines = output.split('\n');
  const result = [];
  let current = '';
  const isHead = (l) =>
    /^(?:#{1,3}\s*)?(?:Ảnh|Anh|ANH)\s*[1-7](?:\s*[-:—]|$)/i.test(l.trim())
    || /^PROMPT CHO /i.test(l.trim());

  for (const line of lines) {
    if (isHead(line)) {
      if (current.trim()) result.push(current.trim());
      current = line + '\n';
    } else {
      current += line + '\n';
    }
  }
  if (current.trim()) result.push(current.trim());
  return result.length > 1 ? result.slice(0, 7) : [output];
}

export function PromptImageCards({ output, addToast }) {
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState({});

  const cards = parsePromptCards(output);

  // Hooks must run UNCONDITIONALLY before any early return (Rules of Hooks).
  // Previously hooks were declared after `if (!cards.length) return null` which
  // caused React error #310 when `output` toggled between empty and non-empty
  // — different hook counts across renders.
  const handleCopyCard = useCallback(async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      addToast?.({ type: 'error', message: 'Lỗi copy.' });
    }
  }, [addToast]);

  const handleCopyAll = useCallback(async () => {
    try {
      const fullText = cards.map(c => '=========================================\n' + c).join('\n\n');
      await navigator.clipboard.writeText(fullText);
      addToast?.({ type: 'success', message: 'Đã sao chép TẤT CẢ prompt.' });
    } catch {
      addToast?.({ type: 'error', message: 'Lỗi copy.' });
    }
  }, [cards, addToast]);

  if (!cards.length) return null;

  const toggleCard = (idx) => setCollapsedCards(prev => ({ ...prev, [idx]: !prev[idx] }));

  return (
    <div className="mt-4 pt-4 border-t border-border">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setCollapsed(c => !c)}
        >
          <ImageIcon size={14} className="text-purple" />
          <h4 className="text-xs font-semibold text-purple uppercase tracking-wider">
            🎨 Prompt Hình Ảnh ({cards.length}/7)
          </h4>
          <span className="text-txt-3 text-xs">{collapsed ? '▶ Mở rộng' : '▼ Thu gọn'}</span>
        </div>
        <Button variant="outline" size="sm" icon={Copy} onClick={handleCopyAll}>
          Sao Chép Tất Cả
        </Button>
      </div>

      {/* Cards grid */}
      {!collapsed && (
        <div className="grid gap-2">
          {cards.map((card, idx) => {
            const isCardCollapsed = !!collapsedCards[idx];
            return (
              <div key={idx} className="rounded-card border border-purple/20 bg-purple/5">
                {/* Card header */}
                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-purple/10 transition-colors rounded-card"
                  onClick={() => toggleCard(idx)}
                >
                  <span className="text-xs font-semibold text-purple">
                    {isCardCollapsed ? '▶' : '▼'} Ảnh {idx + 1}
                  </span>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleCopyCard(card, idx)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-purple/30 bg-purple/10 text-purple hover:bg-purple/20 transition-all"
                    >
                      {copiedIdx === idx
                        ? <><Check size={11} /><span>Đã copy!</span></>
                        : <><Copy size={11} /><span>Copy</span></>
                      }
                    </button>
                  </div>
                </div>

                {/* Card content */}
                {!isCardCollapsed && (
                  <div className="px-3 pb-3">
                    <pre className="text-xs text-txt-2 leading-relaxed whitespace-pre-wrap font-sans">
                      {card}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Design system hint */}
      <div className="mt-2 p-2 rounded-card bg-glass-bg border border-gold/20">
        <p className="text-xxs font-semibold text-gold mb-0.5">Design System (tự ghép khi copy từng ảnh)</p>
        <p className="text-xxs text-txt-3 font-mono">Navy #112250 · Gold #FFBD59 · Purple #6A5BFF · 3:4 · gemral.com</p>
      </div>
    </div>
  );
}

export default PromptImageCards;
