import type { BytemdPlugin } from 'bytemd';
import { visit } from 'unist-util-visit';

function normalizeMermaidLine(line: string): string {
  // Mermaid v10 对部分字符更敏感，先去掉常见 emoji 避免 parser 报错。
  let next = line.replace(/[\u{1F300}-\u{1FAFF}]/gu, '');

  // 将 `A -- 文本 --> B` 统一为 `A -->|文本| B`，减少带中英文标点时的语法歧义。
  next = next.replace(/--\s*(.*?)\s*-->/g, (all, rawLabel: string) => {
    const label = (rawLabel || '').trim();
    if (!label) return all;
    return `-->|${label}|`;
  });

  return next;
}

function normalizeMermaidCode(code: string): string {
  return code
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => normalizeMermaidLine(line))
    .join('\n');
}

export function mermaidCompat(): BytemdPlugin {
  return {
    remark: (processor) =>
      processor.use(() => (tree) => {
        visit(tree, 'code', (node: any) => {
          if (node?.lang !== 'mermaid' || typeof node?.value !== 'string') {
            return;
          }
          node.value = normalizeMermaidCode(node.value);
        });
      }),
  };
}
