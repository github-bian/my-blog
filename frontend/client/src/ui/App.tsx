import { Suspense, lazy, useEffect } from "react";
import { Routes, Route } from "react-router-dom";

import { AuthProvider } from "./auth/auth";
import { MainLayout } from "./layouts/MainLayout";
import { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion";

const Home = lazy(() => import("./pages/Home/Home"));
const PostList = lazy(() => import("./pages/PostList/PostList"));
const Login = lazy(() => import("./pages/Login/Login"));
const PostDetail = lazy(() => import("./pages/PostDetail/PostDetail"));
const CategoryList = lazy(() => import("./pages/CategoryList/CategoryList"));
const TagList = lazy(() => import("./pages/TagList/TagList"));
const Archive = lazy(() => import("./pages/Archive/Archive"));
const About = lazy(() => import("./pages/About/About"));
const UserProfile = lazy(() => import("./pages/User/UserProfile"));
const Editor = lazy(() => import("./pages/Editor/Editor"));
const Settings = lazy(() => import("./pages/Settings/Settings"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));

export function App() {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      Array.from(document.querySelectorAll(".reveal")).forEach((el) =>
        (el as HTMLElement).classList.add("isRevealed"),
      );
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) (e.target as HTMLElement).classList.add("isRevealed");
        });
      },
      { root: null, threshold: 0.18 },
    );

    const observeAll = () => {
      const els = Array.from(document.querySelectorAll(".reveal")) as HTMLElement[];
      els.forEach((el) => {
        if ((el as any).__revealObserved) return;
        (el as any).__revealObserved = true;
        io.observe(el);
      });
    };

    observeAll();
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [reducedMotion]);

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="posts" element={<PostList />} />
          <Route path="posts/:id" element={<PostDetail />} />
          <Route path="categories" element={<CategoryList />} />
          <Route path="tags" element={<TagList />} />
          <Route path="archive" element={<Archive />} />
          <Route path="about" element={<About />} />
          <Route path="user/:username" element={<UserProfile />} />
          <Route path="login" element={<Login />} />
          <Route path="editor" element={<Editor />} />
          <Route path="settings" element={<Settings />} />
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
