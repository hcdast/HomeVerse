import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// 统一响应格式拦截器
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 如果已经有 message 字段，说明是自定义响应，直接返回
        if (data && typeof data === 'object' && 'message' in data) {
          return data;
        }
        // 否则包装成统一格式
        return {
          success: true,
          data,
        };
      }),
    );
  }
}

