import { useEffect, useMemo, useRef, useState } from "react";
import hljs from "highlight.js";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
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

let mermaidBootstrapped = false;

function normalizeCode(value: React.ReactNode): string {
  return String(value ?? "").replace(/\n$/, "");
}

function parseLanguage(className?: string): string {
  const lang = className?.match(/language-([\w-]+)/)?.[1] ?? "";
  return lang.toLowerCase();
}

function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;

    async function renderMermaid() {
      try {
        const mermaid = (await import("mermaid")).default;

        if (!mermaidBootstrapped) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme: "default",
          });
          mermaidBootstrapped = true;
        }

        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const result = await mermaid.render(id, code);
        if (disposed) return;
        setSvg(result.svg);
        setError("");
      } catch (e) {
        if (disposed) return;
        setSvg("");
        setError(e instanceof Error ? e.message : "Mermaid 渲染失败");
      }
    }

    void renderMermaid();

    return () => {
      disposed = true;
    };
  }, [code]);

  return (
    <div className="markdownDiagramBlock" data-diagram="mermaid">
      <div className="markdownDiagramBlock__header">Mermaid Diagram</div>
      {error ? (
        <div className="markdownDiagramBlock__error">{error}</div>
      ) : svg ? (
        <div className="markdownDiagramBlock__content" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="markdownDiagramBlock__loading">图表渲染中...</div>
      )}
    </div>
  );
}

function EChartsBlock({ code }: { code: string }) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");

  const option = useMemo(() => {
    try {
      return JSON.parse(code);
    } catch {
      return null;
    }
  }, [code]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!option) {
      setError("ECharts 配置解析失败：请确保代码块是合法 JSON");
      return;
    }

    let disposed = false;
    let resizeHandler: (() => void) | null = null;
    let chart: { dispose: () => void; resize: () => void; setOption: (value: unknown) => void } | null = null;

    async function renderChart() {
      try {
        const echarts = await import("echarts");
        if (disposed || !chartRef.current) return;
        chart = echarts.init(chartRef.current);
        chart.setOption(option);
        resizeHandler = () => chart?.resize();
        window.addEventListener("resize", resizeHandler);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "ECharts 渲染失败");
      }
    }

    void renderChart();

    return () => {
      disposed = true;
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      chart?.dispose();
    };
  }, [option]);

  return (
    <div className="markdownDiagramBlock" data-diagram="echarts">
      <div className="markdownDiagramBlock__header">ECharts</div>
      {error ? (
        <div className="markdownDiagramBlock__error">{error}</div>
      ) : (
        <div className="markdownChartBlock" ref={chartRef} />
      )}
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
    return hljs.highlightAuto(code).value;
  }, [code, language]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="markdownCodeBlock">
      <div className="markdownCodeBlock__bar">
        <span className="markdownCodeBlock__lang">{language || "text"}</span>
        <button type="button" className="markdownCodeBlock__copy" onClick={() => void copyCode()}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre>
        <code
          className={["hljs", language ? `language-${language}` : ""].filter(Boolean).join(" ")}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
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
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children, ...props }) => {
    const code = normalizeCode(children);
    const isInline = !className?.includes("language-") && !code.includes("\n");

    if (isInline) {
      return <code {...props}>{children}</code>;
    }

    const language = parseLanguage(className);

    if (language === "mermaid") {
      return <MermaidBlock code={code} />;
    }

    if (language === "echarts") {
      return <EChartsBlock code={code} />;
    }

    return <CodeBlock language={language} code={code} />;
  },
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
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}