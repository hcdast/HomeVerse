import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CalendarEvent, CalendarEventDocument, EventStatus } from './schemas/calendar-event.schema';
import { Todo, TodoDocument } from '../todos/schemas/todo.schema';
import { Reminder, ReminderDocument } from '../reminders/schemas/reminder.schema';
import { Anniversary, AnniversaryDocument } from '../anniversaries/schemas/anniversary.schema';

// 聚合事件类型
export interface AggregatedEvent {
  _id: string;
  title: string;
  type: 'event' | 'todo' | 'reminder' | 'anniversary' | 'birthday';
  source: 'calendar' | 'todo' | 'reminder' | 'anniversary';
  startDate: Date;
  endDate?: Date;
  allDay: boolean;
  status: string;
  priority?: string;
  description?: string;
  location?: string;
  icon: string;
  color: string;
}

@Injectable()
export class CalendarService {
  constructor(
    @InjectModel(CalendarEvent.name)
    private calendarEventModel: Model<CalendarEventDocument>,
    @InjectModel(Todo.name)
    private todoModel: Model<TodoDocument>,
    @InjectModel(Reminder.name)
    private reminderModel: Model<ReminderDocument>,
    @InjectModel(Anniversary.name)
    private anniversaryModel: Model<AnniversaryDocument>,
  ) {}

  // 创建事件
  async create(createEventDto: any): Promise<CalendarEventDocument> {
    const event = new this.calendarEventModel(createEventDto);
    return event.save();
  }

