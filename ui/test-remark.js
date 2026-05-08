const { unified } = require('unified');
const markdown = require('remark-parse');
const { visit } = require('unist-util-visit');

function remarkGemIssues() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || parent.type === 'link') return;

      const regex = /\b(GEM-\d+)\b/g;
      const text = node.value;
      const matches = [...text.matchAll(regex)];

      if (matches.length === 0) return;

      const newChildren = [];
      let lastIndex = 0;

      for (const match of matches) {
        const startIndex = match.index;
        const gemId = match[0];

        if (startIndex > lastIndex) {
          newChildren.push({ type: 'text', value: text.slice(lastIndex, startIndex) });
        }

        newChildren.push({
          type: 'link',
          url: `/issues/${gemId}`,
          data: {
             hProperties: {
               className: "paperclip-mention-chip paperclip-mention-chip--issue",
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

const processor = unified().use(markdown).use(remarkGemIssues);
const result = processor.parse('This is a test GEM-123 and GEM-456.');
const transformed = processor.runSync(result);
console.log(JSON.stringify(transformed, null, 2));
