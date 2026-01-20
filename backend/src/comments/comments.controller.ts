import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AuthGuard } from '@nestjs/passport';
import { CommentStatus } from '@prisma/client';

@Controller() // We will map specific paths
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // Public: Create comment
  // Optional Auth: If user sends token, we attach authorId.
  // NestJS doesn't support "Optional Auth" easily with AuthGuard.
  // We can create a custom guard or just handle it.
  // For simplicity, I'll make two endpoints or just assume public if no token.
  // Actually, I can use a custom decorator or check headers manually if needed.
  // Or I can just say "Guest or Logged In".
  // Let's make it public for now, but if the client sends a token, the client should probably use a different endpoint or we decode it.
  // Ideally, use a custom guard that allows both but populates user if valid.
  
  @Post('comments')
  create(@Body() createCommentDto: CreateCommentDto) {
    // Ideally extract user from request if exists.
    // Since I'm not implementing "Optional Auth Guard" right now, I'll assume guest or passed via logic.
    // But wait, `req.user` comes from Guard.
    // I will leave it as public for now (Guest).
    // If we want logged in users, we need to handle that.
    return this.commentsService.create(createCommentDto); 
  }

  @Post('comments/auth')
  @UseGuards(AuthGuard('jwt'))
  createAuth(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    return this.commentsService.create(createCommentDto, req.user.userId);
  }

  @Get('posts/:postId/comments')
  findByPostId(@Param('postId') postId: string) {
    return this.commentsService.findByPostId(postId);
  }

  // Admin: List all
  @UseGuards(AuthGuard('jwt'))
  @Get('admin/comments')
  findAll() {
    return this.commentsService.findAll();
  }

  // Admin: Update status
  @UseGuards(AuthGuard('jwt'))
  @Patch('comments/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: CommentStatus) {
    return this.commentsService.updateStatus(id, status);
  }
}
