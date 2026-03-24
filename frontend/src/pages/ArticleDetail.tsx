import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, User, Eye, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';
import BlurText from '../components/reactbits/BlurText';

interface Article {
  id: number;
  title: string;
  content: string;
  created_at: string;
  views: number;
  user_id: number;
  author: {
    username: string;
  };
  category?: {
    name: string;
  };
}

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/articles/${id}`);
        setArticle(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchArticle();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这篇文章吗？')) return;
    try {
      await axios.delete(`http://localhost:5000/api/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/articles');
    } catch (err) {
      console.error(err);
      alert('删除失败');
    }
  };

  if (!article) return <div className="text-center mt-20 text-xl">加载中...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto glass-panel p-8 md:p-12"
    >
      <div className="mb-8 border-b border-white/10 pb-8">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            <BlurText text={article.title} delay={50} />
          </h1>
          {user && user.id === article.user_id && (
            <div className="flex space-x-4">
              <button onClick={() => navigate(`/editor/${article.id}`)} className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors">
                <Edit className="w-5 h-5" />
              </button>
              <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center gap-6 text-gray-400"
        >
          <div className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            {article.author?.username}
          </div>
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            {new Date(article.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            {article.views} 浏览
          </div>
          {article.category && (
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">
              {article.category.name}
            </span>
          )}
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="prose prose-invert prose-lg max-w-none prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
    </motion.div>
  );
};

export default ArticleDetail;
