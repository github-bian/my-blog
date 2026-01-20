'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Navbar } from '@/components/navbar';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentsSection } from '@/components/comments-section';

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: {
    name: string | null;
  };
  tags: { id: string; name: string }[];
}

export default function PostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;

    const fetchPost = async () => {
      try {
        const response = await api.get(`/posts/${slug}`);
        setPost(response.data);
      } catch (err) {
        setError('Post not found');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-screen-md mx-auto px-4 py-8">
           <div className="space-y-4">
             <Skeleton className="h-12 w-3/4" />
             <Skeleton className="h-4 w-1/4" />
             <div className="space-y-2 pt-8">
               <Skeleton className="h-4 w-full" />
               <Skeleton className="h-4 w-full" />
               <Skeleton className="h-4 w-5/6" />
             </div>
           </div>
        </main>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-screen-md mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-red-500">{error || 'Post not found'}</h1>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-screen-md mx-auto px-4 py-8">
        <article className="prose dark:prose-invert lg:prose-xl mx-auto">
          <h1 className="mb-2 text-4xl font-extrabold tracking-tight">{post.title}</h1>
          <div className="mb-8 flex items-center text-sm text-muted-foreground">
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            <span className="mx-2">•</span>
            <span>{post.author.name || 'Anonymous'}</span>
          </div>
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        </article>
        
        <CommentsSection postId={post.id} />
      </main>
    </div>
  );
}
