import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString({ message: '用户名/邮箱必须是字符串' })
  @IsNotEmpty({ message: '用户名/邮箱不能为空' })
  identifier: string; // 可以是用户名或邮箱

  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}

