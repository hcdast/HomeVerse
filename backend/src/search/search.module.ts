import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Article, ArticleSchema } from '../articles/schemas/article.schema';
import { File, FileSchema } from '../files/schemas/file.schema';
import { Album, AlbumSchema } from '../albums/schemas/album.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Article.name, schema: ArticleSchema },
      { name: File.name, schema: FileSchema },
      { name: Album.name, schema: AlbumSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}

