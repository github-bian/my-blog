import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

type MarkdownArticleProps = {
  content: string;
  className?: string;
};

const htmlTagPattern = /<\/?[a-z][\w:-]*(\s[^>]*)?>/i;
const markdownImagePattern = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/i;
const htmlImagePattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;

export function isHtmlContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("<")) return false;
  return htmlTagPattern.test(trimmed);
}

export function extractCoverFromContent(content: string) {
  return content.match(htmlImagePattern)?.[1] ?? content.match(markdownImagePattern)?.[1] ?? null;
}

export function excerptFromContent(content: string, limit = 140) {
  const plainText = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\(([^)]+)\)/g, " ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length <= limit) return plainText;
  return `${plainText.slice(0, limit)}…`;
}

function flattenNodeText(children: React.ReactNode): string {
  return Array.isArray(children)
    ? children.map((child) => flattenNodeText(child)).join("")
    : typeof children === "string" || typeof children === "number"
      ? String(children)
      : children && typeof children === "object" && "props" in children
        ? flattenNodeText((children as { props?: { children?: React.ReactNode } }).props?.children ?? "")
        : "";
}

function headingIdFromChildren(children: React.ReactNode): string {
  return flattenNodeText(children)
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-");
}

const markdownComponents: Components = {
  h1: ({ children, ...props }) => <h1 id={headingIdFromChildren(children)} {...props}>{children}</h1>,
  h2: ({ children, ...props }) => <h2 id={headingIdFromChildren(children)} {...props}>{children}</h2>,
  h3: ({ children, ...props }) => <h3 id={headingIdFromChildren(children)} {...props}>{children}</h3>,
  h4: ({ children, ...props }) => <h4 id={headingIdFromChildren(children)} {...props}>{children}</h4>,
};

export function MarkdownArticle({ content, className }: MarkdownArticleProps) {
  if (!content.trim()) {
    return <div className={["markdownArticle", className].filter(Boolean).join(" ")} />;
  }

  if (isHtmlContent(content)) {
    return (
      <div
        className={["markdownArticle", "quill-content", className].filter(Boolean).join(" ")}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className={["markdownArticle", className].filter(Boolean).join(" ")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}