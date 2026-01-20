import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  create(createPostDto: CreatePostDto, authorId: string) {
    return this.prisma.post.create({
      data: {
        ...createPostDto,
        authorId,
      },
    });
  }

  findAll(published?: boolean) {
    const where = published !== undefined ? { published } : {};
    return this.prisma.post.findMany({
      where,
      include: {
        author: {
          select: { name: true, email: true },
        },
        category: true,
        tags: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(slug: string) {
    return this.prisma.post.findUnique({
      where: { slug },
      include: {
        author: {
          select: { name: true, email: true },
        },
        category: true,
        tags: true,
        comments: true,
      },
    });
  }

  findById(id: string) {
    return this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { name: true, email: true },
        },
        category: true,
        tags: true,
        comments: true,
      },
    });
  }

  update(id: string, updatePostDto: UpdatePostDto) {
    return this.prisma.post.update({
      where: { id },
      data: updatePostDto,
    });
  }

  remove(id: string) {
    return this.prisma.post.delete({
      where: { id },
    });
  }
}