  // 获取家庭所有事件
  async findByFamily(familyId: string, startDate?: Date, endDate?: Date): Promise<CalendarEventDocument[]> {
    const query: any = { familyId };
    
    if (startDate && endDate) {
      query.startDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    return this.calendarEventModel
      .find(query)
      .populate('createdBy', 'username avatar')
      .populate('participants', 'username avatar')
      .sort({ startDate: 1 })
      .exec();
  }

  // 获取用户参与的事件
  async findByUser(userId: string, startDate?: Date, endDate?: Date): Promise<CalendarEventDocument[]> {
    const query: any = {
      $or: [
        { createdBy: userId },
        { participants: userId },
      ],
    };

    if (startDate && endDate) {
      query.startDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    return this.calendarEventModel
      .find(query)
      .populate('createdBy', 'username avatar')
      .sort({ startDate: 1 })
      .exec();
  }

  // 获取单个事件
  async findById(id: string): Promise<CalendarEventDocument> {
    const event = await this.calendarEventModel
      .findById(id)
      .populate('createdBy', 'username avatar')
      .populate('participants', 'username avatar')
      .exec();
    
    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    
    return event;
  }

  // 更新事件
  async update(id: string, userId: string, updateEventDto: any): Promise<CalendarEventDocument> {
    const event = await this.findById(id);
    
    // 只有创建者可以编辑
    if (event.createdBy.toString() !== userId) {
      throw new ForbiddenException('只有创建者可以编辑此事件');
    }

    return this.calendarEventModel
      .findByIdAndUpdate(id, updateEventDto, { new: true })
      .exec();
  }

  // 删除事件
  async delete(id: string, userId: string): Promise<void> {
    const event = await this.findById(id);
    
    if (event.createdBy.toString() !== userId) {
      throw new ForbiddenException('只有创建者可以删除此事件');
    }

    await this.calendarEventModel.findByIdAndDelete(id).exec();
  }

  // 更新事件状态
  async updateStatus(id: string, status: EventStatus): Promise<CalendarEventDocument> {
    return this.calendarEventModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }

  // 获取即将到来的事件
  async getUpcomingEvents(familyId: string, days: number = 7): Promise<CalendarEventDocument[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.calendarEventModel
      .find({
        familyId,
        startDate: { $gte: now, $lte: future },
        status: EventStatus.PENDING,
      })
      .populate('createdBy', 'username')
      .sort({ startDate: 1 })
      .limit(10)
      .exec();
  }

  // 获取本月聚合事件（整合多个模块数据）
  async getAggregatedEvents(
    familyId: string,
    userId: string,
    year: number,
    month: number,
  ): Promise<AggregatedEvent[]> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const today = new Date();

    const events: AggregatedEvent[] = [];

    // 1. 获取日历事件
    const calendarEvents = await this.calendarEventModel.find({
      familyId,
      startDate: { $gte: startOfMonth, $lte: endOfMonth },
    }).exec();

    for (const event of calendarEvents) {
      events.push({
        _id: event._id.toString(),
        title: event.title,
        type: event.type as any || 'event',
        source: 'calendar',
        startDate: event.startDate,
        endDate: event.endDate,
        allDay: event.allDay,
        status: event.status,
        description: event.description,
        location: event.location,
        icon: this.getEventIcon(event.type),
        color: this.getEventColor(event.type),
      });
    }

    // 2. 获取待办事项（有截止日期的）
    const todos = await this.todoModel.find({
      familyId,
      dueDate: { $gte: startOfMonth, $lte: endOfMonth },
    }).exec();

    for (const todo of todos) {
      events.push({
        _id: todo._id.toString(),
        title: todo.title,
        type: 'todo',
        source: 'todo',
        startDate: todo.dueDate,
        allDay: true,
        status: todo.completed ? 'completed' : 'pending',
        priority: todo.priority,
        description: todo.description,
        icon: '✅',
        color: todo.completed ? '#95a5a6' : this.getPriorityColor(todo.priority),
      });
    }

    // 3. 获取提醒（本月触发的）
    const reminders = await this.reminderModel.find({
      familyId,
      isActive: true,
      nextTriggerAt: { $gte: startOfMonth, $lte: endOfMonth },
    }).exec();

    for (const reminder of reminders) {
      events.push({
        _id: reminder._id.toString(),
        title: reminder.title,
        type: 'reminder',
        source: 'reminder',
        startDate: reminder.nextTriggerAt,
        allDay: false,
        status: 'pending',
        priority: reminder.priority,
        description: reminder.description,
        icon: '⏰',
        color: '#9b59b6',
      });
    }

    // 4. 获取纪念日（本月的）
    const anniversaries = await this.anniversaryModel.find({
      familyId,
      $or: [
        { isPrivate: false },
        { isPrivate: true, createdBy: userId },
      ],
    }).exec();

    for (const anniversary of anniversaries) {
      const originalDate = new Date(anniversary.date);
      // 计算今年的纪念日日期
      const thisYearDate = new Date(year, originalDate.getMonth(), originalDate.getDate());
      
      // 检查是否在当前月份
      if (thisYearDate.getMonth() === month - 1) {
        const yearsCount = year - originalDate.getFullYear();
        const isBirthday = anniversary.type === 'birthday';
        
        events.push({
          _id: anniversary._id.toString(),
          title: isBirthday 
            ? `${anniversary.title}（${yearsCount}岁）` 
            : `${anniversary.title}（${yearsCount}周年）`,
          type: isBirthday ? 'birthday' : 'anniversary',
          source: 'anniversary',
          startDate: thisYearDate,
          allDay: true,
          status: thisYearDate <= today ? 'completed' : 'pending',
          description: anniversary.description,
          icon: isBirthday ? '🎂' : '💝',
          color: isBirthday ? '#e74c3c' : '#e91e63',
        });
      }
    }

    // 按日期排序
    events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return events;
  }

  // 获取事件图标
  private getEventIcon(type: string): string {
    const icons: Record<string, string> = {
      birthday: '🎂',
      anniversary: '💝',
      todo: '✅',
      reminder: '⏰',
      event: '📌',
      meeting: '👥',
      travel: '✈️',
      medical: '🏥',
    };
    return icons[type] || '📌';
  }

  // 获取事件颜色
  private getEventColor(type: string): string {
    const colors: Record<string, string> = {
      birthday: '#e74c3c',
      anniversary: '#e91e63',
      todo: '#27ae60',
      reminder: '#9b59b6',
      event: '#3498db',
      meeting: '#f39c12',
      travel: '#1abc9c',
      medical: '#e67e22',
    };
    return colors[type] || '#3498db';
  }

  // 获取优先级颜色
  private getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      high: '#e74c3c',
      medium: '#f39c12',
      low: '#27ae60',
    };
    return colors[priority] || '#3498db';
  }
}

