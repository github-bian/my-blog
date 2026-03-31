import { useParams, Link } from "react-router-dom";
import { usePostQuery } from "../hooks/queries/usePosts";
import { MagneticButton } from "../components/MagneticButton";
import { MarkdownArticle } from "../components/MarkdownArticle";
import { useAuth } from "../auth/auth";
import { useState, useCallback } from "react";
import { apiJson, ApiError } from "../lib/api";

export default function PostDetailSection() {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading: loading, error, refetch } = usePostQuery(id || "");
  const { state, isAuthed, logout } = useAuth();
  
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);

  const handleLike = useCallback(async () => {
    if (!id) return;
    try {
      setLikeLoading(true);
      setLikeError(null);
      const response = await apiJson<{ post: { likesCount: number } }>(`/api/v1/posts/${id}/like`, {
        method: "POST",
      });
      setLikesCount(response.post.likesCount);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setLikeError(e.message);
      } else {
        setLikeError("点赞失败");
      }
    } finally {
      setLikeLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <section className="section">
        <div className="glassCard">
          <div className="skeletonCard" style={{ height: "400px" }} />
        </div>
      </section>
    );
  }

  if (error || !post) {
    return (
      <section className="section">
        <div className="glassCard">
          <div className="errorNote">
            {error instanceof Error ? error.message : "文章加载失败"}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <Link to="/#content">
              <MagneticButton>返回博客列表</MagneticButton>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="glassCard">
        <div className="sectionHeaderRow">
          <h2 className="sectionTitle">{post.title}</h2>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span className="metaText">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
            {post.category && (
              <span className="pill">{post.category.name}</span>
            )}
          </div>
        </div>

        {/* 标签 */}
        {post.tags.length > 0 && (
          <div className="pillRow" style={{ marginBottom: "1.5rem" }}>
            {post.tags.map((tag) => (
              <span key={tag.id} className="pill">
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* 文章正文 */}
        <MarkdownArticle content={post.content} className="postContent" />

        {/* 点赞区域 */}
        <div className="metaRow" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <MagneticButton
              onClick={() => void handleLike()}
              disabled={likeLoading}
              ariaLabel="点赞文章"
            >
              {likeLoading ? "点赞中..." : `点赞 (${likesCount || post.likesCount})`}
            </MagneticButton>
            {likeError && <span className="errorNote">{likeError}</span>}
          </div>
          <span className="metaText">阅读量: {post.viewCount}</span>
        </div>

        {/* 返回按钮 */}
        <div style={{ marginTop: "2rem" }}>
          <Link to="/#content">
            <MagneticButton>返回博客列表</MagneticButton>
          </Link>
        </div>

        {/* 评论区域占位符 */}
        <div style={{ marginTop: "3rem", borderTop: "1px solid var(--glassBorder)", paddingTop: "2rem" }}>
          <h3 className="sectionTitle">评论</h3>
          <p className="hintText">评论功能开发中...</p>
        </div>
      </div>
    </section>
  );
}