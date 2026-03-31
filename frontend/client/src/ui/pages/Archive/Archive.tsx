import { Link } from "react-router-dom";
import SplitText from "../../components/reactbits/SplitText";
import { usePostsQuery } from "../../hooks/queries/usePosts";

function groupByMonth(posts: any[]) {
  const map = new Map<string, any[]>();
  for (const p of posts) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const arr = map.get(key);
    if (arr) arr.push(p);
    else map.set(key, [p]);
  }
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export default function Archive() {
  const { data, isLoading, error } = usePostsQuery({ limit: 50, offset: 0 });
  const posts = data?.items ?? [];
  const grouped = groupByMonth(posts);

  return (
    <section className="section">
      <div className="glassCard reveal">
        <h2 className="sectionTitle">
          <SplitText text="归档" delay={30} duration={0.75} />
        </h2>
        <p className="sectionLead">按时间浏览全部文章。</p>

        {isLoading && <div className="hintText">加载中…</div>}
        {!isLoading && error && (
          <div className="errorNote">{error instanceof Error ? error.message : "加载失败"}</div>
        )}

        {!isLoading && !error && (
          <div style={{ display: "grid", gap: "22px" }}>
            {grouped.map(([month, items]) => (
              <div key={month} className="glassCard glassCard--nested">
                <div className="statsLabel">{month}</div>
                <div style={{ display: "grid", gap: "10px" }}>
                  {items.map((p: any) => (
                    <Link
                      key={p.id}
                      to={`/posts/${p.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div style={{ display: "flex", gap: "12px", alignItems: "baseline" }}>
                        <div style={{ fontWeight: 650 }}>{p.title}</div>
                        <div className="metaText">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

