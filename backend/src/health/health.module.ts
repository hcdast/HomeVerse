import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';
import { HealthRecord, HealthRecordSchema } from './schemas/health-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HealthRecord.name, schema: HealthRecordSchema },
    ]),
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}

