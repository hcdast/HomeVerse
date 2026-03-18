import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * 校验并解析 MongoDB ObjectId，用于路径参数（如 :id、:photoId）。
 * 无效时抛出 400，避免注入或无效查询。
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, Types.ObjectId> {
  transform(value: string): Types.ObjectId {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('无效的 ID 参数');
    }
    const trimmed = value.trim();
    if (!Types.ObjectId.isValid(trimmed)) {
      throw new BadRequestException('ID 格式不正确');
    }
    return new Types.ObjectId(trimmed);
  }
}
