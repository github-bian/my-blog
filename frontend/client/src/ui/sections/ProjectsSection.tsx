import { MagneticButton } from "../components/MagneticButton";

// 这里的项目数据是前端写死的示例数据。
// 如果你想练“前后端打通”，可以在后端新增 /projects 接口，然后这里用 fetch 拉取。
const projects = [
  {
    title: "高性能动效主页",
    desc: "以玻璃拟态为视觉基调，滚动视差增强空间感，交互以 60fps 为目标。",
    tags: ["UI", "Perf", "A11y"],
  },
  {
    title: "RESTful 内容 API",
    desc: "Flask + JWT + MySQL（可配置）提供用户与内容数据能力，适配前后端分离。",
    tags: ["Flask", "JWT", "SQL"],
  },
  {
    title: "NestJS 代理与部署入口",
    desc: "同域代理 /api 到 Flask，生产环境可直接托管 SPA 静态资源。",
    tags: ["NestJS", "Proxy", "SPA"],
  },
];

export default function ProjectsSection() {
  return (
    <section id="projects" className="section">
      <div className="glassCard reveal">
        <div className="sectionHeaderRow">
          <h2 className="sectionTitle">项目</h2>
          {/* CTA：复用 MagneticButton（磁吸交互 + Glass 风格） */}
          <MagneticButton href="#contact" ariaLabel="咨询合作">
            合作咨询
          </MagneticButton>
        </div>
        <div className="grid3">
          {projects.map((p) => (
            <article key={p.title} className="glassCard glassCard--nested">
              <h3 className="cardTitle">{p.title}</h3>
              <p className="cardDesc">{p.desc}</p>
              {/* role/listitem：提升读屏器可理解性 */}
              <div className="pillRow" role="list" aria-label="标签">
                {p.tags.map((t) => (
                  <span key={t} className="pill" role="listitem">
                    {t}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
