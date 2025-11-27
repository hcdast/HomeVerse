import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedService } from './seed.service';
import { DatabaseController } from './database.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Family, FamilySchema } from '../families/schemas/family.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Family.name, schema: FamilySchema },
    ]),
  ],
  controllers: [DatabaseController],
  providers: [SeedService],
  exports: [SeedService],
})
export class DatabaseModule {}

