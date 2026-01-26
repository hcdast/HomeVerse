import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContactDocument = Contact & Document;

export enum ContactCategory {
  MEDICAL = 'medical',       // 医疗
  EDUCATION = 'education',   // 教育
  SERVICE = 'service',       // 服务（物业、维修等）
  RELATIVE = 'relative',     // 亲友
  WORK = 'work',             // 工作
  EMERGENCY = 'emergency',   // 紧急服务（110/120/119）
  OTHER = 'other',           // 其他
}

@Schema({ timestamps: true })
export class Contact {
  @Prop({ required: true })
  name: string; // 联系人姓名

  @Prop({ required: true })
  relationship: string; // 关系描述（医生、老师、物业经理等）

  @Prop({ enum: ContactCategory, default: ContactCategory.OTHER })
  category: ContactCategory; // 分类

  @Prop({ required: true })
  phone: string; // 主电话

  @Prop()
  altPhone: string; // 备用电话

  @Prop()
  email: string;

  @Prop()
  address: string; // 地址

  @Prop()
  organization: string; // 所属机构/公司

  @Prop()
  position: string; // 职位

  @Prop()
  notes: string; // 备注

  @Prop({ default: false })
  isEmergency: boolean; // 是否紧急联系人

  @Prop({ default: false })
  isFavorite: boolean; // 是否收藏

  @Prop({ default: 0 })
  priority: number; // 优先级（数字越大越优先）

  @Prop()
  avatar: string; // 头像

  @Prop()
  birthday: Date; // 生日

  @Prop({ type: Object })
  workingHours: {
    start: string;  // 工作开始时间 "09:00"
    end: string;    // 工作结束时间 "18:00"
    days: number[]; // 工作日 [1,2,3,4,5] 周一到周五
  };

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// 索引
ContactSchema.index({ familyId: 1, isEmergency: -1, priority: -1 });
ContactSchema.index({ familyId: 1, category: 1 });
ContactSchema.index({ familyId: 1, name: 'text', relationship: 'text' });

