import { visit } from 'unist-util-visit';

export function remarkGemIssues() {
  return (tree: any) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || parent.type === 'link') return;

      const regex = /\b(GEM-\d+)\b/g;
      const text = node.value;
      const matches = [...text.matchAll(regex)];

      if (matches.length === 0) return;

      const newChildren: any[] = [];
      let lastIndex = 0;

      for (const match of matches) {
        const startIndex = match.index!;
        const gemId = match[0];

        if (startIndex > lastIndex) {
          newChildren.push({ type: 'text', value: text.slice(lastIndex, startIndex) });
        }

        newChildren.push({
          type: 'link',
          url: `/issues/${gemId}`,
          data: {
             hProperties: {
               className: "paperclip-mention-chip paperclip-mention-chip--issue inline-flex items-center rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-tight text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors mx-0.5",
               "data-mention-kind": "issue",
             }
          },
          children: [{ type: 'text', value: gemId }],
        });

        lastIndex = startIndex + gemId.length;
      }

      if (lastIndex < text.length) {
        newChildren.push({ type: 'text', value: text.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...newChildren);
      return index + newChildren.length;
    });
  };
}
