import { PropsWithChildren, useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

type ParallaxProps = PropsWithChildren<{
  // speed 决定视差速度：
  // - 正数：向下滚动时元素也向下偏移
  // - 负数：向下滚动时元素向上偏移（看起来更“漂浮”）
  speed: number;
  className?: string;
  as?: "div" | "section";
}>;

export function ParallaxLayer({ speed, className, as, children }: ParallaxProps) {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const visibleRef = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const setY = (y: number) => {
      // translate3d 能更好触发 GPU 合成层，减少重排，提高 60fps 概率
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    };

    if (reducedMotion) {
      // 无障碍：减少动态效果时，直接禁用视差
      setY(0);
      return;
    }

    // 只在元素进入视口时才计算/更新 transform，降低滚动时的计算量
    const io = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries.some((e) => e.isIntersecting);
      },
      { root: null, threshold: 0 },
    );
    io.observe(el);

    const onScroll = () => {
      // 用 RAF 合并多次 scroll 事件到一帧里，避免“每个 scroll 都做计算”导致掉帧
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        if (!visibleRef.current) return;
        const y = window.scrollY * speed;
        setY(y);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [speed, reducedMotion]);

  const Tag = as ?? "div";

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      className={className}
    >
      {children}
    </Tag>
  );
}
