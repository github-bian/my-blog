import { useEffect, useMemo } from "react";
import { MarkdownArticle } from "./MarkdownArticle";
import { usePostQuery } from "../hooks/queries/usePosts";

type Post = {
  id: number;
  authorId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type PostDetailModalProps = {
  postId: number | null;
  onClose: () => void;
};

export function PostDetailModal({ postId, onClose }: PostDetailModalProps) {
  const { data, isLoading: loading, error: queryError } = usePostQuery(postId ? String(postId) : "");
  const post = (data as any)?.post ?? data;
  const error = queryError ? (queryError as Error).message : null;

  useEffect(() => {
    if (!postId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [postId, onClose]);

  const title = useMemo(() => {
    if (loading) return "加载中…";
    if (error) return "加载失败";
    return post?.title ?? "详情";
  }, [loading, error, post?.title]);

  if (!postId) return null;

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="文章详情"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glassCard modalCard">
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button type="button" className="iconButton" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        {loading && <div className="hintText">正在加载…</div>}
        {error && <div className="errorNote">{error}</div>}

        {!loading && !error && post && (
          <div className="postDetail">
            <div className="postMeta">
              <span className="metaText">
                {new Date(post.createdAt).toLocaleString()}
              </span>
            </div>
            <MarkdownArticle content={post.content} className="postContent" />
          </div>
        )}
      </div>
    </div>
  );
}

