import { IsString, IsOptional, IsEnum, IsObject, IsArray, MaxLength } from 'class-validator';
import { TemplateCategory } from '../schemas/template.schema';

export class CreateTemplateDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsObject()
  content: Record<string, any>;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsObject()
  @IsOptional()
  content?: Record<string, any>;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class ApplyTemplateDto {
  @IsString()
  templateId: string;

  @IsObject()
  @IsOptional()
  overrides?: Record<string, any>; // 覆盖模板中的某些字段

  @IsString()
  @IsOptional()
  targetDate?: string; // 应用到的日期（用于日历/待办模板）
}



