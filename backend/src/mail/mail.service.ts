import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  // 模块初始化时自动执行
  async onModuleInit() {
    if (this.transporter) {
      await this.verifyConnection();
    }
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com');
    const port = this.configService.get<number>('MAIL_PORT', 587);
    const secure = this.configService.get<boolean>('MAIL_SECURE', false);
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');

    this.logger.log('正在初始化邮件服务...');
    this.logger.log(`邮件配置 - Host: ${host}, Port: ${port}, Secure: ${secure}`);

    // 如果没有配置邮件服务
    if (!user || !pass) {
      this.logger.warn('⚠️ 邮件服务未配置，将不发送真实邮件。请在 .env 文件中配置 MAIL_USER 和 MAIL_PASSWORD');
      this.transporter = null;
      return;
    }

    this.logger.log(`邮件账户: ${user}`);

    try {
      // 基础配置
      const mailConfig: any = {
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      };

      // QQ邮箱特殊处理：587端口需要使用STARTTLS
      if (host === 'smtp.qq.com' && port === 587) {
        mailConfig.requireTLS = true;
        mailConfig.tls = {
          rejectUnauthorized: false,
        };
        this.logger.log('✅ 检测到QQ邮箱，已启用STARTTLS');
      }

      // 163邮箱特殊处理
      if (host === 'smtp.163.com') {
        mailConfig.tls = {
          rejectUnauthorized: false,
        };
        this.logger.log('✅ 检测到163邮箱，已优化配置');
      }

      this.transporter = nodemailer.createTransport(mailConfig);
      this.logger.log('✅ 邮件传输器创建成功');
    } catch (error) {
      this.logger.error('❌ 邮件服务初始化失败:', error.message);
      this.transporter = null;
    }
  }

  /**
   * 发送邀请成员邮件
   */
  async sendMemberInvitation(
    to: string,
    familyName: string,
    inviterName: string,
    role: string,
    inviteLink?: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`邮件服务未配置，跳过发送邮件到 ${to}`);
      return false;
    }

    try {
      const subject = `${inviterName} 邀请您加入 ${familyName}`;
      
      // 调试日志
      this.logger.log(`📧 准备发送邮件:`);
      this.logger.log(`   收件人: ${to}`);
      this.logger.log(`   家庭名称: ${familyName}`);
      this.logger.log(`   邀请人: ${inviterName}`);
      this.logger.log(`   角色: ${role}`);
      this.logger.log(`   邀请链接: ${inviteLink || '无（用户已注册）'}`);
      
      const html = this.generateInvitationEmailTemplate(
        familyName,
        inviterName,
        role,
        inviteLink,
      );

      this.logger.log(`   HTML内容长度: ${html.length} 字符`);
      
      // 验证邮件内容
      if (!html || html.length < 100) {
        this.logger.error('❌ HTML内容异常，长度过短或为空');
        return false;
      }

      const mailOptions = {
        from: {
          name: 'HomeVerse 家庭管理平台',
          address: this.configService.get<string>('MAIL_USER'),
        },
        to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ 邮件发送成功: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ 发送邮件失败 (收件人: ${to}):`, error.message);
      return false;
    }
  }

  /**
   * 生成邀请邮件HTML模板
   */
  private generateInvitationEmailTemplate(
    familyName: string,
    inviterName: string,
    role: string,
    inviteLink?: string,
  ): string {
    const roleNames = {
      owner: '所有者',
      admin: '管理员',
      editor: '编辑者',
      viewer: '访客',
      member: '成员',
    };

    const roleName = roleNames[role] || '成员';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    h1 {
      color: #667eea;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .content {
      margin: 30px 0;
    }
    .info-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box strong {
      color: #667eea;
    }
    .button {
      display: inline-block;
      padding: 12px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #999;
      font-size: 14px;
    }
    .note {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      color: #856404;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏠</div>
      <h1>家庭邀请</h1>
    </div>
    
    <div class="content">
      <p>您好！</p>
      
      <p><strong>${inviterName}</strong> 邀请您加入 <strong>${familyName}</strong>。</p>
      
      <div class="info-box">
        <p><strong>家庭名称：</strong>${familyName}</p>
        <p><strong>邀请人：</strong>${inviterName}</p>
        <p><strong>您的角色：</strong>${roleName}</p>
      </div>
      
      ${
        inviteLink
          ? `
      <div class="note">
        <p><strong>💡 提示：</strong>您需要先使用此邮箱注册 HomeVerse 账号，注册后将自动加入该家庭。</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${inviteLink}" class="button">立即注册并加入</a>
      </div>
      `
          : `
      <div style="text-align: center;">
        <p style="color: #28a745; font-weight: 600;">✅ 您已成功加入该家庭！</p>
        <a href="http://localhost:3000/login" class="button">立即登录查看</a>
      </div>
      `
      }
      
      <h3 style="margin-top: 30px;">关于 HomeVerse</h3>
      <p>HomeVerse 是一个综合性的家庭管理平台，为家庭成员提供：</p>
      <ul>
        <li>📷 相册管理 - 共享家庭照片</li>
        <li>📁 文件存储 - 安全存储重要文件</li>
        <li>📝 文章管理 - 记录生活点滴</li>
        <li>👥 成员协作 - 权限管理和协作</li>
      </ul>
    </div>
    
    <div class="footer">
      <p>此邮件由 HomeVerse 系统自动发送，请勿直接回复。</p>
      <p>如有疑问，请联系家庭管理员。</p>
      <p style="margin-top: 20px;">&copy; 2025 HomeVerse. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * 发送测试邮件
   */
  async sendTestEmail(to: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('邮件服务未配置，无法发送测试邮件');
      return false;
    }

    try {
      const mailOptions = {
        from: {
          name: 'HomeVerse 家庭管理平台',
          address: this.configService.get<string>('MAIL_USER'),
        },
        to,
        subject: 'HomeVerse 邮件服务测试',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>✅ 邮件服务配置成功！</h2>
            <p>这是一封测试邮件，说明 HomeVerse 邮件服务已正确配置。</p>
            <p>您现在可以接收来自 HomeVerse 的各类通知邮件。</p>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`测试邮件发送成功: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('发送测试邮件失败:', error.message);
      return false;
    }
  }

  /**
   * 验证邮件服务配置
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('邮件传输器未初始化，跳过验证');
      return false;
    }

    try {
      this.logger.log('正在验证邮件服务器连接...');
      await this.transporter.verify();
      this.logger.log('✅ 邮件服务器连接验证成功！邮件功能已就绪 🎉');
      return true;
    } catch (error) {
      this.logger.error(`❌ 邮件服务器连接验证失败: ${error.message}`);
      this.logger.error('');
      this.logger.error('💡 常见解决方案：');
      this.logger.error('');
      this.logger.error('【QQ邮箱用户】推荐使用465端口：');
      this.logger.error('  MAIL_HOST=smtp.qq.com');
      this.logger.error('  MAIL_PORT=465');
      this.logger.error('  MAIL_SECURE=true');
      this.logger.error('');
      this.logger.error('【Gmail用户】使用587端口：');
      this.logger.error('  MAIL_HOST=smtp.gmail.com');
      this.logger.error('  MAIL_PORT=587');
      this.logger.error('  MAIL_SECURE=false');
      this.logger.error('');
      this.logger.error('【密码问题】确保使用授权码：');
      this.logger.error('  QQ邮箱：使用16位授权码，不是QQ密码');
      this.logger.error('  Gmail：使用16位应用专用密码');
      this.logger.error('');
      return false;
    }
  }
}

