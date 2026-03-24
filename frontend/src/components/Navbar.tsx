import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { PenSquare, LogOut, User, Menu } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed w-full z-50 top-0 transition-all duration-300 glass-panel rounded-none border-t-0 border-x-0 bg-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
              DevBlog
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-300 hover:text-white transition-colors">首页</Link>
            <Link to="/articles" className="text-gray-300 hover:text-white transition-colors">文章</Link>
            
            {user ? (
              <div className="flex items-center space-x-4 ml-4">
                <Link to="/editor" className="flex items-center text-purple-400 hover:text-purple-300 transition-colors">
                  <PenSquare className="w-4 h-4 mr-1" />
                  写文章
                </Link>
                <div className="flex items-center text-gray-300">
                  <User className="w-4 h-4 mr-1" />
                  {user.username}
                </div>
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-gray-300 hover:text-white transition-colors">登录</Link>
                <Link to="/register" className="glass-btn text-sm py-1.5 px-4">注册</Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-300 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass-panel border-x-0 border-b-0 rounded-none bg-black/50">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white">首页</Link>
            <Link to="/articles" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white">文章</Link>
            {user ? (
              <>
                <Link to="/editor" className="block px-3 py-2 text-base font-medium text-purple-400">写文章</Link>
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-base font-medium text-red-400">退出登录</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block px-3 py-2 text-base font-medium text-gray-300">登录</Link>
                <Link to="/register" className="block px-3 py-2 text-base font-medium text-gray-300">注册</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
