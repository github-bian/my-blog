import { PropsWithChildren, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

type MagneticButtonProps = PropsWithChildren<{
  onClick?: () => void;
  href?: string;
  to?: string;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}>;

export function MagneticButton(props: MagneticButtonProps) {
  // 如果用户启用了“减少动态效果”，我们会禁用磁吸动画（更友好、更可访问）
  const reducedMotion = usePrefersReducedMotion();
  // ref：拿到真实 DOM 节点，做 pointermove 监听和 transform 更新
  const elRef = useRef<HTMLElement | null>(null);
  // rafRef：保存 requestAnimationFrame 的 id，确保同一时间只跑一个动画循环
  const rafRef = useRef<number | null>(null);
  // targetRef：鼠标当前位置映射出来的“目标偏移”
  const targetRef = useRef({ x: 0, y: 0 });
  // currentRef：当前真实偏移；每帧向 target 逼近，形成“磁吸/缓动”效果
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const setTransform = (x: number, y: number) => {
      // 用 CSS 自定义属性存偏移量，配合 translate3d 实现 GPU 加速
      el.style.setProperty("--mx", `${x.toFixed(2)}px`);
      el.style.setProperty("--my", `${y.toFixed(2)}px`);
    };

    const animate = () => {
      const current = currentRef.current;
      const target = targetRef.current;

      const dx = target.x - current.x;
      const dy = target.y - current.y;

      // 0.14 是“弹性/跟随速度”参数：越大越“跟手”，越小越“粘滞”
      current.x += dx * 0.14;
      current.y += dy * 0.14;

      // 足够接近时直接贴合，避免无限趋近导致的细微抖动
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        current.x = target.x;
        current.y = target.y;
      }

      setTransform(current.x, current.y);
      rafRef.current = window.requestAnimationFrame(animate);
    };

    const start = () => {
      // 已经在跑动画就不重复启动，避免多个 RAF 循环叠加导致掉帧
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(animate);
    };

    const stop = () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    if (reducedMotion) {
      // reduced motion 时把偏移清零，并停止动画循环
      setTransform(0, 0);
      stop();
      return;
    }

    const onMove: EventListener = (e) => {
      const pe = e as PointerEvent;
      // 计算鼠标在按钮中的相对位置，范围约为 [-0.5, 0.5]
      const rect = el.getBoundingClientRect();
      const px = (pe.clientX - rect.left) / rect.width - 0.5;
      const py = (pe.clientY - rect.top) / rect.height - 0.5;
      // strength 控制最大偏移像素，数值越大越“夸张”
      const strength = 18;
      targetRef.current.x = px * strength;
      targetRef.current.y = py * strength;
      start();
    };

    const onLeave: EventListener = () => {
      // 鼠标离开时回弹到原点
      targetRef.current.x = 0;
      targetRef.current.y = 0;
      start();
    };

    // pointer 事件同时兼容鼠标/触控笔/触屏
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      stop();
    };
  }, [reducedMotion]);

  // className/style 由组件统一拼装，使用时只需关心语义（href/onClick/ariaLabel）
  const className = [
    "magneticButton",
    props.disabled ? "isDisabled" : "",
    props.className,
  ]
    .filter(Boolean)
    .join(" ");
  const style = { transform: "translate3d(var(--mx, 0px), var(--my, 0px), 0)" };

  if (props.to) {
    return (
      <Link
        to={props.to}
        className={className}
        style={style}
        aria-label={props.ariaLabel}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ref={(node: HTMLAnchorElement | null) => {
          elRef.current = node;
        }}
      >
        <span className="magneticButton__inner">{props.children}</span>
      </Link>
    );
  }

  if (props.href) {
    // href 存在时渲染成 <a>：语义上更像链接（可被浏览器/读屏器正确识别）
    return (
      <a
        ref={(node) => {
          elRef.current = node;
        }}
        className={className}
        style={style}
        aria-label={props.ariaLabel}
        href={props.href}
      >
        <span className="magneticButton__inner">{props.children}</span>
      </a>
    );
  }

  // 否则渲染成 <button>：语义上是操作按钮
  return (
    <button
      ref={(node) => {
        elRef.current = node;
      }}
      className={className}
      style={style}
      aria-label={props.ariaLabel}
      type="button"
      onClick={props.disabled ? undefined : props.onClick}
      disabled={props.disabled}
    >
      <span className="magneticButton__inner">{props.children}</span>
    </button>
  );
}
