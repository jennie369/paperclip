'use client';

import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  copyable?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  maxHeight,
  copyable = true,
  className,
}: CodeBlockProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Không làm gì
    }
  }, [code]);

  const lines = code.split('\n');

  return (
    <div className={cn('relative group', className)}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-2 rounded-t-badge">
        {/* Language badge */}
        {language && (
          <span className="text-xxs font-semibold uppercase tracking-wider text-txt-3">
            {language}
          </span>
        )}
        {!language && <span />}

        {/* Copy button */}
        {copyable && (
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 text-xxs text-txt-3',
              'hover:text-txt transition-colors duration-fast',
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
            )}
            onClick={handleCopy}
            aria-label={copied ? 'Đã sao chép' : 'Sao chép mã nguồn'}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                <span className="text-success">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Code area */}
      <div
        className="cb rounded-t-none"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        {showLineNumbers ? (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, index) => (
                <tr key={index}>
                  <td className="pr-4 text-right select-none text-txt-3/50 w-[1%] whitespace-nowrap align-top">
                    {index + 1}
                  </td>
                  <td className="pl-4 border-l border-border whitespace-pre">
                    {line || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <code>{code}</code>
        )}
      </div>
    </div>
  );
}
