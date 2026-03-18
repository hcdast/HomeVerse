import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { PerpetualCalendarService } from './perpetual-calendar.service';
import { CalendarEvent, CalendarEventSchema } from './schemas/calendar-event.schema';
import { Todo, TodoSchema } from '../todos/schemas/todo.schema';
import { Reminder, ReminderSchema } from '../reminders/schemas/reminder.schema';
import { Anniversary, AnniversarySchema } from '../anniversaries/schemas/anniversary.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CalendarEvent.name, schema: CalendarEventSchema },
      { name: Todo.name, schema: TodoSchema },
      { name: Reminder.name, schema: ReminderSchema },
      { name: Anniversary.name, schema: AnniversarySchema },
    ]),
  ],
  controllers: [CalendarController],
  providers: [CalendarService, PerpetualCalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}

