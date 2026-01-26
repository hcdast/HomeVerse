import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TravelsController } from './travels.controller';
import { TravelsService } from './travels.service';
import { Travel, TravelSchema } from './schemas/travel.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Travel.name, schema: TravelSchema }])],
  controllers: [TravelsController],
  providers: [TravelsService],
  exports: [TravelsService],
})
export class TravelsModule {}



