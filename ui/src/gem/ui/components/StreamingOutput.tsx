'use client';

import React, { useEffect, useRef } from 'react';
import { Loader2, Square, Copy, Check, Download, RefreshCw } from 'lucide-react';

// ============================================================================
// Streaming Output — Displays AI generation output in real-time
// ============================================================================

interface StreamingOutputProps {
  content: string;
  isGenerating: boolean;
  progress?: number;
  onCancel?: () => void;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onSave?: () => void;
  className?: string;
}

export function StreamingOutput({
  content,
  isGenerating,
  progress,
  onCancel,
  onCopy,
  onRegenerate,
  onSave,
  className = '',
}: StreamingOutputProps): React.JSX.Element {
  const outputRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Auto-scroll to bottom during generation
  useEffect(() => {
    if (isGenerating && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [content, isGenerating]);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy();
    } else {
      try {
        await navigator.clipboard.writeText(content);
      } catch {
        // ignore
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!content && !isGenerating) {
    return <></>;
  }

  return (
    <div className={`card overflow-hidden ${className}`}>
      {/* Progress bar */}
      {isGenerating && progress !== undefined && (
        <div className="h-1 bg-bg-4">
          <div
            className="h-full bg-gradient-to-r from-gold to-purple transition-all duration-300"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-xs">
          {isGenerating ? (
            <>
              <Loader2 size={14} className="animate-spin text-gold" />
              <span className="text-gold">Đang tạo nội dung...</span>
              {progress !== undefined && (
                <span className="text-txt-3">{Math.round(progress)}%</span>
              )}
            </>
          ) : (
            <span className="text-success">Hoàn thành</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isGenerating && onCancel && (
            <button
              onClick={onCancel}
              className="btn btn-gh text-xs px-2 py-1 text-danger"
              title="Hủy"
            >
              <Square size={14} />
            </button>
          )}
          {!isGenerating && content && (
            <>
              <button
                onClick={handleCopy}
                className="btn btn-gh text-xs px-2 py-1"
                title="Sao chép"
              >
                {copied ? (
                  <Check size={14} className="text-success" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="btn btn-gh text-xs px-2 py-1"
                  title="Tạo lại"
                >
                  <RefreshCw size={14} />
                </button>
              )}
              {onSave && (
                <button
                  onClick={onSave}
                  className="btn btn-g text-xs px-2 py-1"
                  title="Lưu"
                >
                  <Download size={14} />
                  <span className="ml-1">Lưu</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        ref={outputRef}
        className="p-4 max-h-[600px] overflow-y-auto font-mono text-sm text-txt-2 leading-relaxed whitespace-pre-wrap"
      >
        {content}
        {isGenerating && (
          <span className="inline-block w-2 h-4 ml-1 bg-gold animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}
