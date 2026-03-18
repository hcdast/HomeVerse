import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DigestController } from './digest.controller';
import { DigestService } from './digest.service';
import { Digest, DigestSchema, DigestSubscription, DigestSubscriptionSchema } from './schemas/digest.schema';
import { AiModule } from '../ai/ai.module';
import { Todo, TodoSchema } from '../todos/schemas/todo.schema';
import { Chore, ChoreSchema } from '../chores/schemas/chore.schema';
import { Album, AlbumSchema } from '../albums/schemas/album.schema';
import { Article, ArticleSchema } from '../articles/schemas/article.schema';
import { CalendarEvent, CalendarEventSchema } from '../calendar/schemas/calendar-event.schema';
import { Transaction, TransactionSchema } from '../finance/schemas/transaction.schema';
import { Point, PointSchema } from '../points/schemas/point.schema';
import { Message, MessageSchema } from '../chat/schemas/message.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Digest.name, schema: DigestSchema },
      { name: DigestSubscription.name, schema: DigestSubscriptionSchema },
      { name: Todo.name, schema: TodoSchema },
      { name: Chore.name, schema: ChoreSchema },
      { name: Album.name, schema: AlbumSchema },
      { name: Article.name, schema: ArticleSchema },
      { name: CalendarEvent.name, schema: CalendarEventSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Point.name, schema: PointSchema },
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => AiModule),
  ],
  controllers: [DigestController],
  providers: [DigestService],
  exports: [DigestService],
})
export class DigestModule {}
