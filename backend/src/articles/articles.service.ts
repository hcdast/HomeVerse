import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Article, ArticleDocument } from './schemas/article.schema';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(@InjectModel(Article.name) private articleModel: Model<ArticleDocument>) {}

  // 创建文章
  async create(createArticleDto: any): Promise<ArticleDocument> {
    const createdArticle = new this.articleModel(createArticleDto);
    return createdArticle.save();
  }

  // 获取家庭的所有文章（优化查询，只返回必要字段）
  async findByFamilyId(familyId: string, status?: string): Promise<ArticleDocument[]> {
    const query: any = { familyId };
    if (status) {
      query.status = status;
    }
    
    // 使用 lean() 提高查询性能，select 减少数据传输
    return this.articleModel
      .find(query)
      .select('-comments') // 列表页不需要评论数据
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  // 根据ID查找文章
  async findById(id: string): Promise<ArticleDocument | null> {
    return this.articleModel.findById(id).exec();
  }

  // 更新文章
  async update(id: string, updateArticleDto: any): Promise<ArticleDocument> {
    return this.articleModel.findByIdAndUpdate(id, updateArticleDto, { new: true }).exec();
  }

  // 删除文章
  async delete(id: string): Promise<void> {
    const result = await this.articleModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('文章不存在');
    }
  }

  // 增加阅读量（使用原子操作优化）
  async incrementViews(id: string): Promise<ArticleDocument> {
    const article = await this.articleModel.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true },
    );
    
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    
    return article;
  }

  // 点赞/取消点赞文章（使用原子操作优化）
  async toggleLike(id: string, userId: string): Promise<ArticleDocument> {
    // 先检查是否已点赞
    const article = await this.articleModel.findById(id).select('likes');
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    
    const hasLiked = article.likes.includes(userId);
    
    // 使用原子操作
    const updatedArticle = await this.articleModel.findByIdAndUpdate(
      id,
      hasLiked 
        ? { $pull: { likes: userId } }  // 取消点赞
        : { $addToSet: { likes: userId } }, // 点赞（避免重复）
      { new: true },
    );
    
    if (!updatedArticle) {
      throw new NotFoundException('文章不存在');
    }
    
    this.logger.log(`文章 ${id} ${hasLiked ? '取消点赞' : '点赞'}`);
    return updatedArticle;
  }

  // 添加评论
  async addComment(id: string, userId: string, content: string): Promise<ArticleDocument> {
    const article = await this.articleModel.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    article.comments.push({
      user: userId,
      content,
      likes: [],
      replies: [],
      createdAt: new Date(),
    } as any);
    return article.save();
  }

  // 添加评论回复
  async addCommentReply(
    id: string,
    commentId: string,
    userId: string,
    content: string,
  ): Promise<ArticleDocument> {
    const article = await this.articleModel.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    
    // 查找对应的评论（使用类型断言访问_id）
    const comment = article.comments.find((c: any) => {
      const cId = c._id ? c._id.toString() : null;
      return cId === commentId;
    });
    
    if (!comment) {
      throw new NotFoundException('评论不存在');
    }
    
    comment.replies.push({
      user: userId,
      content: content.trim(),
      createdAt: new Date(),
    });
    return article.save();
  }

  // 删除评论
  async deleteComment(id: string, commentId: string, userId: string): Promise<ArticleDocument> {
    const article = await this.articleModel.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    
    // 查找评论索引
    const commentIndex = article.comments.findIndex((c: any) => {
      const cId = c._id ? c._id.toString() : null;
      return cId === commentId;
    });
    
    if (commentIndex === -1) {
      throw new NotFoundException('评论不存在');
    }
    
    // 验证权限：只能删除自己的评论
    const comment = article.comments[commentIndex];
    if (comment.user.toString() !== userId) {
      throw new NotFoundException('无权删除此评论');
    }
    
    article.comments.splice(commentIndex, 1);
    return article.save();
  }

  // 点赞/取消点赞评论
  async toggleCommentLike(id: string, commentId: string, userId: string): Promise<ArticleDocument> {
    const article = await this.articleModel.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    
    // 查找评论
    const comment = article.comments.find((c: any) => {
      const cId = c._id ? c._id.toString() : null;
      return cId === commentId;
    });
    
    if (!comment) {
      throw new NotFoundException('评论不存在');
    }
    
    // 初始化 likes 数组（如果不存在）
    if (!comment.likes) {
      comment.likes = [];
    }
    
    // 检查是否已点赞
    const likeIndex = comment.likes.indexOf(userId);
    
    if (likeIndex > -1) {
      // 取消点赞
      comment.likes.splice(likeIndex, 1);
    } else {
      // 点赞
      comment.likes.push(userId);
    }
    
    return article.save();
  }
}

