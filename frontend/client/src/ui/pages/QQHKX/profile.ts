export type SocialLink = {
  name: string;
  url: string;
};

export type Project = {
  title: string;
  url: string;
  description: string;
  tags: string[];
};

export type Profile = {
  name: string;
  motto: string;
  location: string;
  role: string;
  avatar: string;
  description: string;
  socials: SocialLink[];
  languages: string[];
  frameworksAndTools: string[];
  projects: Project[];
  icpNumber?: string;
  siteName: string;
  siteDomain: string;
  avatarAlt: string;
};

function parseArray(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const defaultSocials: SocialLink[] = [
  { name: "GitHub", url: "https://github.com/QQHKX" },
  { name: "Bilibili", url: "https://space.bilibili.com/" },
  { name: "Blog", url: "https://qqhkx.com" },
  { name: "QQ", url: "https://im.qq.com" },
];

const defaultProjects: Project[] = [
  {
    title: "qqhkx-homepage",
    url: "https://github.com/QQHKX/qqhkx-homepage",
    description: "现代化个人主页，支持环境变量配置与动效体验。",
    tags: ["Next.js", "Framer Motion", "TypeScript"],
  },
  {
    title: "personal-blog-system",
    url: "https://github.com",
    description: "博客系统，支持内容管理、标签分类与展示。",
    tags: ["React", "Flask", "MySQL"],
  },
  {
    title: "toolkit-lab",
    url: "https://github.com",
    description: "实用工具集合，包含自动化与效率类脚本。",
    tags: ["Node.js", "CLI", "Automation"],
  },
];

const env = import.meta.env;
const name = env.VITE_QQHKX_PROFILE_NAME || "qqhkx.com";
const role = env.VITE_QQHKX_PROFILE_ROLE || "高中生";
const location = env.VITE_QQHKX_PROFILE_LOCATION || "中国·成都";

const rawDesc =
  env.VITE_QQHKX_PROFILE_DESCRIPTION || "来自 {location} 的 {role}，热爱编程与开源。";

const rawAvatarAlt = env.VITE_QQHKX_PROFILE_AVATAR_ALT || "{name} avatar";

export const qqhkxProfile: Profile = {
  name,
  motto: env.VITE_QQHKX_PROFILE_MOTTO || "心有阳光，万物可爱",
  location,
  role,
  avatar:
    env.VITE_QQHKX_PROFILE_AVATAR ||
    "https://api.dicebear.com/9.x/identicon/svg?seed=qqhkx",
  description: rawDesc.replaceAll("{location}", location).replaceAll("{role}", role),
  socials: parseJson<SocialLink[]>(env.VITE_QQHKX_SOCIALS, defaultSocials),
  languages: parseArray(env.VITE_QQHKX_LANGUAGES, ["TypeScript", "Python", "JavaScript"]),
  frameworksAndTools: parseArray(env.VITE_QQHKX_FRAMEWORKS_AND_TOOLS, [
    "React",
    "Next.js",
    "Flask",
    "Tailwind",
    "Docker",
  ]),
  projects: parseJson<Project[]>(env.VITE_QQHKX_PROJECTS, defaultProjects),
  icpNumber: env.VITE_QQHKX_ICP_NUMBER,
  siteName: env.VITE_QQHKX_SITE_NAME || "qqhkx",
  siteDomain: env.VITE_QQHKX_SITE_DOMAIN || ".com",
  avatarAlt: rawAvatarAlt.replaceAll("{name}", name),
};
