import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GrowthService } from './growth.service';
import { GrowthController } from './growth.controller';
import { GrowthRecord, GrowthRecordSchema } from './schemas/growth-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GrowthRecord.name, schema: GrowthRecordSchema },
    ]),
  ],
  controllers: [GrowthController],
  providers: [GrowthService],
  exports: [GrowthService],
})
export class GrowthModule {}

