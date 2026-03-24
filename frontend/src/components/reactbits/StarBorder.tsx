import { ReactNode } from 'react';

interface StarBorderProps {
  children: ReactNode;
  color?: string;
  speed?: string;
  className?: string;
}

const StarBorder = ({ children, color = '#00d4ff', speed = '3s', className = '' }: StarBorderProps) => {
  return (
    <div className={`relative overflow-hidden rounded-2xl group ${className}`}>
      {/* Animated Border */}
      <div 
        className="absolute inset-[-100%] z-0 animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `conic-gradient(from 0deg, transparent 0 340deg, ${color} 360deg)`,
          animationDuration: speed,
        }}
      />
      {/* Inner Content */}
      <div className="absolute inset-[2px] z-10 bg-slate-900/90 backdrop-blur-xl rounded-2xl" />
      <div className="relative z-20 h-full">
        {children}
      </div>
    </div>
  );
};

export default StarBorder;
