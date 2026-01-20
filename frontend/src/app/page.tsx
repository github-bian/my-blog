'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PostCard } from '@/components/post-card';
import { Navbar } from '@/components/navbar';

interface Post {
  id: string;
  title: string;
  summary?: string;
  slug: string;
  createdAt: string;
  author: {
    name: string | null;
  };
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get('/posts?published=true');
        setPosts(response.data);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-screen-xl mx-auto px-4 py-8">
        <div className="flex flex-col space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              Welcome to My Blog
            </h1>
            <p className="mt-4 text-xl text-muted-foreground">
              Sharing thoughts, tutorials, and experiences.
            </p>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
          
          {!loading && posts.length === 0 && (
             <div className="text-center py-12">
               <p className="text-muted-foreground">No posts found.</p>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
