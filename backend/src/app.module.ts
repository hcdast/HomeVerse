import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FamiliesModule } from './families/families.module';
import { AlbumsModule } from './albums/albums.module';
import { FilesModule } from './files/files.module';
import { ArticlesModule } from './articles/articles.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    // 配置模块 - 加载环境变量（必须在最前面）
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用
      envFilePath: '.env',
    }),
    // MongoDB 数据库连接
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/homeverse';
        return {
          uri,
          // 连接选项
          retryWrites: true,
          w: 'majority',
        };
      },
      inject: [ConfigService],
    }),
    // 业务模块
    AuthModule,
    UsersModule,
    FamiliesModule,
          AlbumsModule,
          FilesModule,
          ArticlesModule,
          AiModule,
        ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

