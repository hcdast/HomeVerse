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
        health: '/health',
        auth: '/auth/*',
        users: '/users/*',
        families: '/families/*',
        albums: '/albums/*',
        files: '/files/*',
        articles: '/articles/*',
        ai: '/ai/*',
        database: '/database/*',
      },
    };
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      message: 'HomeVerse 后端服务运行正常',
      timestamp: new Date().toISOString(),
    };
  }
}

