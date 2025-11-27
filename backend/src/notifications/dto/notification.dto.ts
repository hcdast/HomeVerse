import { IsEnum, IsOptional, IsString, IsMongoId, IsObject } from 'class-validator';
import { NotificationType, NotificationStatus } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @IsMongoId()
  recipient: string;

  @IsMongoId()
  @IsOptional()
  sender?: string;

  @IsMongoId()
  @IsOptional()
  familyId?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsObject()
  @IsOptional()
  metadata?: any;

  @IsString()
  @IsOptional()
  link?: string;
}

export class UpdateNotificationDto {
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;
}

export class QueryNotificationsDto {
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}

