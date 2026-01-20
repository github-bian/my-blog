'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional().or(z.literal('')),
});

type CommentForm = z.infer<typeof commentSchema>;

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author?: {
    name: string;
  };
  guestName?: string;
}

export function CommentsSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    const fetchComments = async () => {
      try {
        const response = await api.get(`/posts/${postId}/comments`);
        setComments(response.data);
      } catch (error) {
        console.error('Failed to fetch comments', error);
      }
    };

    fetchComments();
  }, [postId]);

  const onSubmit = async (data: CommentForm) => {
    try {
      const payload = { ...data, postId };
      // Use different endpoint if logged in
      const endpoint = isLoggedIn ? '/comments/auth' : '/comments';
      
      await api.post(endpoint, payload);
      
      reset();
      alert('Comment submitted for moderation.');
    } catch (error) {
      console.error('Failed to submit comment', error);
      alert('Failed to submit comment.');
    }
  };

  return (
    <div className="space-y-8 mt-12">
      <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>

      <div className="space-y-4">
        {comments.map((comment) => (
          <Card key={comment.id}>
            <CardHeader className="flex flex-row items-center gap-4 py-4">
              <Avatar>
                <AvatarFallback>{(comment.author?.name || comment.guestName || 'A')[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold">{comment.author?.name || comment.guestName || 'Anonymous'}</span>
                <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p>{comment.content}</p>
            </CardContent>
          </Card>
        ))}
        {comments.length === 0 && <p className="text-muted-foreground">No comments yet.</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave a comment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!isLoggedIn && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guestName">Name (Optional)</Label>
                  <Input id="guestName" placeholder="John Doe" {...register('guestName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestEmail">Email (Optional)</Label>
                  <Input id="guestEmail" type="email" placeholder="john@example.com" {...register('guestEmail')} />
                  {errors.guestEmail && <p className="text-sm text-red-500">{errors.guestEmail.message}</p>}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="content">Comment</Label>
              <Textarea id="content" placeholder="Share your thoughts..." {...register('content')} />
              {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Comment'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
