'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { PostEditor } from '@/components/post-editor';
import { Navbar } from '@/components/navbar';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditPostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchPost = async () => {
      try {
        const response = await api.get(`/posts/id/${id}`);
        setPost(response.data);
      } catch (err) {
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 p-8 container mx-auto">
          <Skeleton className="h-10 w-1/3 mb-8" />
          <div className="flex space-x-8 h-[500px]">
            <Skeleton className="flex-1 h-full" />
            <Skeleton className="flex-1 h-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      {post && <PostEditor initialData={post} isEditing />}
    </div>
  );
}
