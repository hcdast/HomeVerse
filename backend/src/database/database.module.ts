import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedService } from './seed.service';
import { StatisticsService } from './statistics.service';
import { DatabaseController } from './database.controller';
import { StatisticsController } from './statistics.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Family, FamilySchema } from '../families/schemas/family.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Family.name, schema: FamilySchema },
    ]),
  ],
  controllers: [DatabaseController, StatisticsController],
  providers: [SeedService, StatisticsService],
  exports: [SeedService, StatisticsService],
})
export class DatabaseModule {}

