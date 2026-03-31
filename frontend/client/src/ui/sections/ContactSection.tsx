import { MagneticButton } from "../components/MagneticButton";

export default function ContactSection() {
  return (
    // 作为锚点目标：AnchorNav / CTA 按钮会跳转到这里
    <section id="contact" className="section section--contact">
      <div className="glassCard reveal">
        <h2 className="sectionTitle">联系</h2>
        <p className="sectionLead">
          想做一个更有冲击力的主页、作品集或品牌站？把需求发给我。
        </p>
        <div className="ctaRow">
          {/* mailto：浏览器会打开默认邮件客户端 */}
          <MagneticButton href="mailto:hello@example.com" ariaLabel="发送邮件">
            发送邮件
          </MagneticButton>
          {/* 回到顶部：锚点滚动（prefers-reduced-motion 时会自动变成无动画） */}
          <MagneticButton href="#home" ariaLabel="返回顶部">
            回到顶部
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
