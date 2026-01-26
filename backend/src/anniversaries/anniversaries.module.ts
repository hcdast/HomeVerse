import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnniversariesController } from './anniversaries.controller';
import { AnniversariesService } from './anniversaries.service';
import { Anniversary, AnniversarySchema } from './schemas/anniversary.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Anniversary.name, schema: AnniversarySchema },
    ]),
  ],
  controllers: [AnniversariesController],
  providers: [AnniversariesService],
  exports: [AnniversariesService],
})
export class AnniversariesModule {}

