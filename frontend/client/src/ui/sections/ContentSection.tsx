import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../auth/auth";
import { MagneticButton } from "../components/MagneticButton";
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

  return (
    <section id="content" className="section">
      <div className="glassCard reveal">
        <div className="taxBar">
          <div className="taxRow">
            <div className="taxLabel">分类</div>
            <div className="taxChips" role="list" aria-label="分类筛选">
              <button
                type="button"
                className={["chip", !categoryId ? "chip--active" : ""].filter(Boolean).join(" ")}
                onClick={() => applyFilters({ categoryId: undefined, tagId, q: searchInput })}
              >
                全部
              </button>
              {(categoriesQuery.data?.items ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={["chip", categoryId === c.id ? "chip--active" : ""].filter(Boolean).join(" ")}
                  aria-pressed={categoryId === c.id}
                  onClick={() => applyFilters({ categoryId: c.id, tagId: undefined, q: searchInput })}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="taxRow">
            <div className="taxLabel">标签</div>
            <div className="taxChips" role="list" aria-label="标签筛选">
              <button
                type="button"
                className={["chip", !tagId ? "chip--active" : ""].filter(Boolean).join(" ")}
                onClick={() => applyFilters({ categoryId, tagId: undefined, q: searchInput })}
              >
                全部
              </button>
              {(tagsQuery.data?.items ?? []).slice(0, 18).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={["chip", tagId === t.id ? "chip--active" : ""].filter(Boolean).join(" ")}
                  aria-pressed={tagId === t.id}
                  onClick={() => applyFilters({ categoryId: undefined, tagId: t.id, q: searchInput })}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="taxRow taxRow--search">
            <div className="taxLabel">搜索</div>
            <div className="taxSearch">
              <input
                className="input"
                placeholder="搜索标题或正文…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button
                type="button"
                className="textButton"
                onClick={() => {
                  setSearchInput("");
                  applyFilters({ categoryId: undefined, tagId: undefined, q: "" });
                }}
              >
                清空
              </button>
            </div>
            {isAuthed && (
              <MagneticButton onClick={() => navigate("/editor")} ariaLabel="打开发布文章面板">
                发布文章
              </MagneticButton>
            )}
          </div>
        </div>

        {/* loading 时用骨架屏占位，避免布局抖动 */}
        {loading && (
          <div className="grid3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glassCard glassCard--nested skeletonCard" style={{ height: "200px" }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="form">
            <div className="errorNote">{error instanceof Error ? error.message : "加载失败"}</div>
            <div>
              <MagneticButton onClick={() => void refetch()} ariaLabel="重试加载内容">
                重试加载
              </MagneticButton>
            </div>
          </div>
        )}

        {/* 有数据才渲染列表 */}
        {!loading && !error && (
          <div className="grid3">
            {posts.map((p, i) => (
              <Link
                key={p.id}
                to={`/posts/${p.id}`}
                className="postCardButton postCardEnter"
                aria-label={`查看文章：${p.title}`}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  textAlign: "left",
                  animationDelay: `${i * 70}ms`,
                }}
              >
                <article className="glassCard glassCard--nested">
                  <div className="postCoverWrap">
                    {extractCoverFromContent(p.content) ? (
                      <img
                        className="postCoverImg"
                        src={extractCoverFromContent(p.content) as string}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="postCoverPlaceholder" aria-hidden="true" />
                    )}
                  </div>
                  <div className="postCardBody">
                    <h3 className="cardTitle">{p.title}</h3>
                    <p className="cardDesc clamp3">{(p.summary ?? excerptFromContent(p.content)) || ""}</p>
                    <div className="metaRow" style={{ marginTop: "auto", paddingTop: "14px" }}>
                      <span className="metaText">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    {p.viewCount > 0 && (
                      <span className="metaText" style={{ marginLeft: "12px" }}>
                        {p.viewCount} 阅读
                      </span>
                    )}
                    {p.likesCount > 0 && (
                      <span className="metaText" style={{ marginLeft: "12px" }}>
                        {p.likesCount} 赞
                      </span>
                    )}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="hintText">还没有文章，登录后发第一篇吧。</div>
        )}
      </div>
    </section>
  );
}
