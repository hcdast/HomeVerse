import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MomentsController } from './moments.controller';
import { MomentsService } from './moments.service';
import { Moment, MomentSchema } from './schemas/moment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Moment.name, schema: MomentSchema },
    ]),
  ],
  controllers: [MomentsController],
  providers: [MomentsService],
  exports: [MomentsService],
})
export class MomentsModule {}

