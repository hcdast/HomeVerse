import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as fs from 'fs';
import * as path from 'path';
import * as express from 'express';

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

  // 请求体大小限制（防 DoS）：JSON 与 urlencoded 最大 10MB
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

  // 启用全局异常过滤器（兜底捕获所有异常，响应中不暴露 stack）
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS：生产环境通过 CORS_ORIGINS 配置，禁止使用 *
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:5173'];
  app.enableCors({
    origin: corsOrigins,
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

