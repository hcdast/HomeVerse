import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ApplianceDocument = Appliance & Document;

// 家电类型
export enum ApplianceCategory {
  KITCHEN = 'kitchen', // 厨房电器
  LIVING_ROOM = 'living_room', // 客厅电器
  BEDROOM = 'bedroom', // 卧室电器
  BATHROOM = 'bathroom', // 卫浴电器
  LAUNDRY = 'laundry', // 洗衣设备
  CLIMATE = 'climate', // 温控设备
  SMART_HOME = 'smart_home', // 智能家居
  OTHER = 'other',
}

// 维护记录
@Schema()
export class MaintenanceRecord {
  @Prop({ required: true })
  type: string; // repair, cleaning, filter_change, inspection

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  date: Date;

  @Prop()
  nextDate: Date; // 下次维护提醒

  @Prop()
  cost: number;

  @Prop()
  servicePerson: string;

  @Prop()
  serviceCompany: string;

  @Prop([String])
  attachments: string[];
}

@Schema({ timestamps: true })
export class Appliance {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ApplianceCategory })
  category: ApplianceCategory;

  @Prop()
  brand: string;

  @Prop()
  model: string;

  @Prop()
  serialNumber: string;

  @Prop()
  image: string;

  @Prop()
  purchaseDate: Date;

  @Prop()
  warrantyEndDate: Date;

  @Prop()
  price: number;

  @Prop()
  location: string; // 放置位置

  @Prop()
  description: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [MaintenanceRecord], default: [] })
  maintenanceRecords: MaintenanceRecord[];

  @Prop()
  maintenanceCycle: number; // 维护周期（天）

  @Prop()
  lastMaintenanceDate: Date;

  @Prop()
  nextMaintenanceDate: Date;

  @Prop()
  manualUrl: string; // 说明书链接

  @Prop()
  servicePhone: string; // 售后电话

  @Prop({ default: 'active' })
  status: string; // active, broken, disposed

  @Prop([String])
  tags: string[];
}

export const ApplianceSchema = SchemaFactory.createForClass(Appliance);
ApplianceSchema.index({ familyId: 1 });
ApplianceSchema.index({ familyId: 1, category: 1 });
ApplianceSchema.index({ familyId: 1, nextMaintenanceDate: 1 });



