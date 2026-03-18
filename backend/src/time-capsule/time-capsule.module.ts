import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TimeCapsuleController } from './time-capsule.controller';
import { TimeCapsuleService } from './time-capsule.service';
import { TimeCapsule, TimeCapsuleSchema } from './schemas/time-capsule.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TimeCapsule.name, schema: TimeCapsuleSchema }]),
  ],
  controllers: [TimeCapsuleController],
  providers: [TimeCapsuleService],
  exports: [TimeCapsuleService],
})
export class TimeCapsuleModule {}
