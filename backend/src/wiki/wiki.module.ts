import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WikiService } from './wiki.service';
import { WikiController } from './wiki.controller';
import { WikiPage, WikiPageSchema } from './schemas/wiki-page.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WikiPage.name, schema: WikiPageSchema },
    ]),
  ],
  controllers: [WikiController],
  providers: [WikiService],
  exports: [WikiService],
})
export class WikiModule {}

