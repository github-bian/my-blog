import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { useAuth } from "../auth/auth";
import { extractCoverFromContent, excerptFromContent } from "../components/MarkdownArticle";
import { usePostsQuery } from "../hooks/queries/usePosts";
import { useCategoriesQuery, useTagsQuery } from "../hooks/queries/useTaxonomies";

export default function ContentSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const navigate = useNavigate();

  const categoryIdParam = searchParams.get("categoryId");
  const tagIdParam = searchParams.get("tagId");
  const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined;
  const tagId = tagIdParam ? Number(tagIdParam) : undefined;
  const search = searchParams.get("q") ?? "";

  const { data, isLoading: loading, error, refetch } = usePostsQuery({
    q: search.trim() || undefined,
    categoryId,
    tagId,
    limit: 20,
    offset: 0,
  });
  const posts = data?.items || [];

  const featuredPosts = [...posts]
    .sort((a, b) => b.likesCount + b.viewCount - (a.likesCount + a.viewCount))
    .slice(0, 3);

  const latestPosts = [...posts]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  const hotTagRank = posts
    .flatMap((post) => post.tags ?? [])
    .reduce<Record<string, { id: number; name: string; count: number }>>((acc, tag) => {
      const hit = acc[String(tag.id)] ?? { id: tag.id, name: tag.name, count: 0 };
      hit.count += 1;
      acc[String(tag.id)] = hit;
      return acc;
    }, {});
  const hotTags = Object.values(hotTagRank)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const categoriesQuery = useCategoriesQuery();
  const tagsQuery = useTagsQuery();

  const { isAuthed } = useAuth();

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      const normalized = searchInput.trim();

      if (normalized) next.set("q", normalized);
      else next.delete("q");

      if (next.toString() !== searchParams.toString()) {
        setSearchParams(next, { replace: true });
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [searchInput, searchParams, setSearchParams]);

  function applyFilters(next: { categoryId?: number; tagId?: number; q?: string }) {
    const params = new URLSearchParams(searchParams);

    if (next.categoryId) params.set("categoryId", String(next.categoryId));
    else params.delete("categoryId");

    if (next.tagId) params.set("tagId", String(next.tagId));
    else params.delete("tagId");

    if (typeof next.q === "string") {
      if (next.q.trim()) params.set("q", next.q.trim());
      else params.delete("q");
    }

    setSearchParams(params, { replace: false });
  }

  const categoryOptions = [
    { label: "全部分类", value: 0 },
    ...((categoriesQuery.data?.items ?? []).map((item) => ({
      label: item.name,
      value: item.id,
    })) ?? []),
  ];

  const tagOptions = [
    { label: "全部标签", value: 0 },
    ...((tagsQuery.data?.items ?? []).map((item) => ({
      label: item.name,
      value: item.id,
    })) ?? []),
  ];

  return (
    <section id="content" className="homeSection">
      <Card className="blogPageCard blogHeroCard" styles={{ body: { padding: 24 } }}>
        <Space direction="vertical" size={8}>
          <Typography.Text className="blogHeroKicker">Personal Writing Space</Typography.Text>
          <Typography.Title level={2} style={{ margin: 0 }}>
            记录思考、分享经验、持续创作
          </Typography.Title>
          <Typography.Text type="secondary">
            一个专注内容阅读与创作流程的博客系统，支持 Markdown、分类标签和文章检索。
          </Typography.Text>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card className="blogPageCard blogRecommendCard" title="推荐阅读">
            {featuredPosts.length === 0 ? (
              <Empty description="暂无推荐文章" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {featuredPosts.map((post, index) => (
                  <Link key={post.id} to={`/posts/${post.id}`} className="blogRecommendItem">
                    <div className="blogRecommendIndex">{String(index + 1).padStart(2, "0")}</div>
                    <div className="blogRecommendMain">
                      <Typography.Text strong>{post.title}</Typography.Text>
                      <Typography.Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2 }}
                        style={{ marginBottom: 0 }}
                      >
                        {(post.summary ?? excerptFromContent(post.content)) || ""}
                      </Typography.Paragraph>
                    </div>
                    <Tag>{post.viewCount} 阅读</Tag>
                  </Link>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="blogPageCard blogHotTagsCard" title="热门标签">
            <Space wrap>
              {hotTags.length > 0
                ? hotTags.map((tag) => (
                    <Tag
                      key={tag.id}
                      color="blue"
                      className="blogHotTag"
                      onClick={() => applyFilters({ categoryId, tagId: tag.id, q: searchInput })}
                    >
                      {tag.name} {tag.count}
                    </Tag>
                  ))
                : (tagsQuery.data?.items ?? []).slice(0, 10).map((tag) => (
                    <Tag
                      key={tag.id}
                      className="blogHotTag"
                      onClick={() => applyFilters({ categoryId, tagId: tag.id, q: searchInput })}
                    >
                      {tag.name}
                    </Tag>
                  ))}
            </Space>

            <div className="blogLatestBlock">
              <Typography.Text strong>最新发布</Typography.Text>
              <Space direction="vertical" size={8} style={{ width: "100%", marginTop: 10 }}>
                {latestPosts.length > 0 ? (
                  latestPosts.map((post) => (
                    <Link key={post.id} to={`/posts/${post.id}`} className="blogLatestItem">
                      <Typography.Text>{post.title}</Typography.Text>
                      <Typography.Text type="secondary" className="blogLatestDate">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </Typography.Text>
                    </Link>
                  ))
                ) : (
                  <Typography.Text type="secondary">暂无文章</Typography.Text>
                )}
              </Space>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="blogPageCard blogFeedCard" styles={{ body: { padding: 24 } }}>
        <Space direction="vertical" size={18} style={{ width: "100%" }}>
          <div className="blogFeedHeader">
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                博客文章
              </Typography.Title>
              <Typography.Text type="secondary">支持分类、标签和关键词检索</Typography.Text>
            </div>
            <Space>
              <Tag color="blue">共 {data?.total ?? 0} 篇</Tag>
              {isAuthed && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/editor")}>
                  发布文章
                </Button>
              )}
            </Space>
          </div>

          <Row gutter={[12, 12]} className="blogFilterRow">
            <Col xs={24} md={7} lg={6}>
              <Select
                style={{ width: "100%" }}
                options={categoryOptions}
                value={categoryId ?? 0}
                onChange={(value: number) =>
                  applyFilters({ categoryId: value || undefined, tagId, q: searchInput })
                }
              />
            </Col>
            <Col xs={24} md={7} lg={6}>
              <Select
                style={{ width: "100%" }}
                options={tagOptions}
                value={tagId ?? 0}
                onChange={(value: number) =>
                  applyFilters({ categoryId, tagId: value || undefined, q: searchInput })
                }
              />
            </Col>
            <Col xs={24} md={10} lg={12}>
              <Input.Search
                value={searchInput}
                placeholder="搜索标题或正文..."
                allowClear
                onChange={(event) => setSearchInput(event.target.value)}
                onSearch={(value) => applyFilters({ categoryId, tagId, q: value })}
              />
            </Col>
          </Row>

          {loading && (
            <Row gutter={[16, 16]}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Col key={index} xs={24} sm={12} lg={8}>
                  <Card>
                    <Skeleton active paragraph={{ rows: 4 }} />
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          {!loading && error && (
            <Card>
              <Space direction="vertical" size={12}>
                <Typography.Text type="danger">
                  {error instanceof Error ? error.message : "加载失败"}
                </Typography.Text>
                <Button onClick={() => void refetch()}>重试加载</Button>
              </Space>
            </Card>
          )}

          {!loading && !error && posts.length > 0 && (
            <Row gutter={[16, 16]} className="blogPostGrid">
              {posts.map((post) => (
                <Col key={post.id} xs={24} sm={12} lg={8}>
                  <Link to={`/posts/${post.id}`} className="blogPostLink">
                    <Card
                      className="blogPostCard"
                      hoverable
                      cover={
                        extractCoverFromContent(post.content) ? (
                          <img
                            src={extractCoverFromContent(post.content) as string}
                            alt=""
                            style={{ height: 196, objectFit: "cover" }}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div
                            style={{
                              height: 196,
                              background:
                                "linear-gradient(130deg, rgba(22,119,255,.22) 0%, rgba(30,64,175,.16) 100%)",
                            }}
                          />
                        )
                      }
                    >
                      <Space direction="vertical" size={10} style={{ width: "100%" }}>
                        <Typography.Title level={5} style={{ margin: 0 }}>
                          {post.title}
                        </Typography.Title>
                        <Typography.Paragraph
                          type="secondary"
                          ellipsis={{ rows: 3 }}
                          style={{ marginBottom: 0 }}
                        >
                          {(post.summary ?? excerptFromContent(post.content)) || ""}
                        </Typography.Paragraph>
                        <Space split={<span>|</span>} wrap>
                          <Typography.Text type="secondary">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </Typography.Text>
                          <Typography.Text type="secondary">{post.viewCount} 阅读</Typography.Text>
                          <Typography.Text type="secondary">{post.likesCount} 点赞</Typography.Text>
                        </Space>
                      </Space>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
          )}

          {!loading && !error && posts.length === 0 && (
            <Empty description="还没有文章，登录后发布第一篇吧" />
          )}
        </Space>
      </Card>
    </section>
  );
}
