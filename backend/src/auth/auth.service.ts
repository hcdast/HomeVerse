import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { FamiliesService } from '../families/families.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private familiesService: FamiliesService,
    private jwtService: JwtService,
  ) {}

  // 用户注册
  async register(registerDto: RegisterDto) {
    const { username, email, password } = registerDto;

    // 检查用户是否已存在
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await this.usersService.create({
      username,
      email,
      password: hashedPassword,
    });

    // 创建默认家庭
    const family = await this.familiesService.create({
      name: `${username}的家庭`,
      createdBy: user._id.toString(),
    });

    // 将用户添加到家庭
    await this.familiesService.addMember(family._id.toString(), user._id.toString());
    
    // 更新用户的家庭ID
    await this.usersService.updateFamilyId(user._id.toString(), family._id.toString());

    // 生成JWT token
    const payload = { email: user.email, sub: user._id };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        familyId: family._id,
      },
    };
  }

  // 验证用户登录
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  // 用户登录
  async login(user: any) {
    const payload = { email: user.email, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        familyId: user.familyId,
      },
    };
  }
}

