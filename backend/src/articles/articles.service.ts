import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Article, ArticleDocument } from './schemas/article.schema';

@Injectable()
export class ArticlesService {
  constructor(@InjectModel(Article.name) private articleModel: Model<ArticleDocument>) {}

  // 创建文章
  async create(createArticleDto: any): Promise<ArticleDocument> {
    const createdArticle = new this.articleModel(createArticleDto);
    return createdArticle.save();
  }

  // 获取家庭的所有文章
  async findByFamilyId(familyId: string, status?: string): Promise<ArticleDocument[]> {
    const query: any = { familyId };
    if (status) {
      query.status = status;
    }
    return this.articleModel.find(query).sort({ createdAt: -1 }).exec();
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

  // 增加阅读量
  async incrementViews(id: string): Promise<ArticleDocument> {
    const article = await this.articleModel.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    article.views += 1;
    return article.save();
  }

  // 点赞/取消点赞文章
  async toggleLike(id: string, userId: string): Promise<ArticleDocument> {
    const article = await this.articleModel.findById(id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    const index = article.likes.indexOf(userId);
    if (index > -1) {
      article.likes.splice(index, 1); // 取消点赞
    } else {
      article.likes.push(userId); // 点赞
    }
    return article.save();
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
      replies: [],
      createdAt: new Date(),
    });
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
}

