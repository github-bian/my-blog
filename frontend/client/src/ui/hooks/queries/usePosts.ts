import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../../lib/api";

export interface Post {
  id: number;
  authorId: number;
  categoryId?: number | null;
  category?: { id: number; name: string; slug: string } | null;
  title: string;
  summary?: string | null;
  content: string;
  status: "draft" | "published";
  viewCount: number;
  likesCount: number;
  tags: Array<{ id: number; name: string; slug: string }>;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    email: string;
    displayName: string;
    role: string;
    avatarUrl?: string | null;
  };
}

export interface PostListResponse {
  items: Post[];
  total: number;
  query?: string;
}

export function usePostsQuery(params?: {
  q?: string;
  categoryId?: number;
  tagId?: number;
  authorId?: number;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["posts", params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.q) searchParams.set("search", params.q);
      if (params?.categoryId) searchParams.set("categoryId", String(params.categoryId));
      if (params?.tagId) searchParams.set("tagId", String(params.tagId));
      if (params?.authorId) searchParams.set("authorId", String(params.authorId));
      searchParams.set("limit", String(params?.limit ?? 20));
      searchParams.set("offset", String(params?.offset ?? 0));
      
      const qs = searchParams.toString();
      const url = `/api/v1/posts${qs ? `?${qs}` : ""}`;
      
      return apiJson<PostListResponse>(url);
    },
  });
}

export function usePostQuery(id: string | number) {
  return useQuery({
    queryKey: ["posts", id],
    queryFn: () => apiJson<Post>(`/api/v1/posts/${id}`),
    enabled: !!id,
  });
}
