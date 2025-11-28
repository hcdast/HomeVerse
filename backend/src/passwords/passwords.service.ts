import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Password, PasswordDocument } from './schemas/password.schema';
import * as crypto from 'crypto';

@Injectable()
export class PasswordsService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly encryptionKey = process.env.ENCRYPTION_KEY || 'your-32-char-secret-key-change';

  constructor(
    @InjectModel(Password.name) private passwordModel: Model<PasswordDocument>,
  ) {}

  // 加密密码
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // 解密密码
  private decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async create(createDto: any): Promise<PasswordDocument> {
    const password = new this.passwordModel({
      ...createDto,
      encryptedPassword: this.encrypt(createDto.password),
    });
    return password.save();
  }

  async findByFamily(familyId: string): Promise<any[]> {
    const passwords = await this.passwordModel
      .find({ familyId })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .exec();
    
    // 返回时不包含实际密码
    return passwords.map(p => ({
      ...p.toObject(),
      encryptedPassword: undefined,
      hasPassword: true,
    }));
  }

  async getPassword(id: string, userId: string): Promise<{ password: string }> {
    const record = await this.passwordModel.findById(id).exec();
    
    if (!record) {
      throw new Error('密码记录不存在');
    }
    
    // 调试日志
    console.log('查看密码权限验证：');
    console.log('  密码ID:', id);
    console.log('  当前用户ID:', userId);
    console.log('  创建者ID:', record.createdBy?.toString());
    console.log('  共享列表:', record.sharedWith);
    
    // 检查权限（创建者或共享给该用户）
    const createdById = record.createdBy ? record.createdBy.toString() : null;
    const isCreator = createdById === userId || createdById === userId.toString();
    const sharedList = record.sharedWith || [];
    const isShared = sharedList.includes(userId) || sharedList.includes(userId.toString());
    
    console.log('  是创建者:', isCreator);
    console.log('  已共享:', isShared);
    
    if (!isCreator && !isShared) {
      throw new Error('无权访问此密码');
    }

    // 更新最后使用时间
    record.lastUsed = new Date();
    await record.save();

    try {
      const decryptedPassword = this.decrypt(record.encryptedPassword);
      return { password: decryptedPassword };
    } catch (error) {
      console.error('密码解密失败:', error.message);
      throw new Error('密码解密失败，请检查ENCRYPTION_KEY配置');
    }
  }

  async update(id: string, updateDto: any): Promise<PasswordDocument> {
    if (updateDto.password) {
      updateDto.encryptedPassword = this.encrypt(updateDto.password);
      delete updateDto.password;
    }
    return this.passwordModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.passwordModel.findByIdAndDelete(id).exec();
  }
}

