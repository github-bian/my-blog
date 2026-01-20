import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

export function PostCard({ post }: { post: Post }) {
  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="line-clamp-2">
          <Link href={`/posts/${post.slug}`} className="hover:underline">
            {post.title}
          </Link>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {new Date(post.createdAt).toLocaleDateString()} • {post.author.name || 'Anonymous'}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-muted-foreground line-clamp-3">
          {post.summary || 'No summary available.'}
        </p>
      </CardContent>
      <CardFooter>
        <Link href={`/posts/${post.slug}`} className="w-full">
          <Button variant="secondary" className="w-full">Read More</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
