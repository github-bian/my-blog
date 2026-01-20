'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch'; // Need to install Switch or use checkbox
import { Card } from '@/components/ui/card';

// I need to install Switch component from shadcn if I want to use it, or use standard checkbox.
// I'll use a simple checkbox for now to avoid installing more components if not needed, 
// but shadcn Switch is nice. I'll stick to checkbox for speed or install Switch.
// Let's use Checkbox (native input type=checkbox) for now.

const postSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().min(1, 'Content is required'),
  summary: z.string().optional(),
  published: z.boolean().optional(),
});

type PostForm = z.infer<typeof postSchema>;

interface PostEditorProps {
  initialData?: PostForm & { id?: string };
  isEditing?: boolean;
}

export function PostEditor({ initialData, isEditing = false }: PostEditorProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: initialData || {
      title: '',
      slug: '',
      content: '',
      summary: '',
      published: false,
    },
  });

  const content = watch('content');
  const title = watch('title');

  // Auto-generate slug from title if creating new post and slug is empty
  useEffect(() => {
    if (!isEditing && title && !watch('slug')) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setValue('slug', slug);
    }
  }, [title, isEditing, setValue, watch]);

  const onSubmit = async (data: PostForm) => {
    try {
      if (isEditing && initialData?.id) {
        await api.patch(`/posts/${initialData.id}`, data);
      } else {
        await api.post('/posts', data);
      }
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save post');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <h1 className="text-xl font-bold">{isEditing ? 'Edit Post' : 'New Post'}</h1>
        <div className="flex items-center space-x-2">
           {error && <span className="text-red-500 text-sm mr-2">{error}</span>}
           <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
             {isSubmitting ? 'Saving...' : 'Save'}
           </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Side */}
        <div className="w-1/2 flex flex-col p-4 border-r overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Post Title" {...register('title')} />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="post-slug" {...register('slug')} />
              {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="published"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                {...register('published')}
              />
              <Label htmlFor="published">Published</Label>
            </div>

            <div className="space-y-2 flex-1 flex flex-col">
              <Label htmlFor="content">Content (Markdown)</Label>
              <Textarea 
                id="content" 
                placeholder="Write your post here..." 
                className="flex-1 font-mono min-h-[300px] resize-none"
                {...register('content')} 
              />
              {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
            </div>
          </div>
        </div>

        {/* Preview Side */}
        <div className="w-1/2 p-8 overflow-y-auto bg-gray-50 dark:bg-zinc-900/50">
          <article className="prose dark:prose-invert max-w-none">
            <h1>{title || 'Post Title'}</h1>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || '*No content yet*'}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}
