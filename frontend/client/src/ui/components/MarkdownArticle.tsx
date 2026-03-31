import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

type MarkdownArticleProps = {
  content: string;
  className?: string;
};

const htmlTagPattern = /<\/?[a-z][\s\S]*>/i;
const markdownImagePattern = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/i;
const htmlImagePattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;

export function isHtmlContent(content: string) {
  return htmlTagPattern.test(content);
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
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}