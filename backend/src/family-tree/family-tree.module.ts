import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FamilyTreeController } from './family-tree.controller';
import { FamilyTreeService } from './family-tree.service';
import { FamilyMember, FamilyMemberSchema } from './schemas/family-tree.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: FamilyMember.name, schema: FamilyMemberSchema }])],
  controllers: [FamilyTreeController],
  providers: [FamilyTreeService],
  exports: [FamilyTreeService],
})
export class FamilyTreeModule {}






