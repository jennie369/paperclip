/**
 * MessageContent — render war room message text as Markdown.
 * Uses react-markdown + remark-gfm for tables, strikethrough, task lists.
 * No raw HTML allowed → safe by default. Links open in new tab with rel=noopener.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="px-1 py-0.5 rounded bg-muted/60 text-[0.85em] text-amber-600 dark:text-amber-400 font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={`${className ?? ""} font-mono text-[12px]`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-1.5 p-2.5 rounded-md bg-black/30 dark:bg-black/40 border border-border overflow-x-auto text-[12px] leading-relaxed">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-1 pl-2.5 border-l-[3px] border-primary/40 text-muted-foreground">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => <ul className="my-1 pl-5 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 pl-5 list-decimal space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h1 className="text-[1.15em] font-bold mt-1.5 mb-0.5">{children}</h1>,
  h2: ({ children }) => <h2 className="text-[1.08em] font-semibold mt-1.5 mb-0.5">{children}</h2>,
  h3: ({ children }) => <h3 className="text-[1.02em] font-semibold mt-1 mb-0.5">{children}</h3>,
  table: ({ children }) => (
    <div className="my-1.5 overflow-x-auto">
      <table className="border-collapse text-[12px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border px-2 py-1 bg-muted/40 font-semibold text-left">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
  hr: () => <hr className="my-2 border-border" />,
  p: ({ children }) => <p className="my-0 leading-relaxed">{children}</p>,
};

export function MessageContent({ children }: { children: string }) {
  return (
    <div className="text-[13px] leading-relaxed text-foreground/85 break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
