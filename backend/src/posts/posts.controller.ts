import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createPostDto: CreatePostDto, @Request() req) {
    return this.postsService.create(createPostDto, req.user.userId);
  }

  @Get()
  findAll(@Query('published') published?: string) {
    // If published is provided, filter by it. "true" -> true.
    const isPublished = published === 'true' ? true : published === 'false' ? false : undefined;
    return this.postsService.findAll(isPublished);
  }

  @Get('id/:id')
  findById(@Param('id') id: string) {
    return this.postsService.findById(id);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.postsService.findOne(slug);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.update(id, updatePostDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }
}
