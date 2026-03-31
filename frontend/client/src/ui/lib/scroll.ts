export function scrollToAnchor(id: string, behavior: ScrollBehavior) {
  // 根据 id 找到页面中的目标元素，然后滚动到它的位置
  // behavior:
  // - "smooth": 平滑滚动（更有质感）
  // - "auto": 立刻跳转（无动画，适合 prefers-reduced-motion 用户）
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior, block: "start" });
}
