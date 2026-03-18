import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Todo, TodoDocument, RecurringRule } from './schemas/todo.schema';
import { RecurringService } from './recurring.service';

export interface CreateTodoDto {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
  familyId: string;
  createdBy: string;
  assignedTo?: string;
  tags?: string[];
  recurring?: RecurringRule;
}

export interface QueryTodosDto {
  completed?: boolean;
  priority?: string;
  assignedTo?: string;
  startDate?: Date;
  endDate?: Date;
  includeRecurring?: boolean;
}

@Injectable()
export class TodosService {
  constructor(
    @InjectModel(Todo.name) private todoModel: Model<TodoDocument>,
    @Inject(forwardRef(() => RecurringService))
    private recurringService: RecurringService,
  ) {}

  async create(createDto: CreateTodoDto): Promise<TodoDocument> {
    const todo = new this.todoModel(createDto);
    const saved = await todo.save();

    // 如果是重复任务，生成未来的实例
    if (createDto.recurring?.enabled) {
      await this.recurringService.generateUpcomingInstances(createDto.familyId, 30);
    }

    return saved;
  }

  async findByFamily(familyId: string, query?: QueryTodosDto): Promise<TodoDocument[]> {
    const filter: any = { familyId };

    if (query?.completed !== undefined) {
      filter.completed = query.completed;
    }

    if (query?.priority) {
      filter.priority = query.priority;
    }

    if (query?.assignedTo) {
      filter.assignedTo = query.assignedTo;
    }

    if (query?.startDate || query?.endDate) {
      filter.dueDate = {};
      if (query.startDate) {
        filter.dueDate.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.dueDate.$lte = new Date(query.endDate);
      }
    }

    // 默认不显示重复任务的父任务（除非特别指定）
    if (!query?.includeRecurring) {
      filter.$or = [
        { 'recurring.enabled': { $ne: true } },
        { isRecurringInstance: true },
      ];
    }

    return this.todoModel
      .find(filter)
      .populate('createdBy', 'username')
      .populate('assignedTo', 'username')
      .sort({ dueDate: 1, createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<TodoDocument> {
    return this.todoModel
      .findById(id)
      .populate('createdBy', 'username')
      .populate('assignedTo', 'username')
      .exec();
  }

  async update(id: string, updateDto: Partial<CreateTodoDto>): Promise<TodoDocument> {
    const todo = await this.todoModel.findById(id);
    if (!todo) return null;

    // 如果更新的是重复任务的父任务，同时更新未完成的实例
    if (todo.recurring?.enabled && !todo.isRecurringInstance) {
      const updateFields: any = {};
      if (updateDto.title) updateFields.title = updateDto.title;
      if (updateDto.description !== undefined) updateFields.description = updateDto.description;
      if (updateDto.priority) updateFields.priority = updateDto.priority;
      if (updateDto.assignedTo) updateFields.assignedTo = updateDto.assignedTo;
      if (updateDto.tags) updateFields.tags = updateDto.tags;

      if (Object.keys(updateFields).length > 0) {
        await this.recurringService.updateUncompletedInstances(id, updateFields);
      }
    }

    return this.todoModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    const todo = await this.todoModel.findById(id);
    if (!todo) return;

    // 如果是重复任务的父任务，同时删除所有未完成的实例
    if (todo.recurring?.enabled && !todo.isRecurringInstance) {
      await this.recurringService.deleteUncompletedInstances(id);
    }

    await this.todoModel.findByIdAndDelete(id).exec();
  }

  async toggleComplete(id: string): Promise<TodoDocument> {
    const todo = await this.findById(id);
    if (!todo) return null;

    const wasCompleted = todo.completed;
    todo.completed = !wasCompleted;
    
    if (todo.completed) {
      todo.completedAt = new Date();
      // 如果完成了一个重复任务实例，生成下一个
      if (todo.recurring?.enabled || todo.isRecurringInstance) {
        await this.recurringService.onTodoCompleted(id);
      }
    } else {
      todo.completedAt = undefined;
    }

    return todo.save();
  }

  // 获取今日待办
  async getTodayTodos(familyId: string): Promise<TodoDocument[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.todoModel
      .find({
        familyId,
        completed: false,
        dueDate: { $gte: today, $lt: tomorrow },
      })
      .populate('assignedTo', 'username')
      .sort({ priority: -1, dueDate: 1 })
      .exec();
  }

  // 获取逾期待办
  async getOverdueTodos(familyId: string): Promise<TodoDocument[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.todoModel
      .find({
        familyId,
        completed: false,
        dueDate: { $lt: today },
      })
      .populate('assignedTo', 'username')
      .sort({ dueDate: 1 })
      .exec();
  }

  // 获取本周待办
  async getWeekTodos(familyId: string): Promise<TodoDocument[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return this.todoModel
      .find({
        familyId,
        completed: false,
        dueDate: { $gte: today, $lt: weekEnd },
      })
      .populate('assignedTo', 'username')
      .sort({ dueDate: 1, priority: -1 })
      .exec();
  }
}

