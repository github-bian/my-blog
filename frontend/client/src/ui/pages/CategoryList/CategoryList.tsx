import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiJson } from "../../lib/api";
import { MagneticButton } from "../../components/MagneticButton";

interface Category {
  id: number;
  name: string;
  slug: string;
  postCount: number;
}

interface CategoryListResponse {
  items: Category[];
}

export default function CategoryList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiJson<CategoryListResponse>("/api/v1/categories"),
  });

  if (isLoading) {
    return (
      <div className="section" style={{ minHeight: "100vh", paddingTop: "120px" }}>
        <div className="glassCard">
          <h2 className="sectionTitle">分类</h2>
          <div className="grid3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glassCard glassCard--nested skeletonCard" style={{ height: "120px" }} />
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
          <div className="errorNote">加载分类失败: {error instanceof Error ? error.message : "未知错误"}</div>
        </div>
      </div>
    );
  }

  const categories = data?.items || [];

  return (
    <div className="section" style={{ minHeight: "100vh", paddingTop: "120px" }}>
      <div className="glassCard">
        <h2 className="sectionTitle">分类</h2>
        <p className="sectionLead">按分类浏览文章</p>
        
        {categories.length === 0 ? (
          <div className="hintText">暂无分类</div>
        ) : (
          <div className="grid3">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/posts?categoryId=${category.id}`}
                className="glassCard glassCard--nested"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <h3 className="cardTitle">{category.name}</h3>
                <p className="cardDesc">
                  {category.postCount} 篇文章
                </p>
                <div className="metaRow">
                  <span className="metaText">Slug: {category.slug}</span>
                </div>
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