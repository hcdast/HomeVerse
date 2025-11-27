import { IsEnum, IsOptional, IsString, IsMongoId, IsObject, IsDateString } from 'class-validator';
import { ActivityAction, ActivityLevel } from '../schemas/activity-log.schema';

export class CreateActivityLogDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  @IsOptional()
  familyId?: string;

  @IsEnum(ActivityAction)
  action: ActivityAction;

  @IsString()
  description: string;

  @IsEnum(ActivityLevel)
  @IsOptional()
  level?: ActivityLevel;

  @IsObject()
  @IsOptional()
  metadata?: any;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}

export class QueryActivityLogsDto {
  @IsEnum(ActivityAction)
  @IsOptional()
  action?: ActivityAction;

  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsEnum(ActivityLevel)
  @IsOptional()
  level?: ActivityLevel;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}

