import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsUUID()
  postId: string;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;
}
