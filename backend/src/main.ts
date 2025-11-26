import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // 确保上传目录存在
  const uploadDirs = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'uploads', 'photos'),
    path.join(process.cwd(), 'uploads', 'files'),
  ];
  
  uploadDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 创建上传目录: ${dir}`);
    }
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 启用全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // 自动过滤未定义的属性
    transform: true, // 自动转换类型
    transformOptions: {
      enableImplicitConversion: true, // 启用隐式类型转换
    },
    exceptionFactory: (errors) => {
      // 自定义验证错误格式
      const messages = errors.map(error => 
        Object.values(error.constraints || {}).join(', ')
      );
      return new HttpException(
        {
          message: messages.join('; '),
          errors,
        },
        HttpStatus.BAD_REQUEST,
      );
    },
  }));

  // 启用全局异常过滤器（统一错误响应格式）
  app.useGlobalFilters(new HttpExceptionFilter());

  // 启用 CORS，允许前端跨域访问
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // 前端开发服务器地址
    credentials: true,
  });

  // 配置静态文件服务 - 提供上传的文件访问
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads', // 访问路径前缀
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 后端服务已启动，运行在 http://localhost:${port}`);
  console.log(`📁 静态文件服务: http://localhost:${port}/uploads`);
}

bootstrap();

