import { useEffect, useState } from "react";
import { apiJson, ApiError } from "../../lib/api";

export interface ProfileSkill {
  name: string;
  level: "beginner" | "intermediate" | "advanced";
}

export interface ProfileData {
  avatar: string;
  name: string;
  title: string;
  hobbies: string[];
  skills: ProfileSkill[];
}

// 模拟数据作为 fallback
const mockProfile: ProfileData = {
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  name: "Marcus",
  title: "全栈开发工程师 / 创作者",
  hobbies: ["Photography", "Traveling", "Reading", "Coding"],
  skills: [
    { name: "React", level: "advanced" },
    { name: "TypeScript", level: "advanced" },
    { name: "Node.js", level: "intermediate" },
    { name: "Python", level: "intermediate" },
    { name: "Flask", level: "intermediate" },
    { name: "Docker", level: "beginner" },
    { name: "Figma", level: "beginner" },
  ]
};

export function useProfile() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      try {
        setLoading(true);
        // 尝试从真实 API 获取数据
        const result = await apiJson<ProfileData>("/api/v1/profile");
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        // 如果 API 不存在或失败，使用 mock 数据
        console.warn("Failed to fetch profile, using mock data:", err);
        if (mounted) {
          setData(mockProfile);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error };
}