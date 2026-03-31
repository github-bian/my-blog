import { useMemo } from "react";
import SplitText from "../../components/reactbits/SplitText";
import { MagneticButton } from "../../components/MagneticButton";
import AboutSection from "../../sections/AboutSection";
import ContentSection from "../../sections/ContentSection";
import ProjectsSection from "../../sections/ProjectsSection";
import DashboardSection from "../../sections/DashboardSection";
import ContactSection from "../../sections/ContactSection";

export default function Home() {
  const heroCtas = useMemo(
    () => (
      <div className="hero__ctaRow">
        <MagneticButton href="#projects" ariaLabel="查看项目">
          查看项目
        </MagneticButton>
        <MagneticButton to="/posts" ariaLabel="查看博客">
          最新文章
        </MagneticButton>
      </div>
    ),
    [],
  );

  return (
    <>
      <section id="home" className="section section--hero">
        <div className="glassCard heroCard reveal">
          <h1 className="hero__title">
            <SplitText text="欢迎来到我的博客" delay={80} duration={0.75} />
          </h1>
          <p className="hero__subtitle">
            这里是我记录技术成长、分享生活感悟和沉淀思考的数字花园。
          </p>
          {heroCtas}
        </div>
      </section>

      <ContentSection />
      <AboutSection />
      <ProjectsSection />
      <DashboardSection />
      <ContactSection />
    </>
  );
}
