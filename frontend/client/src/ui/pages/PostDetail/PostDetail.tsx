import { useParams, useNavigate, Link } from "react-router-dom";
import { usePostQuery } from "../../hooks/queries/usePosts";
import { MagneticButton } from "../../components/MagneticButton";
import { useAuth } from "../../auth/auth";
import { useState, useCallback } from "react";
import { apiJson, ApiError } from "../../lib/api";
import { MarkdownArticle } from "../../components/MarkdownArticle";

interface Comment {
  id: number;
  postId: number;
  authorId: number;
  parentId: number | null;
  content: string;
  status: string;
  likesCount: number;
  createdAt: string;
  author: {
    id: number;
    email: string;
    displayName: string;
    role: string;
    avatarUrl: string | null;
  };
}

interface CommentListResponse {
  items: Comment[];
  total: number;
}

type EditablePost = {
  id: number;
  authorId: number;
  title: string;
  summary?: string | null;
  content: string;
  categoryId?: number | null;
  category?: { id: number; name: string; slug: string } | null;
  tags?: Array<{ id: number; name: string; slug: string }>;
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: postData, isLoading, error } = usePostQuery(id ?? "");
  const { state, isAuthed } = useAuth();

  const post = (postData as any)?.post ?? postData;

  // 点赞状态
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);

  // 评论状态
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 加载评论
  const loadComments = useCallback(async () => {
    if (!id) return;
    try {
      setCommentsLoading(true);
      setCommentsError(null);
      const data = await apiJson<CommentListResponse>(`/api/v1/comments/post/${id}`);
      setComments(data.items);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setCommentsError(e.message);
      } else {
        setCommentsError("加载评论失败");
      }
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  // 点赞文章
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

  // 提交评论
  const handleSubmitComment = useCallback(async () => {
    if (!id || !state?.accessToken || !newComment.trim()) return;
    try {
      setSubmitting(true);
      setSubmitError(null);
      await apiJson(`/api/v1/comments/post/${id}`, {
        method: "POST",
        body: JSON.stringify({ content: newComment.trim() }),
        token: state.accessToken,
      });
      setNewComment("");
      await loadComments(); // 重新加载评论
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setSubmitError(e.message);
      } else {
        setSubmitError("发表评论失败");
      }
    } finally {
      setSubmitting(false);
    }
  }, [id, state?.accessToken, newComment, loadComments]);

  if (isLoading) {
    return (
      <div className="section" style={{ minHeight: "100vh", paddingTop: "120px" }}>
        <div className="glassCard skeletonCard" style={{ height: "400px" }} />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="section" style={{ minHeight: "100vh", paddingTop: "120px" }}>
        <div className="glassCard">
          <div className="errorNote">{error ? (error as Error).message : "文章不存在或已被删除"}</div>
          <div style={{ marginTop: "20px" }}>
            <MagneticButton onClick={() => navigate("/posts")} ariaLabel="返回列表">
              返回列表
            </MagneticButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section articlePage">
      <div className="glassCard articleCard">
        <div className="articleTopBar">
          <MagneticButton onClick={() => navigate("/archive")} ariaLabel="返回列表">
            返回列表
          </MagneticButton>
          
          {isAuthed && state?.user?.id === post.authorId && (
            <MagneticButton 
              onClick={() =>
                navigate("/editor", {
                  state: {
                    post: {
                      id: post.id,
                      authorId: post.authorId,
                      title: post.title,
                      summary: post.summary,
                      content: post.content,
                      categoryId: post.categoryId,
                      category: post.category,
                      tags: post.tags,
                    } satisfies EditablePost,
                  },
                })
              }
              ariaLabel="编辑文章"
            >
              编辑文章
            </MagneticButton>
          )}
        </div>
        
        <h1 className="articleTitle">
          {post.title}
        </h1>
        
        <div className="postMeta articleMetaBar">
          <span className="metaText">
            作者：{post.author?.displayName || "佚名"}
          </span>
          <span className="metaText" style={{ marginLeft: "16px" }}>
            发布于：{new Date(post.createdAt).toLocaleString()}
          </span>
          {post.category && (
            <span className="metaText" style={{ marginLeft: "16px" }}>
              分类：{post.category.name}
            </span>
          )}
          <span className="metaText" style={{ marginLeft: "16px" }}>
            阅读：{post.viewCount || 0}
          </span>
        </div>

        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <div className="pillRow" style={{ marginBottom: "2rem" }}>
            {post.tags.map((tag: any) => (
              <Link
                key={tag.id}
                to={`/posts?tagId=${tag.id}`}
                className="pill"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* 文章正文 */}
        <MarkdownArticle content={post.content} className="postContent articleMarkdown" />

        {/* 点赞区域 */}
        <div className="metaRow" style={{ marginBottom: "2rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
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
        </div>

        {/* 评论区域 */}
        <div className="articleComments">
          <h3 className="sectionTitle">评论 ({comments.length})</h3>
          
          {/* 发表评论表单 */}
          {isAuthed ? (
            <div className="articleComposer">
              <textarea
                className="textarea"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="写下你的评论..."
                rows={3}
                style={{ width: "100%", marginBottom: "1rem" }}
                disabled={submitting}
              />
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <MagneticButton
                  onClick={() => void handleSubmitComment()}
                  disabled={submitting || !newComment.trim()}
                  ariaLabel="发表评论"
                >
                  {submitting ? "发表中..." : "发表评论"}
                </MagneticButton>
                {submitError && <span className="errorNote">{submitError}</span>}
              </div>
            </div>
          ) : (
            <div className="articleComposer">
              <p className="hintText">请先 <Link to="/login" style={{ color: "var(--accentB)" }}>登录</Link> 后发表评论</p>
            </div>
          )}

          {/* 评论列表 */}
          {commentsLoading ? (
            <div className="hintText">加载评论中...</div>
          ) : commentsError ? (
            <div className="errorNote">{commentsError}</div>
          ) : comments.length === 0 ? (
            <div className="hintText">暂无评论，来发表第一条评论吧。</div>
          ) : (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {comments.map((comment) => (
                <div key={comment.id} className="glassCard glassCard--nested" style={{ padding: "1.5rem" }}>
                  <div className="metaRow" style={{ marginBottom: "0.5rem" }}>
                    <span className="metaText">
                      {comment.author?.displayName || "匿名用户"}
                    </span>
                    <span className="metaText">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, lineHeight: 1.6 }}>{comment.content}</p>
                  <div style={{ marginTop: "0.5rem" }}>
                    <span className="metaText">点赞: {comment.likesCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}