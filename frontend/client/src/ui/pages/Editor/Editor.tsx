import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  List,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";

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
  const queryEditId = Number(new URLSearchParams(location.search).get("id") || "0");
  const editingPostId = existingPost?.id ?? (queryEditId > 0 ? queryEditId : undefined);
  const isEditing = Boolean(editingPostId);

  const categoriesQuery = useCategoriesQuery();
  const tagsQuery = useTagsQuery();

  const [title, setTitle] = useState(existingPost?.title ?? "");
  const [summary, setSummary] = useState(existingPost?.summary ?? "");
  const [content, setContent] = useState(existingPost?.content ?? "");
  const [categoryId, setCategoryId] = useState<number | undefined>(existingPost?.categoryId ?? undefined);
  const [tagIds, setTagIds] = useState<number[]>(existingPost?.tags?.map((tag) => tag.id) ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 字数统计：由 CollabEditor onChange 回调实时更新
  const [wordCount, setWordCount] = useState(0);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 300));
  const selectedTagNames = (tagsQuery.data?.items ?? [])
    .filter((item) => tagIds.includes(item.id))
    .map((item) => item.name);

  // 编辑已有文章用 post-<id>，新文章用临时 ID
  const roomName = useMemo(
    () => (isEditing ? `post-${editingPostId}` : `new-${Date.now()}`),
    [isEditing, editingPostId],
  );

  // 协作用户信息
  const collabUser: CollabUser | null = state
    ? { id: state.user.id, name: state.user.displayName, avatarUrl: (state.user as any).avatarUrl }
    : null;

  const handleContentChange = useCallback((md: string) => {
    const plain = excerptFromContent(md, Number.MAX_SAFE_INTEGER);
    setWordCount(plain ? plain.split(/\s+/).filter(Boolean).length : 0);
  }, []);

  useEffect(() => {
    if (!editingPostId) return;

    let cancelled = false;
    setIsLoadingExisting(true);

    void apiJson<{ post: any }>(`/api/v1/posts/${editingPostId}`, {
      token: state?.accessToken,
    })
      .then((res) => {
        if (cancelled) return;
        const post = res.post;
        setTitle(post?.title ?? "");
        setSummary(post?.summary ?? "");
        setContent(post?.content ?? "");
        setCategoryId(post?.categoryId ?? undefined);
        setTagIds(Array.isArray(post?.tags) ? post.tags.map((tag: any) => tag.id) : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMsg(error instanceof Error ? error.message : "加载文章失败");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingExisting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editingPostId, state?.accessToken]);

  useEffect(() => {
    if (!existingPost) return;
    setTitle(existingPost.title ?? "");
    setSummary(existingPost.summary ?? "");
    setContent(existingPost.content ?? "");
    setCategoryId(existingPost.categoryId ?? undefined);
    setTagIds(existingPost.tags?.map((tag) => tag.id) ?? []);
  }, [existingPost]);

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
      const endpoint = isEditing ? `/api/v1/posts/${editingPostId}` : "/api/v1/posts";
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
      <Card className="blogPageCard">
        <Space direction="vertical" size={8}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            请先登录
          </Typography.Title>
          <Typography.Text type="secondary">协作编辑器需要登录后才能使用</Typography.Text>
        </Space>
      </Card>
    );
  }

  return (
    <div className="editorStudioLayout">
      <Row gutter={[20, 20]} align="top">
        <Col xs={24} xl={17}>
          <Card className="blogPageCard editorAntCard">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div className="editorAntHeader">
          <div>
            <Typography.Text type="secondary">COLLABORATIVE EDITOR</Typography.Text>
            <Typography.Title level={2} style={{ margin: "4px 0 0" }}>
              {isEditing ? "编辑文章" : "创建新文章"}
            </Typography.Title>
            <Typography.Text type="secondary">支持 Markdown 编辑、预览与发布流程</Typography.Text>
          </div>
          <Space>
            <Tag color="blue">字数 {wordCount}</Tag>
            <Tag color="geekblue">阅读约 {readingMinutes} 分钟</Tag>
          </Space>
        </div>

        {errorMsg && <Alert type="error" showIcon message={errorMsg} />}
        {isEditing && isLoadingExisting && <Alert type="info" showIcon message="正在加载文章原文..." />}

        <Form layout="vertical" requiredMark={false} className="editorAntForm">
          <Row gutter={[16, 4]}>
            <Col xs={24} lg={12}>
              <Form.Item label="标题" className="editorAntItem">
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="输入一个清晰、有辨识度的标题"
                  maxLength={120}
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="摘要" className="editorAntItem">
                <Input.TextArea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="用 2 到 3 句话概括文章核心内容"
                  rows={2}
                  showCount
                  maxLength={300}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="分类" className="editorAntItem">
                <Select
                  className="editorAntSelect"
                  size="large"
                  loading={categoriesQuery.isLoading}
                  value={categoryId ?? 0}
                  options={[
                    { label: "未分类", value: 0 },
                    ...(categoriesQuery.data?.items ?? []).map((item) => ({
                      label: item.name,
                      value: item.id,
                    })),
                  ]}
                  onChange={(value: number) => setCategoryId(value || undefined)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="标签" className="editorAntItem">
                <Select
                  className="editorAntSelect"
                  mode="multiple"
                  size="large"
                  allowClear
                  maxTagCount="responsive"
                  loading={tagsQuery.isLoading}
                  value={tagIds}
                  options={(tagsQuery.data?.items ?? []).map((item) => ({
                    label: item.name,
                    value: item.id,
                  }))}
                  onChange={(value: number[]) => setTagIds(value)}
                  placeholder="选择标签"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <CollabEditor
          roomName={roomName}
          user={collabUser}
          initialContent={content}
          onChange={handleContentChange}
        />

        <Space style={{ justifyContent: "flex-end", width: "100%" }} wrap>
          <Button disabled={isSubmitting} onClick={() => void submitPost("draft")}>
            保存草稿
          </Button>
          <Button type="primary" disabled={isSubmitting} onClick={() => void submitPost("published")}>
            {isEditing ? "发布更新" : "发布文章"}
          </Button>
        </Space>
      </Space>
    </Card>
        </Col>

        <Col xs={24} xl={7}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card className="blogPageCard editorAsideCard" title="发布面板">
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Typography.Text type="secondary">创作状态</Typography.Text>
                <Space wrap>
                  <Tag color="blue">字数 {wordCount}</Tag>
                  <Tag color="geekblue">阅读 {readingMinutes} 分钟</Tag>
                  <Tag>{isEditing ? "编辑模式" : "新建模式"}</Tag>
                </Space>
                <Typography.Text type="secondary">发布建议</Typography.Text>
                <List
                  size="small"
                  dataSource={[
                    title.trim() ? "标题已填写" : "补充一个清晰标题",
                    summary.trim() ? "摘要已填写" : "建议补充摘要，提升列表页点击率",
                    tagIds.length > 0 ? `已选择 ${tagIds.length} 个标签` : "建议为文章补充 1-3 个标签",
                  ]}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                />
                <Button block onClick={() => void submitPost("draft")} disabled={isSubmitting}>
                  保存草稿
                </Button>
                <Button block type="primary" onClick={() => void submitPost("published")} disabled={isSubmitting}>
                  {isEditing ? "发布更新" : "立即发布"}
                </Button>
              </Space>
            </Card>

            <Card className="blogPageCard editorAsideCard" title="当前标签">
              {selectedTagNames.length > 0 ? (
                <Space wrap>
                  {selectedTagNames.map((name) => (
                    <Tag key={name}>{name}</Tag>
                  ))}
                </Space>
              ) : (
                <Typography.Text type="secondary">暂未选择标签</Typography.Text>
              )}
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}