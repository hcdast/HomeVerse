import { Injectable, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Template, TemplateDocument, TemplateCategory } from './schemas/template.schema';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(
    @InjectModel(Template.name)
    private templateModel: Model<TemplateDocument>,
  ) {}

  // 初始化系统模板
  async onModuleInit() {
    await this.initSystemTemplates();
  }

  // 创建模板
  async create(familyId: string, userId: string, dto: CreateTemplateDto): Promise<Template> {
    const template = new this.templateModel({
      ...dto,
      familyId: new Types.ObjectId(familyId),
      createdBy: new Types.ObjectId(userId),
      isSystem: false,
    });
    return template.save();
  }

  // 获取模板列表
  async findAll(familyId: string, category?: TemplateCategory): Promise<Template[]> {
    const filter: any = {
      isActive: true,
      $or: [
        { isSystem: true },
        { familyId: new Types.ObjectId(familyId) },
      ],
    };

    if (category) {
      filter.category = category;
    }

    return this.templateModel
      .find(filter)
      .sort({ isSystem: -1, usageCount: -1, createdAt: -1 })
      .exec();
  }

  // 获取单个模板
  async findById(id: string): Promise<Template> {
    const template = await this.templateModel.findById(id);
    if (!template) {
      throw new NotFoundException('模板不存在');
    }
    return template;
  }

  // 更新模板
  async update(id: string, familyId: string, dto: UpdateTemplateDto): Promise<Template> {
    const template = await this.templateModel.findById(id);
    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    if (template.isSystem) {
      throw new ForbiddenException('不能修改系统模板');
    }

    if (template.familyId?.toString() !== familyId) {
      throw new ForbiddenException('无权修改此模板');
    }

    return this.templateModel.findByIdAndUpdate(id, dto, { new: true });
  }

  // 删除模板
  async delete(id: string, familyId: string): Promise<void> {
    const template = await this.templateModel.findById(id);
    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    if (template.isSystem) {
      throw new ForbiddenException('不能删除系统模板');
    }

    if (template.familyId?.toString() !== familyId) {
      throw new ForbiddenException('无权删除此模板');
    }

    await this.templateModel.findByIdAndDelete(id);
  }

  // 使用模板（增加使用次数）
  async useTemplate(id: string): Promise<Template> {
    return this.templateModel.findByIdAndUpdate(
      id,
      { $inc: { usageCount: 1 } },
      { new: true },
    );
  }

  // 复制系统模板为家庭模板
  async copyTemplate(id: string, familyId: string, userId: string, newName?: string): Promise<Template> {
    const original = await this.templateModel.findById(id);
    if (!original) {
      throw new NotFoundException('模板不存在');
    }

    const copy = new this.templateModel({
      name: newName || `${original.name} (副本)`,
      description: original.description,
      category: original.category,
      icon: original.icon,
      color: original.color,
      content: original.content,
      tags: original.tags,
      familyId: new Types.ObjectId(familyId),
      createdBy: new Types.ObjectId(userId),
      isSystem: false,
    });

    return copy.save();
  }

  // 初始化系统预设模板
  private async initSystemTemplates() {
    const existingCount = await this.templateModel.countDocuments({ isSystem: true });
    if (existingCount > 0) return;

    const systemTemplates = [
      // 购物清单模板
      {
        name: '日常采购',
        description: '家庭日常生活用品采购清单',
        category: TemplateCategory.SHOPPING,
        icon: '🛒',
        color: '#10b981',
        isSystem: true,
        content: {
          items: [
            { name: '牛奶', quantity: 2, unit: '盒', category: '乳制品' },
            { name: '鸡蛋', quantity: 1, unit: '盒', category: '蛋类' },
            { name: '面包', quantity: 1, unit: '袋', category: '主食' },
            { name: '水果', quantity: 1, unit: '斤', category: '水果' },
            { name: '蔬菜', quantity: 1, unit: '斤', category: '蔬菜' },
          ],
        },
      },
      {
        name: '周末大采购',
        description: '周末家庭大采购清单',
        category: TemplateCategory.SHOPPING,
        icon: '🛍️',
        color: '#f59e0b',
        isSystem: true,
        content: {
          items: [
            { name: '大米', quantity: 1, unit: '袋', category: '主食' },
            { name: '食用油', quantity: 1, unit: '瓶', category: '调料' },
            { name: '肉类', quantity: 2, unit: '斤', category: '肉类' },
            { name: '海鲜', quantity: 1, unit: '斤', category: '海鲜' },
            { name: '零食', quantity: 1, unit: '袋', category: '零食' },
            { name: '饮料', quantity: 1, unit: '箱', category: '饮料' },
          ],
        },
      },
      // 家务模板
      {
        name: '每日家务',
        description: '每天需要完成的基础家务',
        category: TemplateCategory.CHORE,
        icon: '🧹',
        color: '#8b5cf6',
        isSystem: true,
        content: {
          chores: [
            { name: '整理床铺', duration: 5, frequency: 'daily' },
            { name: '清洗碗筷', duration: 15, frequency: 'daily' },
            { name: '扫地/拖地', duration: 20, frequency: 'daily' },
            { name: '倒垃圾', duration: 5, frequency: 'daily' },
          ],
        },
      },
      {
        name: '周末大扫除',
        description: '每周末深度清洁',
        category: TemplateCategory.CHORE,
        icon: '🧽',
        color: '#ec4899',
        isSystem: true,
        content: {
          chores: [
            { name: '整理衣柜', duration: 30, frequency: 'weekly' },
            { name: '清洁卫生间', duration: 30, frequency: 'weekly' },
            { name: '擦窗户', duration: 20, frequency: 'weekly' },
            { name: '换床单被套', duration: 20, frequency: 'weekly' },
            { name: '清洁厨房', duration: 40, frequency: 'weekly' },
          ],
        },
      },
      // 待办模板
      {
        name: '工作日计划',
        description: '工作日任务规划模板',
        category: TemplateCategory.TODO,
        icon: '📋',
        color: '#3b82f6',
        isSystem: true,
        content: {
          todos: [
            { title: '晨间运动', priority: 'medium', time: '07:00' },
            { title: '准备早餐', priority: 'high', time: '07:30' },
            { title: '送孩子上学', priority: 'high', time: '08:00' },
            { title: '检查邮件', priority: 'low', time: '09:00' },
            { title: '接孩子放学', priority: 'high', time: '16:00' },
            { title: '准备晚餐', priority: 'high', time: '18:00' },
          ],
        },
      },
      // 旅行模板
      {
        name: '旅行打包清单',
        description: '出行前的打包检查清单',
        category: TemplateCategory.TRAVEL,
        icon: '🧳',
        color: '#f97316',
        isSystem: true,
        content: {
          categories: [
            {
              name: '证件',
              items: ['身份证', '护照', '驾驶证', '机票/车票'],
            },
            {
              name: '电子设备',
              items: ['手机', '充电器', '充电宝', '相机', '耳机'],
            },
            {
              name: '洗漱用品',
              items: ['牙刷牙膏', '洗面奶', '毛巾', '护肤品'],
            },
            {
              name: '衣物',
              items: ['换洗内衣', '外套', '睡衣', '拖鞋'],
            },
            {
              name: '其他',
              items: ['常用药品', '雨具', '零食', '现金'],
            },
          ],
        },
      },
      // 预算模板
      {
        name: '月度预算规划',
        description: '每月家庭预算分配',
        category: TemplateCategory.BUDGET,
        icon: '💰',
        color: '#10b981',
        isSystem: true,
        content: {
          categories: [
            { name: '住房', percentage: 30 },
            { name: '餐饮', percentage: 20 },
            { name: '交通', percentage: 10 },
            { name: '教育', percentage: 10 },
            { name: '娱乐', percentage: 10 },
            { name: '储蓄', percentage: 15 },
            { name: '其他', percentage: 5 },
          ],
        },
      },
    ];

    await this.templateModel.insertMany(systemTemplates);
    console.log('系统模板初始化完成');
  }
}



