import { useCallback, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  // 优先使用用户手动选择并持久化的主题（localStorage）
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  // 否则使用系统偏好（macOS/Windows 的深色模式设置）
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function useTheme() {
  // 惰性初始化：只在首次渲染时读一次 localStorage
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    // 写到 <html data-theme="...">，让 CSS 用 [data-theme] 切换变量
    document.documentElement.dataset.theme = theme;
    // 持久化：刷新页面仍然保留用户选择
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t: Theme) => (t === "dark" ? "light" : "dark"));
  }, []);

  // 对外只暴露 {theme, toggle}，组件使用简单清晰
  return useMemo(() => ({ theme, toggle }), [theme, toggle]);
}
