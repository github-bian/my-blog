import { useEffect, useMemo, useRef } from "react";
import { Mesh, Program, Renderer, Triangle, Vec2 } from "ogl";

import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

type OrbProps = {
  hue?: number;
  hoverIntensity?: number;
  rotateOnHover?: boolean;
  forceHoverState?: boolean;
  backgroundColor?: string;
  className?: string;
};

const vertex = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `
precision highp float;

uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uHue;
uniform float uHover;
uniform float uHoverIntensity;
uniform float uRotateOnHover;

varying vec2 vUv;

vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

void main() {
  float minRes = min(uResolution.x, uResolution.y);
  vec2 aspect = uResolution / minRes;
  vec2 uv = (vUv * 2.0 - 1.0) * aspect;

  vec2 m = (uMouse * 2.0 - 1.0) * aspect;
  float hover = uHover;

  float t = uTime;
  float a = (t * 0.35) * mix(0.25, 1.0, hover) * uRotateOnHover;
  uv = rot(a) * uv;

  float d = length(uv);
  float orb = smoothstep(0.78, 0.28, d);

  float n1 = noise(uv * 2.2 + vec2(t * 0.18, -t * 0.12));
  float n2 = noise(uv * 4.1 + vec2(-t * 0.08, t * 0.14));
  float n = (n1 * 0.65 + n2 * 0.35);

  vec2 dir = normalize(uv - m);
  float mouseDist = length(uv - m);
  float distort = (1.0 - smoothstep(0.0, 1.2, mouseDist)) * uHoverIntensity * hover;
  uv += dir * distort * 0.08;

  float rim = smoothstep(0.55, 0.0, abs(d - 0.38));
  float glow = smoothstep(0.85, 0.15, d) * 0.35;

  float hue = (uHue / 360.0) + n * 0.18 + t * 0.01;
  vec3 base = hsl2rgb(vec3(hue, 0.78, 0.55));
  vec3 col = base * (0.55 + 0.75 * rim) + glow;

  float alpha = orb * (0.65 + 0.35 * n);
  gl_FragColor = vec4(col, alpha);
}
`;

export default function Orb({
  hue = 0,
  hoverIntensity = 0.2,
  rotateOnHover = true,
  forceHoverState = false,
  backgroundColor = "#000000",
  className,
}: OrbProps) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef(new Vec2(0.5, 0.5));
  const hoverRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: mouseRef.current },
      uResolution: { value: new Vec2(1, 1) },
      uHue: { value: hue },
      uHover: { value: 0 },
      uHoverIntensity: { value: hoverIntensity },
      uRotateOnHover: { value: rotateOnHover ? 1 : 0 },
    }),
    [hue, hoverIntensity, rotateOnHover],
  );

  useEffect(() => {
    uniforms.uHue.value = hue;
  }, [hue, uniforms]);

  useEffect(() => {
    uniforms.uHoverIntensity.value = hoverIntensity;
  }, [hoverIntensity, uniforms]);

  useEffect(() => {
    uniforms.uRotateOnHover.value = rotateOnHover ? 1 : 0;
  }, [rotateOnHover, uniforms]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderer = new Renderer({
      dpr: Math.min(2, window.devicePixelRatio || 1),
      alpha: true,
      antialias: true,
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new Mesh(gl, { geometry, program });

    renderer.setSize(el.clientWidth, el.clientHeight);
    uniforms.uResolution.value.set(el.clientWidth, el.clientHeight);

    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";
    el.appendChild(gl.canvas);

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
    });
    ro.observe(el);

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      const x = (e.clientX - rect.left) / Math.max(1, rect.width);
      const y = 1 - (e.clientY - rect.top) / Math.max(1, rect.height);

      mouseRef.current.set(x, y);
      hoverRef.current = forceHoverState ? 1 : inside ? 1 : 0;
    };

    window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = reducedMotion ? 0 : (now - start) / 1000;
      uniforms.uTime.value = t;
      uniforms.uHover.value += (hoverRef.current - uniforms.uHover.value) * 0.12;
      renderer.render({ scene: mesh });
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove as any);
      ro.disconnect();
      if (gl.canvas.parentElement === el) el.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [forceHoverState, reducedMotion, uniforms]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor,
      }}
      aria-hidden="true"
    />
  );
}

