import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '欢迎使用 HomeVerse 家庭管理平台 API';
  }
}

