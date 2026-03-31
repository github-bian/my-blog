import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../../lib/api";

export type Category = { id: number; name: string; slug: string };
export type Tag = { id: number; name: string; slug: string };

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => apiJson<{ items: Category[] }>("/api/v1/categories"),
    staleTime: 1000 * 60 * 10,
  });
}

export function useTagsQuery() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => apiJson<{ items: Tag[] }>("/api/v1/tags"),
    staleTime: 1000 * 60 * 10,
  });
}

