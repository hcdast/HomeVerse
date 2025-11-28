import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FamiliesService } from './families.service';
import { FamiliesController } from './families.controller';
import { Family, FamilySchema } from './schemas/family.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Family.name, schema: FamilySchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
    MailModule,
  ],
  controllers: [FamiliesController],
  providers: [FamiliesService],
  exports: [FamiliesService],
})
export class FamiliesModule {}

