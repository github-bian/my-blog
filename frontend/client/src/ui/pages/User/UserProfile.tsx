import { useMemo } from "react";
import { useParams } from "react-router-dom";
import SplitText from "../../components/reactbits/SplitText";
import { useAuth } from "../../auth/auth";
import { usePostsQuery } from "../../hooks/queries/usePosts";

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { state, isAuthed } = useAuth();

  const decoded = useMemo(() => {
    try {
      return decodeURIComponent(username ?? "");
    } catch {
      return username ?? "";
    }
  }, [username]);

  const viewingMe = Boolean(isAuthed && state?.user?.displayName && decoded === state.user.displayName);

  const postsQuery = usePostsQuery(
    viewingMe && state?.user?.id
      ? { authorId: state.user.id, limit: 20, offset: 0 }
      : undefined,
  );

  return (
    <section className="section">
      <div className="glassCard reveal">
        <h2 className="sectionTitle">
          <SplitText text={decoded ? decoded : "用户"} delay={25} duration={0.7} />
        </h2>
        <p className="sectionLead">
          {viewingMe ? "这是你的个人页。" : "仅支持查看当前登录用户的个人页。"}
        </p>

        {viewingMe && state?.user && (
          <div className="glassCard glassCard--nested" style={{ marginBottom: "18px" }}>
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <div className="navAvatar" style={{ width: "44px", height: "44px", fontSize: "18px" }}>
                {state.user.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                <div style={{ fontWeight: 700, fontSize: "16px" }}>{state.user.displayName}</div>
                <div className="metaText">{state.user.email}</div>
              </div>
            </div>
          </div>
        )}

        {viewingMe && (
          <>
            <div className="sectionHeaderRow">
              <div className="statsLabel">TA 的文章</div>
            </div>
            {postsQuery.isLoading && <div className="hintText">加载中…</div>}
            {!postsQuery.isLoading && postsQuery.error && (
              <div className="errorNote">
                {postsQuery.error instanceof Error ? postsQuery.error.message : "加载失败"}
              </div>
            )}
            {!postsQuery.isLoading && !postsQuery.error && (
              <div style={{ display: "grid", gap: "10px" }}>
                {(postsQuery.data?.items ?? []).map((p) => (
                  <a
                    key={p.id}
                    href={`/posts/${p.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className="glassCard glassCard--nested">
                      <div style={{ fontWeight: 650, marginBottom: "6px" }}>{p.title}</div>
                      <div className="metaText">{new Date(p.createdAt).toLocaleDateString()}</div>
                    </div>
                  </a>
                ))}
                {(postsQuery.data?.items ?? []).length === 0 && (
                  <div className="hintText">还没有发布文章。</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

