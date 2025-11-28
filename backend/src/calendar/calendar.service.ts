import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CalendarEvent, CalendarEventDocument, EventStatus } from './schemas/calendar-event.schema';

@Injectable()
export class CalendarService {
  constructor(
    @InjectModel(CalendarEvent.name)
    private calendarEventModel: Model<CalendarEventDocument>,
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
}

