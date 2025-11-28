import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CalendarEventDocument = CalendarEvent & Document;

export enum EventType {
  EVENT = 'event',
  BIRTHDAY = 'birthday',
  ANNIVERSARY = 'anniversary',
  TODO = 'todo',
  REMINDER = 'reminder',
}

export enum EventStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class CalendarEvent {
  @Prop({ required: true })
  title: string; // 事件标题

  @Prop({ required: true, enum: EventType, default: EventType.EVENT })
  type: EventType; // 事件类型

  @Prop()
  description: string; // 事件描述

  @Prop({ required: true })
  startDate: Date; // 开始时间

  @Prop()
  endDate: Date; // 结束时间

  @Prop({ default: false })
  allDay: boolean; // 是否全天事件

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string; // 所属家庭

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string; // 创建者

  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  participants: string[]; // 参与者

  @Prop()
  location: string; // 地点

  @Prop({ type: Object })
  reminder: {
    enabled: boolean;
    before: number; // 提前多少分钟提醒
    sent: boolean; // 是否已发送
  };

  @Prop({ type: Object })
  recurring: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; // 重复频率
    interval: number; // 间隔
    endDate?: Date; // 重复结束日期
  };

  @Prop({ enum: EventStatus, default: EventStatus.PENDING })
  status: EventStatus; // 状态

  @Prop({ type: [String], default: [] })
  tags: string[]; // 标签

  @Prop()
  color: string; // 日历显示颜色
}

export const CalendarEventSchema = SchemaFactory.createForClass(CalendarEvent);

