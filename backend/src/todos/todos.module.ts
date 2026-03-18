import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TodosService } from './todos.service';
import { TodosController } from './todos.controller';
import { RecurringService } from './recurring.service';
import { Todo, TodoSchema } from './schemas/todo.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Todo.name, schema: TodoSchema },
    ]),
  ],
  controllers: [TodosController],
  providers: [TodosService, RecurringService],
  exports: [TodosService, RecurringService],
})
export class TodosModule {}

