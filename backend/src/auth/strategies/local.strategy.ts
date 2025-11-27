import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'identifier', // 使用identifier字段（可以是用户名或邮箱）
    });
  }

  // 验证用户登录凭证
  async validate(identifier: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(identifier, password);
    if (!user) {
      throw new UnauthorizedException('用户名/邮箱或密码错误');
    }
    return user;
  }
}

