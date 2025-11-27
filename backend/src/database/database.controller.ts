import { Controller, Post, Delete, Get } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('database')
export class DatabaseController {
  constructor(private readonly seedService: SeedService) {}

  // 初始化演示数据
  @Post('seed')
  async seedData() {
    return this.seedService.seedDemoData();
  }

  // 清除所有数据（开发环境使用）
  @Delete('clear')
  async clearData() {
    return this.seedService.clearAllData();
  }

  // 健康检查
  @Get('health')
  healthCheck() {
    return { status: 'ok', message: '数据库连接正常' };
  }
}

