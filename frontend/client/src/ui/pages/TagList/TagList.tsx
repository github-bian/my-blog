import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiJson } from "../../lib/api";
import { MagneticButton } from "../../components/MagneticButton";

interface Tag {
  id: number;
  name: string;
  slug: string;
  postCount: number;
}

interface TagListResponse {
  items: Tag[];
}

export default function TagList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiJson<TagListResponse>("/api/v1/tags"),
  });

  if (isLoading) {
    return (
      <div className="section" style={{ minHeight: "100vh", paddingTop: "120px" }}>
        <div className="glassCard">
          <h2 className="sectionTitle">标签</h2>
          <div className="pillRow">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeletonCard" style={{ width: "80px", height: "32px", borderRadius: "999px" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section" style={{ minHeight: "100vh", paddingTop: "120px" }}>
        <div className="glassCard">
          <div className="errorNote">加载标签失败: {error instanceof Error ? error.message : "未知错误"}</div>
        </div>
      </div>
    );
  }

  const tags = data?.items || [];

  return (
    <div className="section" style={{ minHeight: "100vh", paddingTop: "120px" }}>
      <div className="glassCard">
        <h2 className="sectionTitle">标签</h2>
        <p className="sectionLead">按标签浏览文章</p>
        
        {tags.length === 0 ? (
          <div className="hintText">暂无标签</div>
        ) : (
          <div className="pillRow">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/posts?tagId=${tag.id}`}
                className="pill"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {tag.name} ({tag.postCount})
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: "2rem" }}>
          <Link to="/">
            <MagneticButton>返回首页</MagneticButton>
          </Link>
        </div>
      </div>
    </div>
  );
}