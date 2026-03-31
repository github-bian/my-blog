import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "./Editor.css";

import { useAuth } from "../../auth/auth";
import CollabEditor, { getEditorMarkdown, type CollabUser } from "../../components/CollabEditor";
import { excerptFromContent } from "../../components/MarkdownArticle";
import { useCategoriesQuery, useTagsQuery } from "../../hooks/queries/useTaxonomies";
import { apiJson } from "../../lib/api";

type EditorPostState = {
  id: number;
  title?: string;
  summary?: string | null;
  content?: string;
  categoryId?: number | null;
  tags?: Array<{ id: number; name: string; slug: string }>;
};

export default function Editor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useAuth();

  const existingPost = location.state?.post as EditorPostState | undefined;
  const isEditing = Boolean(existingPost?.id);

  const categoriesQuery = useCategoriesQuery();
  const tagsQuery = useTagsQuery();

  const [title, setTitle] = useState(existingPost?.title ?? "");
  const [summary, setSummary] = useState(existingPost?.summary ?? "");
  const [categoryId, setCategoryId] = useState<number | undefined>(existingPost?.categoryId ?? undefined);
  const [tagIds, setTagIds] = useState<number[]>(existingPost?.tags?.map((tag) => tag.id) ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 字数统计：由 CollabEditor onChange 回调实时更新
  const [wordCount, setWordCount] = useState(0);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 300));

  // 协作房间名：编辑已有文章用 post-<id>，新文章用临时 ID
  const roomName = useMemo(
    () => (isEditing ? `post-${existingPost?.id}` : `new-${Date.now()}`),
    [isEditing, existingPost?.id],
  );

  // 协作用户信息
  const collabUser: CollabUser | null = state
    ? { id: state.user.id, name: state.user.displayName, avatarUrl: (state.user as any).avatarUrl }
    : null;

  const handleContentChange = useCallback((md: string) => {
    const plain = excerptFromContent(md, Number.MAX_SAFE_INTEGER);
    setWordCount(plain ? plain.split(/\s+/).filter(Boolean).length : 0);
  }, []);

  function toggleTag(tagId: number) {
    setTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
  }

  function validate(status: "draft" | "published") {
    if (!state?.accessToken) return "请先登录后再发布文章";
    if (!title.trim()) return "标题不能为空";
    if (title.trim().length > 120) return "标题不能超过 120 个字符";
    if (status === "published") {
      const md = getEditorMarkdown();
      if (!md.trim()) return "正文不能为空";
    }
    return null;
  }

  async function submitPost(status: "draft" | "published") {
    const validationMessage = validate(status);
    if (validationMessage) {
      setErrorMsg(validationMessage);
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const content = getEditorMarkdown();
      const endpoint = isEditing ? `/api/v1/posts/${existingPost?.id}` : "/api/v1/posts";
      const method = isEditing ? "PUT" : "POST";
      const response = await apiJson<{ post: { id: number } }>(endpoint, {
        method,
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          content: content.trim(),
          categoryId: categoryId ?? null,
          tagIds,
          status,
        }),
        token: state?.accessToken,
      });

      if (status === "draft") return;

      navigate(`/posts/${response.post.id}`);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "提交失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!collabUser) {
    return (
      <div className="editorPage reveal">
        <div className="glassCard editorCard" style={{ textAlign: "center", padding: 60 }}>
          <h2>请先登录</h2>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>协作编辑器需要登录才能使用</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editorPage reveal">
      <div className="glassCard editorCard">
        {/* ---- 顶部信息 ---- */}
        <div className="editorHeader">
          <div className="editorHeader__left">
            <p className="editorEyebrow">Collaborative Editor</p>
            <h1 className="editorTitle">{isEditing ? "编辑文章" : "创建新文章"}</h1>
            <p className="editorLead">
              多人实时协作 · 所见即所得 · 支持 Markdown 语法
            </p>
          </div>
          <div className="editorStats glassCard glassCard--nested">
            <div className="editorStat">
              <span className="editorStat__value">{wordCount}</span>
              <span className="editorStat__label">字数</span>
            </div>
            <div className="editorStat">
              <span className="editorStat__value">{readingMinutes}</span>
              <span className="editorStat__label">分钟</span>
            </div>
          </div>
        </div>

        {errorMsg && <div className="errorNote">{errorMsg}</div>}

        {/* ---- 元数据表单 ---- */}
        <div className="editorMeta">
          <div className="editorMetaGrid">
            <div className="field">
              <label className="label">标题</label>
              <input
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="输入一个清晰、有辨识度的标题"
                maxLength={120}
              />
            </div>
            <div className="field">
              <label className="label">摘要</label>
              <textarea
                className="textarea editorSummary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="用 2 到 3 句话概括文章核心内容"
                rows={2}
              />
            </div>
          </div>

          <div className="editorMetaGrid">
            <div className="field">
              <label className="label">分类</label>
              <div className="taxChips">
                <button
                  type="button"
                  className={["chip", categoryId == null ? "chip--active" : ""].filter(Boolean).join(" ")}
                  onClick={() => setCategoryId(undefined)}
                >
                  未分类
                </button>
                {(categoriesQuery.data?.items ?? []).map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={["chip", categoryId === category.id ? "chip--active" : ""].filter(Boolean).join(" ")}
                    onClick={() => setCategoryId(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="label">标签</label>
              <div className="taxChips">
                {(tagsQuery.data?.items ?? []).map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={["chip", tagIds.includes(tag.id) ? "chip--active" : ""].filter(Boolean).join(" ")}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ---- 协作编辑器 ---- */}
        <CollabEditor
          roomName={roomName}
          user={collabUser}
          initialContent={existingPost?.content}
          onChange={handleContentChange}
        />

        {/* ---- 操作按钮 ---- */}
        <div className="editorActions">
          <button
            type="button"
            className="magneticButton magneticButton--ghost"
            disabled={isSubmitting}
            onClick={() => void submitPost("draft")}
          >
            <span className="magneticButton__inner">保存草稿</span>
          </button>
          <button
            type="button"
            className="magneticButton"
            disabled={isSubmitting}
            onClick={() => void submitPost("published")}
          >
            <span className="magneticButton__inner">{isEditing ? "发布更新" : "发布文章"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}