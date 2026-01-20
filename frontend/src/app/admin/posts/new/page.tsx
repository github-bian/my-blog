'use client';

import { PostEditor } from '@/components/post-editor';
import { Navbar } from '@/components/navbar';

export default function NewPostPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <PostEditor />
    </div>
  );
}
