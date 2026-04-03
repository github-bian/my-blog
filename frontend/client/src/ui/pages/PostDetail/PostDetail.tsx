import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  List,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
  Input,
  message,
} from "antd";
import { EditOutlined, LikeOutlined } from "@ant-design/icons";

import { usePostQuery } from "../../hooks/queries/usePosts";
import { usePostsQuery } from "../../hooks/queries/usePosts";
import { useAuth } from "../../auth/auth";
import { ApiError, apiJson } from "../../lib/api";
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
  const { data: post, isLoading, error } = usePostQuery(id ?? "");
  const { data: postListData } = usePostsQuery({ limit: 60, offset: 0 });
  const { state, isAuthed } = useAuth();

  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const outline = useMemo(() => {
    if (!post?.content) return [] as Array<{ level: number; text: string; id: string }>;
    return post.content
      .split("\n")
      .map((line) => line.match(/^(#{1,4})\s+(.+)$/))
      .filter(Boolean)
      .map((match) => {
        const level = match?.[1].length ?? 0;
        const text = match?.[2].trim() ?? "";
        const id = text
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
          .replace(/\s+/g, "-");
        return { level, text, id };
      })
      .filter((item) => item.text);
  }, [post?.content]);

  const siblingNav = useMemo(() => {
    const items = postListData?.items ?? [];
    if (!post || items.length === 0) return { previous: null as any, next: null as any };
    const currentIndex = items.findIndex((item) => item.id === post.id);
    if (currentIndex === -1) return { previous: null as any, next: null as any };
    return {
      previous: items[currentIndex + 1] ?? null,
      next: items[currentIndex - 1] ?? null,
    };
  }, [post, postListData?.items]);

  async function shareCurrentPost() {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title ?? "文章", url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      message.success("已复制文章链接");
    } catch {
      message.warning("分享取消或复制失败");
    }
  }

  const loadComments = useCallback(async () => {
    if (!id) return;
    try {
      setCommentsLoading(true);
      const data = await apiJson<CommentListResponse>(`/api/v1/comments/post/${id}`);
      setComments(data.items);
    } catch (e: unknown) {
      const text = e instanceof ApiError ? e.message : "加载评论失败";
      message.error(text);
    } finally {
      setCommentsLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const handleLike = useCallback(async () => {
    if (!id) return;
    try {
      setLikeLoading(true);
      const response = await apiJson<{ post: { likesCount: number } }>(`/api/v1/posts/${id}/like`, {
        method: "POST",
      });
      setLikesCount(response.post.likesCount);
      message.success("点赞成功");
    } catch (e: unknown) {
      message.error(e instanceof ApiError ? e.message : "点赞失败");
    } finally {
      setLikeLoading(false);
    }
  }, [id, message]);

  const handleSubmitComment = useCallback(async () => {
    if (!id || !state?.accessToken || !newComment.trim()) return;
    try {
      setSubmitting(true);
      await apiJson(`/api/v1/comments/post/${id}`, {
        method: "POST",
        body: JSON.stringify({ content: newComment.trim() }),
        token: state.accessToken,
      });
      setNewComment("");
      message.success("评论已发布");
      await loadComments();
    } catch (e: unknown) {
      message.error(e instanceof ApiError ? e.message : "发表评论失败");
    } finally {
      setSubmitting(false);
    }
  }, [id, state?.accessToken, newComment, loadComments, message]);

  if (isLoading) {
    return (
      <Card className="blogPageCard">
        <Skeleton active paragraph={{ rows: 9 }} />
      </Card>
    );
  }

  if (error || !post) {
    return (
      <Card className="blogPageCard">
        <Space orientation="vertical" size={12}>
          <Typography.Text type="danger">
            {error ? (error as Error).message : "文章不存在或已被删除"}
          </Typography.Text>
          <Button onClick={() => navigate("/")}>返回首页</Button>
        </Space>
      </Card>
    );
  }

  return (
    <div className="blogArticleLayout">
      <Row gutter={[20, 20]} align="top">
        <Col xs={24} xl={17}>
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card className="blogPageCard blogArticleContentCard">
        <Space orientation="vertical" size={14} style={{ width: "100%" }}>
          <Space wrap>
            <Button onClick={() => navigate("/")}>返回首页</Button>
            {isAuthed && state?.user?.id === post.authorId && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() =>
                  navigate(`/editor?id=${post.id}`, {
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
              >
                编辑文章
              </Button>
            )}
          </Space>

          <Typography.Title level={1} className="blogArticleTitle">
            {post.title}
          </Typography.Title>

          <Space wrap className="blogArticleMeta">
            <Tag color="blue">作者 {post.author?.displayName || "佚名"}</Tag>
            <Tag>发布于 {new Date(post.createdAt).toLocaleString()}</Tag>
            {post.category && <Tag color="geekblue">分类 {post.category.name}</Tag>}
            <Tag>阅读 {post.viewCount || 0}</Tag>
          </Space>

          {post.tags && post.tags.length > 0 && (
            <Space wrap>
              {post.tags.map((tag) => (
                <Link key={tag.id} to={`/posts?tagId=${tag.id}`}>
                  <Tag>{tag.name}</Tag>
                </Link>
              ))}
            </Space>
          )}

          <MarkdownArticle content={post.content} className="articleMarkdown" />

          <div className="blogArticleActionRow">
            <Space wrap>
              <Button icon={<LikeOutlined />} loading={likeLoading} onClick={() => void handleLike()}>
                点赞 {likesCount || post.likesCount}
              </Button>
              <Button onClick={() => void shareCurrentPost()}>分享文章</Button>
            </Space>
          </div>
        </Space>
      </Card>

      <Card className="blogPageCard blogCommentCard" title={`评论 (${comments.length})`}>
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          {isAuthed ? (
            <Space orientation="vertical" size={8} style={{ width: "100%" }}>
              <Input.TextArea
                value={newComment}
                rows={3}
                placeholder="写下你的评论..."
                onChange={(event) => setNewComment(event.target.value)}
              />
              <Button
                type="primary"
                loading={submitting}
                disabled={!newComment.trim()}
                onClick={() => void handleSubmitComment()}
              >
                发表评论
              </Button>
            </Space>
          ) : (
            <Typography.Text type="secondary">
              请先 <Link to="/login">登录</Link> 后发表评论
            </Typography.Text>
          )}

          {commentsLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : comments.length === 0 ? (
            <Empty description="暂无评论，来发表第一条吧" />
          ) : (
            <List
              className="blogCommentList"
              dataSource={comments}
              renderItem={(comment) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar>{comment.author?.displayName?.slice(0, 1) ?? "匿"}</Avatar>}
                    title={
                      <Space size={8}>
                        <Typography.Text strong>
                          {comment.author?.displayName || "匿名用户"}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {new Date(comment.createdAt).toLocaleString()}
                        </Typography.Text>
                      </Space>
                    }
                    description={
                      <Space orientation="vertical" size={6}>
                        <Typography.Paragraph style={{ marginBottom: 0 }}>
                          {comment.content}
                        </Typography.Paragraph>
                        <Typography.Text type="secondary">点赞 {comment.likesCount}</Typography.Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Space>
      </Card>
          </Space>
        </Col>

        <Col xs={24} xl={7}>
          <Space orientation="vertical" size={16} style={{ width: "100%" }} className="blogArticleAside">
            <Card className="blogPageCard blogArticleAsideCard" title="文章信息">
              <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                <Typography.Text type="secondary">作者</Typography.Text>
                <Typography.Text strong>{post.author?.displayName || "佚名"}</Typography.Text>
                <Typography.Text type="secondary">发布时间</Typography.Text>
                <Typography.Text>{new Date(post.createdAt).toLocaleString()}</Typography.Text>
                <Typography.Text type="secondary">分类</Typography.Text>
                <Typography.Text>{post.category?.name || "未分类"}</Typography.Text>
                <Typography.Text type="secondary">统计</Typography.Text>
                <Space wrap>
                  <Tag>阅读 {post.viewCount || 0}</Tag>
                  <Tag color="blue">点赞 {likesCount || post.likesCount}</Tag>
                </Space>
              </Space>
            </Card>

            {outline.length > 0 && (
              <Card className="blogPageCard blogArticleAsideCard" title="目录">
                <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                  {outline.map((item) => (
                    <a
                      key={`${item.id}-${item.level}`}
                      href={`#${item.id}`}
                      className="blogTocLink"
                      style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                    >
                      {item.text}
                    </a>
                  ))}
                </Space>
              </Card>
            )}

            <Card className="blogPageCard blogArticleAsideCard" title="阅读下一步">
              <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                {siblingNav.previous ? (
                  <Link to={`/posts/${siblingNav.previous.id}`} className="blogSiblingLink">
                    <Typography.Text type="secondary">上一篇</Typography.Text>
                    <Typography.Text strong>{siblingNav.previous.title}</Typography.Text>
                  </Link>
                ) : (
                  <Typography.Text type="secondary">上一篇：暂无</Typography.Text>
                )}

                {siblingNav.next ? (
                  <Link to={`/posts/${siblingNav.next.id}`} className="blogSiblingLink">
                    <Typography.Text type="secondary">下一篇</Typography.Text>
                    <Typography.Text strong>{siblingNav.next.title}</Typography.Text>
                  </Link>
                ) : (
                  <Typography.Text type="secondary">下一篇：暂无</Typography.Text>
                )}
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
