import { useEffect, useMemo, useState } from "react";

import { qqhkxProfile } from "./profile";
import "./qqhkx.css";

// UI/交互参考来源：QQHKX/qqhkx-homepage（MIT License）

const iconMap: Record<string, string> = {
  github: "/icon/github.svg",
  bilibili: "/icon/bilibili.svg",
  blog: "/icon/blog.svg",
  qq: "/icon/QQ.svg",
};

function getSocialIcon(name: string) {
  return iconMap[name.toLowerCase()] || "/icon/blog.svg";
}

function TypingText({ text, speed = 80, delay = 200 }: { text: string; speed?: number; delay?: number }) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setStarted(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started || index >= text.length) return;
    const currentChar = text[index - 1];
    const isPause = currentChar === "," || currentChar === "，";
    const timer = window.setTimeout(() => setIndex((prev) => prev + 1), isPause ? speed * 4 : speed);
    return () => window.clearTimeout(timer);
  }, [started, index, text, speed]);

  return (
    <span className="qqhkx-typing">
      {text.slice(0, index)}
      <span className="qqhkx-cursor" />
    </span>
  );
}

export default function QQHKXHome() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  const aboutBlocks = useMemo(
    () => [
      {
        title: "关于我",
        content: <p className="qqhkx-muted">{qqhkxProfile.description}</p>,
      },
      {
        title: "技术栈",
        content: (
          <div className="qqhkx-chip-wrap">
            {qqhkxProfile.languages.map((item) => (
              <span className="qqhkx-chip" key={`lang-${item}`}>
                {item}
              </span>
            ))}
            {qqhkxProfile.frameworksAndTools.map((item) => (
              <span className="qqhkx-chip" key={`tool-${item}`}>
                {item}
              </span>
            ))}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <main className={`qqhkx-page ${ready ? "is-ready" : ""}`}>
      <section className="qqhkx-hero">
        <div className="qqhkx-orb qqhkx-orb-a" />
        <div className="qqhkx-orb qqhkx-orb-b" />
        <div className="qqhkx-orb qqhkx-orb-c" />

        <div className="qqhkx-profile-wrap">
          <div className="qqhkx-avatar-wrap">
            <img src={qqhkxProfile.avatar} alt={qqhkxProfile.avatarAlt} className="qqhkx-avatar" />
          </div>

          <div className="qqhkx-main-info">
            <h1 className="qqhkx-title">
              <span>{qqhkxProfile.siteName}</span>
              <span className="qqhkx-domain">{qqhkxProfile.siteDomain}</span>
            </h1>

            <p className="qqhkx-motto">
              <TypingText text={qqhkxProfile.motto} speed={120} delay={700} />
            </p>

            <div className="qqhkx-meta">
              <span>{qqhkxProfile.role}</span>
              <span>{qqhkxProfile.location}</span>
              <span>前端开发</span>
            </div>

            <div className="qqhkx-social-row">
              {qqhkxProfile.socials.map((s) => (
                <a href={s.url} target="_blank" rel="noreferrer" key={s.name} className="qqhkx-social-item">
                  <img src={getSocialIcon(s.name)} alt={`${s.name} icon`} width={18} height={18} />
                  <span>{s.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="qqhkx-scroll-tip" aria-hidden>
          <span />
        </div>
      </section>

      <section className="qqhkx-about-grid">
        {aboutBlocks.map((block) => (
          <article key={block.title} className="qqhkx-card qqhkx-card-soft">
            <h2>{block.title}</h2>
            {block.content}
          </article>
        ))}
      </section>

      <section className="qqhkx-projects">
        <header className="qqhkx-project-head">
          <h2>精选项目</h2>
          <p>探索我的开源项目，涵盖实用工具、Web 应用、游戏开发等领域。</p>
        </header>

        <div className="qqhkx-project-grid">
          {qqhkxProfile.projects.map((project) => (
            <a href={project.url} target="_blank" rel="noreferrer" key={project.title} className="qqhkx-card qqhkx-project-card">
              <div className="qqhkx-project-top">
                <h3>{project.title}</h3>
                <span className="qqhkx-project-arrow">↗</span>
              </div>
              <p className="qqhkx-muted">{project.description}</p>
              <div className="qqhkx-chip-wrap">
                {project.tags.map((tag) => (
                  <span className="qqhkx-chip" key={`${project.title}-${tag}`}>
                    {tag}
                  </span>
                ))}
              </div>
              <small>开源项目 · GitHub</small>
            </a>
          ))}
        </div>

        <div className="qqhkx-project-more">
          <a href="https://github.com/QQHKX" target="_blank" rel="noreferrer">
            查看更多项目
          </a>
        </div>
      </section>

      <footer className="qqhkx-footer">
        <div>
          © {new Date().getFullYear()} {qqhkxProfile.name}. All rights reserved.
        </div>
        {qqhkxProfile.icpNumber ? (
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">
            {qqhkxProfile.icpNumber}
          </a>
        ) : null}
      </footer>
    </main>
  );
}
