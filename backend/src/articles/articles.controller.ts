import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('articles')
@UseGuards(JwtAuthGuard)
export class ArticlesController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly usersService: UsersService,
  ) {}

  // 获取文章列表
  @Get()
  async findAll(@Request() req, @Query('status') status?: string) {
    const user = await this.usersService.findById(req.user.userId);
    return this.articlesService.findByFamilyId(user.familyId, status);
  }

  // 创建文章
  @Post()
  async create(@Body() createDto: any, @Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return this.articlesService.create({
      ...createDto,
      familyId: user.familyId,
      author: req.user.userId,
      views: 0,
      likes: [],
      comments: [],
    });
  }

  // 获取文章详情
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const article = await this.articlesService.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    
    // 验证权限：只能查看自己家庭的文章
    const user = await this.usersService.findById(req.user.userId);
    if (article.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此文章');
    }
    
    // 增加阅读量
    await this.articlesService.incrementViews(id);
    return article;
  }

  // 更新文章
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
    const article = await this.articlesService.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    
    // 验证权限：只能更新自己家庭的文章
    const user = await this.usersService.findById(req.user.userId);
    if (article.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此文章');
    }
    
    return this.articlesService.update(id, updateDto);
  }

  // 删除文章
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const article = await this.articlesService.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    
    // 验证权限：只能删除自己家庭的文章
    const user = await this.usersService.findById(req.user.userId);
    if (article.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此文章');
    }
    
    return this.articlesService.delete(id);
  }

  // 点赞/取消点赞文章
  @Post(':id/like')
  async toggleLike(@Param('id') id: string, @Request() req) {
    const article = await this.articlesService.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    
    // 验证权限
    const user = await this.usersService.findById(req.user.userId);
    if (article.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此文章');
    }
    
    return this.articlesService.toggleLike(id, req.user.userId);
  }

  // 添加评论
  @Post(':id/comment')
  async addComment(@Param('id') id: string, @Body() body: { content: string }, @Request() req) {
    if (!body.content || body.content.trim().length === 0) {
      throw new NotFoundException('评论内容不能为空');
    }
    
    const article = await this.articlesService.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    
    // 验证权限
    const user = await this.usersService.findById(req.user.userId);
    if (article.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此文章');
    }
    
    const updatedArticle = await this.articlesService.addComment(id, req.user.userId, body.content.trim());
    return {
      message: '评论添加成功',
      article: updatedArticle,
    };
  }

  // 添加评论回复
  @Post(':id/comment/:commentId/reply')
  async addCommentReply(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() body: { content: string },
    @Request() req,
  ) {
    if (!body.content || body.content.trim().length === 0) {
      throw new NotFoundException('回复内容不能为空');
    }
    
    const article = await this.articlesService.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    
    // 验证权限
    const user = await this.usersService.findById(req.user.userId);
    if (article.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此文章');
    }
    
    const updatedArticle = await this.articlesService.addCommentReply(
      id,
      commentId,
      req.user.userId,
      body.content.trim(),
    );
    return {
      message: '回复添加成功',
      article: updatedArticle,
    };
  }
}

