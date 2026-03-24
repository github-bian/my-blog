import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const GlowButton = ({ children, onClick, className = '', type = 'button' }: GlowButtonProps) => {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative inline-flex items-center justify-center px-8 py-3 overflow-hidden font-bold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl shadow-[0_0_20px_rgba(170,59,255,0.4)] hover:shadow-[0_0_30px_rgba(170,59,255,0.6)] transition-shadow duration-300 ${className}`}
    >
      <span className="relative z-10 flex items-center">{children}</span>
      <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
    </motion.button>
  );
};

export default GlowButton;
