import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentStatus } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  create(createCommentDto: CreateCommentDto, userId?: string) {
    return this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        postId: createCommentDto.postId,
        authorId: userId,
        guestName: createCommentDto.guestName,
        guestEmail: createCommentDto.guestEmail,
        status: CommentStatus.PENDING, // Default to PENDING
      },
    });
  }

  findByPostId(postId: string) {
    return this.prisma.comment.findMany({
      where: {
        postId,
        status: CommentStatus.APPROVED,
      },
      include: {
        author: {
          select: { name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.comment.findMany({
      include: {
        post: {
          select: { title: true },
        },
        author: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  updateStatus(id: string, status: CommentStatus) {
    return this.prisma.comment.update({
      where: { id },
      data: { status },
    });
  }
}
