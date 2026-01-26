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
import { DatabaseModule } from './database/database.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { MailModule } from './mail/mail.module';
import { CalendarModule } from './calendar/calendar.module';
import { FinanceModule } from './finance/finance.module';
import { RecipesModule } from './recipes/recipes.module';
import { TodosModule } from './todos/todos.module';
import { HealthModule } from './health/health.module';
import { WikiModule } from './wiki/wiki.module';
import { PasswordsModule } from './passwords/passwords.module';
import { GrowthModule } from './growth/growth.module';
import { StorageModule } from './storage/storage.module';
import { ShoppingModule } from './shopping/shopping.module';
import { ChoresModule } from './chores/chores.module';
import { ContactsModule } from './contacts/contacts.module';
import { MomentsModule } from './moments/moments.module';
import { BudgetsModule } from './budgets/budgets.module';
import { AnniversariesModule } from './anniversaries/anniversaries.module';
import { RemindersModule } from './reminders/reminders.module';
import { GoalsModule } from './goals/goals.module';
import { LocationsModule } from './locations/locations.module';
// P2/P3 扩展功能模块
import { PetsModule } from './pets/pets.module';
import { AppliancesModule } from './appliances/appliances.module';
import { TravelsModule } from './travels/travels.module';
import { EducationModule } from './education/education.module';
import { FamilyTreeModule } from './family-tree/family-tree.module';
import { BooksModule } from './books/books.module';

@Module({
  imports: [
    // 配置模块 - 加载环境变量（必须在最前面）
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用
      envFilePath: '.env',
    }),
    // MinIO 对象存储模块（全局）
    StorageModule,
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
    DatabaseModule,
    NotificationsModule,
    SearchModule,
    ActivityLogsModule,
    MailModule,
    // 新增功能模块
    CalendarModule,
    FinanceModule,
    RecipesModule,
    TodosModule,
    HealthModule,
    WikiModule,
    PasswordsModule,
    GrowthModule,
    // P0 新功能模块
    ShoppingModule,
    ChoresModule,
    ContactsModule,
    // P1 新功能模块
    MomentsModule,
    BudgetsModule,
    AnniversariesModule,
    // P2 新功能模块
    RemindersModule,
    GoalsModule,
    LocationsModule,
    // P2/P3 扩展功能模块
    PetsModule,
    AppliancesModule,
    TravelsModule,
    EducationModule,
    FamilyTreeModule,
    BooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

