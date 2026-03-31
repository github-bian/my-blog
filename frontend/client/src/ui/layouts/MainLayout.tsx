import { Outlet } from "react-router-dom";
import { Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AnchorNav } from "../components/AnchorNav";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTheme } from "../hooks/useTheme";
import Iridescence from "../components/reactbits/Iridescence";
import { ParallaxLayer } from "../components/Parallax";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

export function MainLayout() {
  const { theme, toggle } = useTheme();
  const reducedMotion = usePrefersReducedMotion();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="appRoot">
      <div className="bgScene" aria-hidden="true">
        <div className="iridescenceScene">
          <Iridescence
            color={theme === "light" ? [0.5, 0.6, 0.8] : [0.3, 0.4, 0.7]}
            mouseReact={!reducedMotion}
            amplitude={0.1}
            speed={1}
          />
        </div>
        {!reducedMotion && (
          <>
            <ParallaxLayer className="bgBlob bgBlob--a" speed={-0.08} />
            <ParallaxLayer className="bgBlob bgBlob--b" speed={0.06} />
            <ParallaxLayer className="bgBlob bgBlob--c" speed={-0.04} />
          </>
        )}
      </div>

      <AnchorNav />
      <div className="floatingTheme">
        <ThemeToggle theme={theme} onToggle={toggle} />
      </div>

      <main className="page">
        <Suspense
          fallback={
            <div className="section">
              <div className="glassCard skeletonCard" style={{ minHeight: "60vh" }} />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
