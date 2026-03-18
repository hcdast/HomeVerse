import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MultiFamilyController } from './multi-family.controller';
import { MultiFamilyService } from './multi-family.service';
import { FamilyMembership, FamilyMembershipSchema } from './schemas/family-membership.schema';
import { Family, FamilySchema } from '../families/schemas/family.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FamilyMembership.name, schema: FamilyMembershipSchema },
      { name: Family.name, schema: FamilySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [MultiFamilyController],
  providers: [MultiFamilyService],
  exports: [MultiFamilyService],
})
export class MultiFamilyModule {}
