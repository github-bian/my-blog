import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

type BallpitProps = {
  count?: number;
  gravity?: number;
  friction?: number;
  wallBounce?: number;
  followCursor?: boolean;
  colors?: number[];
  ambientColor?: number;
  ambientIntensity?: number;
  lightIntensity?: number;
  minSize?: number;
  maxSize?: number;
  size0?: number;
  maxVelocity?: number;
  maxX?: number;
  maxY?: number;
  maxZ?: number;
  backgroundColor?: string;
  className?: string;
};

type Ball = {
  mesh: THREE.Mesh;
  r: number;
  v: THREE.Vector3;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function key3(x: number, y: number, z: number) {
  return `${x}|${y}|${z}`;
}

export default function Ballpit({
  count = 100,
  gravity = 0.01,
  friction = 0.9975,
  wallBounce = 0.95,
  followCursor = true,
  colors = [0xff6b6b, 0x4dabf7, 0x51cf66, 0xf59f00, 0xbe4bdb],
  ambientColor = 0xffffff,
  ambientIntensity = 1,
  lightIntensity = 200,
  minSize = 0.5,
  maxSize = 1,
  size0 = 1,
  maxVelocity = 0.15,
  maxX = 5,
  maxY = 5,
  maxZ = 2,
  backgroundColor = "#000000",
  className,
}: BallpitProps) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  const bounds = useMemo(
    () => ({
      maxX,
      maxY,
      maxZ,
      minX: -maxX,
      minY: -maxY,
      minZ: -maxZ,
    }),
    [maxX, maxY, maxZ],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      el.clientWidth / Math.max(1, el.clientHeight),
      0.1,
      100,
    );
    camera.position.set(0, 0, 14);

    const ambient = new THREE.AmbientLight(ambientColor, ambientIntensity);
    scene.add(ambient);
    const light = new THREE.PointLight(0xffffff, 1, 0, 2);
    light.intensity = lightIntensity;
    light.position.set(6, 10, 10);
    scene.add(light);

    const geometry = new THREE.SphereGeometry(1, 24, 24);
    const balls: Ball[] = [];

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pickColor = (i: number) => colors[i % Math.max(1, colors.length)];

    for (let i = 0; i < count; i += 1) {
      const r = rand(minSize, maxSize);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pickColor(i)),
        roughness: 0.35,
        metalness: 0.25,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.setScalar(r);
      mesh.position.set(
        rand(bounds.minX + r, bounds.maxX - r),
        rand(bounds.minY + r, bounds.maxY - r),
        rand(bounds.minZ + r, bounds.maxZ - r),
      );
      const v = new THREE.Vector3(
        rand(-maxVelocity, maxVelocity),
        rand(-maxVelocity, maxVelocity),
        rand(-maxVelocity, maxVelocity),
      );
      scene.add(mesh);
      balls.push({ mesh, r, v });
    }

    let cursorBall: Ball | null = null;
    if (followCursor) {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xffffff),
        roughness: 0.2,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.setScalar(size0);
      mesh.position.set(0, 0, 0);
      scene.add(mesh);
      cursorBall = { mesh, r: size0, v: new THREE.Vector3() };
    }

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      const y = clamp((e.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
      mouseRef.current = { x, y };
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    });
    ro.observe(el);

    const cellSize = Math.max(0.001, maxSize * 2);
    const grid = new Map<string, number[]>();

    const resolveWall = (b: Ball) => {
      const p = b.mesh.position;
      const r = b.r;
      if (p.x - r < bounds.minX) {
        p.x = bounds.minX + r;
        b.v.x = Math.abs(b.v.x) * wallBounce;
      } else if (p.x + r > bounds.maxX) {
        p.x = bounds.maxX - r;
        b.v.x = -Math.abs(b.v.x) * wallBounce;
      }

      if (p.y - r < bounds.minY) {
        p.y = bounds.minY + r;
        b.v.y = Math.abs(b.v.y) * wallBounce;
      } else if (p.y + r > bounds.maxY) {
        p.y = bounds.maxY - r;
        b.v.y = -Math.abs(b.v.y) * wallBounce;
      }

      if (p.z - r < bounds.minZ) {
        p.z = bounds.minZ + r;
        b.v.z = Math.abs(b.v.z) * wallBounce;
      } else if (p.z + r > bounds.maxZ) {
        p.z = bounds.maxZ - r;
        b.v.z = -Math.abs(b.v.z) * wallBounce;
      }
    };

    const tickPhysics = () => {
      grid.clear();

      if (cursorBall) {
        const mx = mouseRef.current.x * 2 - 1;
        const my = 1 - mouseRef.current.y * 2;
        const tx = mx * bounds.maxX;
        const ty = my * bounds.maxY;
        cursorBall.mesh.position.x += (tx - cursorBall.mesh.position.x) * 0.18;
        cursorBall.mesh.position.y += (ty - cursorBall.mesh.position.y) * 0.18;
        cursorBall.mesh.position.z += (0 - cursorBall.mesh.position.z) * 0.18;
      }

      for (let i = 0; i < balls.length; i += 1) {
        const b = balls[i];
        if (!reducedMotion) b.v.y -= gravity;
        b.v.multiplyScalar(friction);
        b.v.x = clamp(b.v.x, -maxVelocity, maxVelocity);
        b.v.y = clamp(b.v.y, -maxVelocity, maxVelocity);
        b.v.z = clamp(b.v.z, -maxVelocity, maxVelocity);
        b.mesh.position.add(b.v);
        resolveWall(b);

        const cx = Math.floor(b.mesh.position.x / cellSize);
        const cy = Math.floor(b.mesh.position.y / cellSize);
        const cz = Math.floor(b.mesh.position.z / cellSize);
        const k = key3(cx, cy, cz);
        const arr = grid.get(k);
        if (arr) arr.push(i);
        else grid.set(k, [i]);
      }

      const pushFromCursor = (b: Ball) => {
        if (!cursorBall) return;
        const dx = b.mesh.position.x - cursorBall.mesh.position.x;
        const dy = b.mesh.position.y - cursorBall.mesh.position.y;
        const dz = b.mesh.position.z - cursorBall.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const minDist = b.r + cursorBall.r;
        if (dist >= minDist) return;
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const overlap = minDist - dist;
        b.mesh.position.x += nx * overlap;
        b.mesh.position.y += ny * overlap;
        b.mesh.position.z += nz * overlap;
        b.v.x += nx * 0.06;
        b.v.y += ny * 0.06;
        b.v.z += nz * 0.06;
      };

      for (const [k, idxs] of grid) {
        const [sx, sy, sz] = k.split("|").map((n) => Number(n));
        for (let ox = -1; ox <= 1; ox += 1) {
          for (let oy = -1; oy <= 1; oy += 1) {
            for (let oz = -1; oz <= 1; oz += 1) {
              const nk = key3(sx + ox, sy + oy, sz + oz);
              const others = grid.get(nk);
              if (!others) continue;
              for (let a = 0; a < idxs.length; a += 1) {
                const i = idxs[a];
                const bi = balls[i];
                pushFromCursor(bi);
                for (let b = 0; b < others.length; b += 1) {
                  const j = others[b];
                  if (j <= i) continue;
                  const bj = balls[j];
                  const dx = bi.mesh.position.x - bj.mesh.position.x;
                  const dy = bi.mesh.position.y - bj.mesh.position.y;
                  const dz = bi.mesh.position.z - bj.mesh.position.z;
                  const dist2 = dx * dx + dy * dy + dz * dz;
                  const minDist = bi.r + bj.r;
                  if (dist2 >= minDist * minDist) continue;
                  const dist = Math.sqrt(dist2) || 1e-6;
                  const nx = dx / dist;
                  const ny = dy / dist;
                  const nz = dz / dist;
                  const overlap = minDist - dist;
                  bi.mesh.position.x += nx * (overlap * 0.5);
                  bi.mesh.position.y += ny * (overlap * 0.5);
                  bi.mesh.position.z += nz * (overlap * 0.5);
                  bj.mesh.position.x -= nx * (overlap * 0.5);
                  bj.mesh.position.y -= ny * (overlap * 0.5);
                  bj.mesh.position.z -= nz * (overlap * 0.5);

                  const rvx = bi.v.x - bj.v.x;
                  const rvy = bi.v.y - bj.v.y;
                  const rvz = bi.v.z - bj.v.z;
                  const sepVel = rvx * nx + rvy * ny + rvz * nz;
                  if (sepVel > 0) continue;
                  const impulse = -(1 + wallBounce) * sepVel * 0.5;
                  bi.v.x += nx * impulse;
                  bi.v.y += ny * impulse;
                  bi.v.z += nz * impulse;
                  bj.v.x -= nx * impulse;
                  bj.v.y -= ny * impulse;
                  bj.v.z -= nz * impulse;
                }
              }
            }
          }
        }
      }
    };

    let raf = 0;
    const tick = () => {
      tickPhysics();
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove as any);
      ro.disconnect();
      renderer.dispose();
      geometry.dispose();
      for (const b of balls) {
        (b.mesh.material as THREE.Material).dispose();
      }
      if (cursorBall) (cursorBall.mesh.material as THREE.Material).dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, [
    reducedMotion,
    ambientColor,
    ambientIntensity,
    lightIntensity,
    bounds,
    count,
    followCursor,
    friction,
    gravity,
    maxSize,
    maxVelocity,
    minSize,
    colors,
    size0,
    wallBounce,
  ]);

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

