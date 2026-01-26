import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TravelDocument = Travel & Document;

@Schema()
export class TravelDay {
  @Prop({ required: true })
  date: Date;

  @Prop()
  title: string;

  @Prop([{
    time: String,
    title: String,
    location: String,
    description: String,
    cost: Number,
    type: String, // transport, food, attraction, hotel, other
  }])
  activities: Array<{
    time: string;
    title: string;
    location?: string;
    description?: string;
    cost?: number;
    type: string;
  }>;
}

@Schema()
export class TravelExpense {
  @Prop({ required: true })
  category: string; // transport, food, hotel, attraction, shopping, other

  @Prop({ required: true })
  amount: number;

  @Prop()
  description: string;

  @Prop()
  date: Date;

  @Prop({ type: String, ref: 'User' })
  paidBy: string;
}

@Schema({ timestamps: true })
export class Travel {
  @Prop({ required: true })
  title: string;

  @Prop()
  destination: string;

  @Prop()
  coverImage: string;

  @Prop([String])
  photos: string[];

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop()
  description: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [{ type: String, ref: 'User' }] })
  participants: string[];

  @Prop({ type: [TravelDay], default: [] })
  itinerary: TravelDay[];

  @Prop({ type: [TravelExpense], default: [] })
  expenses: TravelExpense[];

  @Prop()
  budget: number;

  @Prop({ default: 'planning' })
  status: string; // planning, ongoing, completed, cancelled

  @Prop([String])
  packingList: string[];

  @Prop()
  notes: string;

  @Prop([String])
  tags: string[];
}

export const TravelSchema = SchemaFactory.createForClass(Travel);
TravelSchema.index({ familyId: 1 });
TravelSchema.index({ familyId: 1, status: 1 });




