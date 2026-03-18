import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';
import {
  Point,
  PointSchema,
  PointBalance,
  PointBalanceSchema,
  Reward,
  RewardSchema,
  Redemption,
  RedemptionSchema,
} from './schemas/point.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Point.name, schema: PointSchema },
      { name: PointBalance.name, schema: PointBalanceSchema },
      { name: Reward.name, schema: RewardSchema },
      { name: Redemption.name, schema: RedemptionSchema },
    ]),
  ],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
