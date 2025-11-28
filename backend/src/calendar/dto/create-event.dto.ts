import { IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { EventType } from '../schemas/calendar-event.schema';

export class CreateEventDto {
  @IsNotEmpty({ message: '标题不能为空' })
  title: string;

  @IsEnum(EventType, { message: '事件类型不正确' })
  type: EventType;

  @IsOptional()
  description?: string;

  @IsNotEmpty({ message: '开始时间不能为空' })
  startDate: Date;

  @IsOptional()
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsArray()
  participants?: string[];

  @IsOptional()
  location?: string;

  @IsOptional()
  reminder?: {
    enabled: boolean;
    before: number;
  };

  @IsOptional()
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  color?: string;
}

export class UpdateEventDto {
  @IsOptional()
  title?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;

  @IsOptional()
  @IsArray()
  participants?: string[];

  @IsOptional()
  location?: string;

  @IsOptional()
  status?: string;
}

