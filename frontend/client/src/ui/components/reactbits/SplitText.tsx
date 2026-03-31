import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

type SplitTextProps = {
  text: string;
  delay?: number;
  duration?: number;
  className?: string;
};

export default function SplitText({
  text,
  delay = 100,
  duration = 0.6,
  className,
}: SplitTextProps) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const spansRef = useRef<HTMLSpanElement[]>([]);

  const chars = useMemo(() => Array.from(text), [text]);

  useEffect(() => {
    if (reducedMotion) return;
    const el = containerRef.current;
    if (!el) return;

    const spans = spansRef.current.filter(Boolean);
    if (!spans.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        spans,
        { y: 14, opacity: 0, rotateX: 30, transformOrigin: "50% 100%" },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration,
          ease: "power3.out",
          stagger: 0.018,
          delay: delay / 1000,
        },
      );
    }, el);

    return () => ctx.revert();
  }, [delay, duration, reducedMotion, text]);

  spansRef.current = [];

  return (
    <span ref={containerRef} className={className} aria-label={text}>
      {chars.map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          ref={(node) => {
            if (node) spansRef.current.push(node);
          }}
          style={{ display: "inline-block", whiteSpace: ch === " " ? "pre" : "normal" }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

