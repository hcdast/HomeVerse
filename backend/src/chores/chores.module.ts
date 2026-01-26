import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChoresController } from './chores.controller';
import { ChoresService } from './chores.service';
import { Chore, ChoreSchema } from './schemas/chore.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chore.name, schema: ChoreSchema },
    ]),
  ],
  controllers: [ChoresController],
  providers: [ChoresService],
  exports: [ChoresService],
})
export class ChoresModule {}

