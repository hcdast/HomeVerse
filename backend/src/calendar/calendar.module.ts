import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { PerpetualCalendarService } from './perpetual-calendar.service';
import { CalendarEvent, CalendarEventSchema } from './schemas/calendar-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CalendarEvent.name, schema: CalendarEventSchema },
    ]),
  ],
  controllers: [CalendarController],
  providers: [CalendarService, PerpetualCalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}

