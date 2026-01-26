import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FamilyMemberDocument = FamilyMember & Document;

@Schema({ timestamps: true })
export class FamilyMember {
  @Prop({ required: true })
  name: string;

  @Prop()
  avatar: string;

  @Prop()
  gender: string; // male, female

  @Prop()
  birthday: Date;

  @Prop()
  deathDate: Date;

  @Prop()
  birthplace: string;

  @Prop()
  currentLocation: string;

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop()
  occupation: string;

  @Prop()
  bio: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: String, ref: 'User' })
  linkedUserId: string;

  // 家庭关系
  @Prop({ type: String, ref: 'FamilyMember' })
  fatherId: string;

  @Prop({ type: String, ref: 'FamilyMember' })
  motherId: string;

  @Prop({ type: String, ref: 'FamilyMember' })
  spouseId: string;

  @Prop()
  generation: number; // 辈分

  @Prop()
  relationToRoot: string; // 与家族根节点的关系

  @Prop([String])
  photos: string[];

  @Prop()
  notes: string;

  @Prop([String])
  tags: string[];

  @Prop({ default: true })
  isAlive: boolean;
}

export const FamilyMemberSchema = SchemaFactory.createForClass(FamilyMember);
FamilyMemberSchema.index({ familyId: 1 });
FamilyMemberSchema.index({ familyId: 1, generation: 1 });




