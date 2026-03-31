import { useProfile } from "../hooks/queries/useProfile";
import "./AboutSection.css";

// 简单的图标映射（真实项目可用 svg/lucide-react 等）
const iconMap: Record<string, string> = {
  Photography: "📸",
  Traveling: "✈️",
  Reading: "📚",
  Coding: "💻",
};

export default function AboutSection() {
  const { data: profile, loading } = useProfile();

  if (loading || !profile) {
    return (
      <section id="about" className="section">
        <div className="glassCard skeletonCard" style={{ minHeight: "300px" }} />
      </section>
    );
  }

  return (
    <section id="about" className="section">
      <div className="glassCard aboutProfileCard reveal">
        {/* 左侧头像区 */}
        <div className="aboutAvatarWrap">
          <img
            src={profile.avatar}
            alt={profile.name}
            className="aboutAvatar"
            loading="lazy"
          />
        </div>

        {/* 中央文字区 */}
        <div className="aboutInfo">
          <h1 className="aboutName">{profile.name}</h1>
          <p className="aboutTitle">{profile.title}</p>

          <div className="aboutHobbies">
            {profile.hobbies.map((hobby) => (
              <div key={hobby} className="hobbyItem">
                <div className="hobbyIcon">{iconMap[hobby] || "✨"}</div>
                <span className="hobbyLabel">{hobby}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧技能标签云 */}
        <div className="aboutSkills">
          <h3 className="aboutSkillsTitle">技术栈</h3>
          <div className="skillsCloud">
            {profile.skills.map((skill) => (
              <span
                key={skill.name}
                className={`skillTag ${skill.level}`}
                onClick={() => {
                  // 点击可过滤项目 - 此处可以添加路由跳转或状态更新逻辑
                  console.log(`Filter by ${skill.name}`);
                }}
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
