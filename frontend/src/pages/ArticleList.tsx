import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, User, Eye } from 'lucide-react';
import axios from 'axios';
import AnimatedList from '../components/reactbits/AnimatedList';

interface Article {
  id: number;
  title: string;
  content: string;
  created_at: string;
  views: number;
  author: {
    username: string;
  };
  category?: {
    name: string;
  };
}

const ArticleList = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/articles');
        setArticles(res.data.items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  if (loading) {
    return <div className="text-center mt-20 text-xl">加载中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.h1 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-4xl font-bold mb-10 text-white"
      >
        最新文章
      </motion.h1>

      <AnimatedList className="space-y-6">
        {articles.map((article) => (
          <Link to={`/article/${article.id}`} key={article.id}>
            <div className="glass-panel p-6 hover:bg-white/10 transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-100 group-hover:text-purple-400 transition-colors">
                  {article.title}
                </h2>
                {article.category && (
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">
                    {article.category.name}
                  </span>
                )}
              </div>
              
              <p className="text-gray-400 mb-4 line-clamp-2">
                {article.content.replace(/<[^>]+>/g, '')}
              </p>

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  {article.author?.username}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {new Date(article.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  {article.views} 浏览
                </div>
              </div>
            </div>
          </Link>
        ))}
      </AnimatedList>
    </div>
  );
};

export default ArticleList;
