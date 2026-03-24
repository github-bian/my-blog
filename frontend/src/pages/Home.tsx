import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Code, Layout, Database } from 'lucide-react';
import SplitText from '../components/reactbits/SplitText';
import BlurText from '../components/reactbits/BlurText';
import GlowButton from '../components/reactbits/GlowButton';
import StarBorder from '../components/reactbits/StarBorder';

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center pt-20">
      <div className="max-w-4xl px-4">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6">
          <SplitText 
            text="全栈开发学习之旅" 
            className="justify-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400"
            delay={50}
          />
        </h1>
        <div className="text-xl text-gray-300 mb-10 leading-relaxed max-w-2xl mx-auto">
          <BlurText 
            text="使用 React 19, Vite, Tailwind CSS, Framer Motion 构建的炫酷前端。后端基于 Python Flask, MySQL, Redis 构建高性能 API。"
            delay={100}
          />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8"
        >
          <Link to="/articles">
            <GlowButton>
              浏览文章
              <ArrowRight className="ml-2 w-5 h-5" />
            </GlowButton>
          </Link>
          <Link to="/register" className="glass-panel px-8 py-3 text-lg hover:bg-white/20 transition-all font-medium rounded-xl border border-white/10">
            加入我们
          </Link>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 w-full max-w-5xl px-4"
      >
        {[
          { icon: Layout, title: '前端架构', desc: 'React 19 + Vite 构建，极致响应速度与丝滑体验。' },
          { icon: Code, title: '炫酷动效', desc: '引入 React Bits 动效配合毛玻璃 UI，打造现代视觉风格。' },
          { icon: Database, title: '稳健后端', desc: 'Flask + MySQL + Redis 支撑，高并发无压力。' }
        ].map((feature, idx) => (
          <StarBorder key={idx} color={idx === 1 ? '#aa3bff' : '#00d4ff'} className="h-full">
            <div className="p-8 flex flex-col items-center text-center h-full">
              <div className="p-4 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full mb-6 ring-1 ring-white/10">
                <feature.icon className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          </StarBorder>
        ))}
      </motion.div>
    </div>
  );
};

export default Home;
