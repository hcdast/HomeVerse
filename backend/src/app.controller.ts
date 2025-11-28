import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot() {
    return {
      name: 'HomeVerse API',
      version: '2.0.0',
      status: 'running',
      message: this.appService.getHello(),
      endpoints: {
        healthCheck: '/health-check',
        auth: '/auth/*',
        users: '/users/*',
        families: '/families/*',
        albums: '/albums/*',
        files: '/files/*',
        articles: '/articles/*',
        ai: '/ai/*',
        database: '/database/*',
        calendar: '/calendar/*',
        todos: '/todos/*',
        finance: '/finance/*',
        recipes: '/recipes/*',
        health: '/health/*',
        growth: '/growth/*',
        wiki: '/wiki/*',
        passwords: '/passwords/*',
      },
    };
  }

  @Get('health-check')
  healthCheck() {
    return {
      status: 'ok',
      message: 'HomeVerse 后端服务运行正常',
      timestamp: new Date().toISOString(),
    };
  }
}

