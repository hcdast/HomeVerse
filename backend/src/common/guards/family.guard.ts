import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';

// 家庭权限守卫 - 确保用户只能访问自己家庭的数据
@Injectable()
export class FamilyGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = await this.usersService.findById(request.user.userId);
    
    if (!user || !user.familyId) {
      throw new ForbiddenException('用户未加入家庭');
    }
    
    // 将用户信息附加到请求对象
    request.user.familyId = user.familyId;
    return true;
  }
}

