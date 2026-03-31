import { useEffect, useState } from "react";

export function usePrefersReducedMotion(): boolean {
  // 这个 Hook 读取用户系统设置：
  // macOS/Windows 都有“减少动态效果/减少动画”的辅助功能选项
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // 每当系统设置变化，mq.matches 会变，更新到 React state
    const update = () => setReduced(Boolean(mq.matches));
    update();

    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}
