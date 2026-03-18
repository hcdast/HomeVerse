import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Todo, TodoDocument, RecurringFrequency, RecurringRule } from './schemas/todo.schema';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    @InjectModel(Todo.name)
    private todoModel: Model<TodoDocument>,
  ) {}

  // 计算下一个重复日期
  calculateNextDate(currentDate: Date, rule: RecurringRule): Date | null {
    if (!rule.enabled) return null;

    const next = new Date(currentDate);
    const interval = rule.interval || 1;

    switch (rule.frequency) {
      case RecurringFrequency.DAILY:
        next.setDate(next.getDate() + interval);
        break;

      case RecurringFrequency.WEEKLY:
        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
          // 找到下一个匹配的星期几
          let found = false;
          for (let i = 1; i <= 7; i++) {
            next.setDate(next.getDate() + 1);
            if (rule.daysOfWeek.includes(next.getDay())) {
              found = true;
              break;
            }
          }
          if (!found) {
            next.setDate(next.getDate() + 7 * interval);
          }
        } else {
          next.setDate(next.getDate() + 7 * interval);
        }
        break;

      case RecurringFrequency.BIWEEKLY:
        next.setDate(next.getDate() + 14 * interval);
        break;

      case RecurringFrequency.MONTHLY:
        next.setMonth(next.getMonth() + interval);
        if (rule.dayOfMonth) {
          // 处理月末情况
          const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
          next.setDate(Math.min(rule.dayOfMonth, lastDay));
        }
        break;

      case RecurringFrequency.YEARLY:
        next.setFullYear(next.getFullYear() + interval);
        break;

      default:
        return null;
    }

    // 检查是否超过结束日期
    if (rule.endDate && next > new Date(rule.endDate)) {
      return null;
    }

    return next;
  }

  // 生成重复任务实例
  async generateRecurringInstance(parentTodo: TodoDocument): Promise<Todo | null> {
    if (!parentTodo.recurring?.enabled || !parentTodo.dueDate) {
      return null;
    }

    const nextDate = this.calculateNextDate(parentTodo.dueDate, parentTodo.recurring);
    if (!nextDate) {
      return null;
    }

    // 检查是否已存在该日期的实例
    const existingInstance = await this.todoModel.findOne({
      parentTodoId: parentTodo._id,
      originalDueDate: nextDate,
    });

    if (existingInstance) {
      return null;
    }

    // 创建新实例
    const instance = new this.todoModel({
      title: parentTodo.title,
      description: parentTodo.description,
      priority: parentTodo.priority,
      familyId: parentTodo.familyId,
      createdBy: parentTodo.createdBy,
      assignedTo: parentTodo.assignedTo,
      tags: parentTodo.tags,
      dueDate: nextDate,
      originalDueDate: nextDate,
      parentTodoId: parentTodo._id,
      isRecurringInstance: true,
      completed: false,
    });

    const savedInstance = await instance.save();
    this.logger.log(`生成重复任务实例: ${savedInstance._id} (父任务: ${parentTodo._id})`);

    return savedInstance;
  }

  // 当任务完成时，生成下一个重复实例
  async onTodoCompleted(todoId: string): Promise<Todo | null> {
    const todo = await this.todoModel.findById(todoId);
    if (!todo) return null;

    // 如果是重复任务的实例，找到父任务
    let parentTodo = todo;
    if (todo.isRecurringInstance && todo.parentTodoId) {
      const parent = await this.todoModel.findById(todo.parentTodoId);
      if (parent) {
        parentTodo = parent;
      }
    }

    // 如果父任务有重复规则，生成下一个实例
    if (parentTodo.recurring?.enabled) {
      // 更新父任务的 dueDate 为下一个日期
      const nextDate = this.calculateNextDate(todo.dueDate, parentTodo.recurring);
      if (nextDate) {
        await this.todoModel.findByIdAndUpdate(parentTodo._id, {
          dueDate: nextDate,
        });
        return this.generateRecurringInstance(parentTodo);
      }
    }

    return null;
  }

  // 批量生成未来 N 天的重复任务实例
  async generateUpcomingInstances(familyId: string, daysAhead: number = 30): Promise<number> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    // 找到所有启用重复的任务
    const recurringTodos = await this.todoModel.find({
      familyId,
      'recurring.enabled': true,
      isRecurringInstance: { $ne: true },
    });

    let generatedCount = 0;

    for (const todo of recurringTodos) {
      let currentDate = new Date(todo.dueDate);
      let count = 0;
      const maxCount = todo.recurring.count || 100; // 最多生成 100 个

      while (currentDate <= endDate && count < maxCount) {
        const nextDate = this.calculateNextDate(currentDate, todo.recurring);
        if (!nextDate || nextDate > endDate) break;

        // 检查是否已存在
        const exists = await this.todoModel.findOne({
          parentTodoId: todo._id,
          originalDueDate: nextDate,
        });

        if (!exists) {
          const instance = new this.todoModel({
            title: todo.title,
            description: todo.description,
            priority: todo.priority,
            familyId: todo.familyId,
            createdBy: todo.createdBy,
            assignedTo: todo.assignedTo,
            tags: todo.tags,
            dueDate: nextDate,
            originalDueDate: nextDate,
            parentTodoId: todo._id,
            isRecurringInstance: true,
            completed: false,
          });
          await instance.save();
          generatedCount++;
        }

        currentDate = nextDate;
        count++;
      }
    }

    this.logger.log(`为家庭 ${familyId} 生成了 ${generatedCount} 个重复任务实例`);
    return generatedCount;
  }

  // 获取任务的所有实例
  async getRecurringInstances(parentTodoId: string): Promise<Todo[]> {
    return this.todoModel
      .find({ parentTodoId: new Types.ObjectId(parentTodoId) })
      .sort({ dueDate: 1 })
      .exec();
  }

  // 删除任务的所有未完成实例
  async deleteUncompletedInstances(parentTodoId: string): Promise<number> {
    const result = await this.todoModel.deleteMany({
      parentTodoId: new Types.ObjectId(parentTodoId),
      completed: false,
    });
    return result.deletedCount;
  }

  // 更新所有未完成实例
  async updateUncompletedInstances(
    parentTodoId: string,
    updates: Partial<Todo>,
  ): Promise<number> {
    const result = await this.todoModel.updateMany(
      {
        parentTodoId: new Types.ObjectId(parentTodoId),
        completed: false,
      },
      { $set: updates },
    );
    return result.modifiedCount;
  }
}



