import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 用户注册（严格限流：5 次 / 5 分钟，防恶意注册）
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // 用户登录（严格限流：5 次 / 5 分钟，防暴力破解）
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @UseGuards(AuthGuard('local'))
  async login(@Request() req, @Body() loginDto: LoginDto) {
    return this.authService.login(req.user);
  }

  // 刷新token（可选功能）
  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  async refresh(@Request() req) {
    return this.authService.login(req.user);
  }
}

