import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Family, FamilyDocument } from '../families/schemas/family.schema';
import { UserRole } from '../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Family.name) private familyModel: Model<FamilyDocument>,
  ) {}

  // 初始化演示数据
  async seedDemoData() {
    try {
      // 检查是否已有数据
      const userCount = await this.userModel.countDocuments();
      if (userCount > 0) {
        this.logger.log('数据库已有数据，跳过初始化');
        return;
      }

      this.logger.log('开始初始化演示数据...');

      // 创建演示家庭
      const demoFamily = await this.familyModel.create({
        name: '演示家庭',
        description: '这是一个演示家庭',
        createdBy: null, // 临时设置为 null
        members: [],
      });

      // 创建演示用户
      const hashedPassword = await bcrypt.hash('123456', 10);

      // Owner
      const owner = await this.userModel.create({
        username: '家庭所有者',
        email: 'owner@example.com',
        password: hashedPassword,
        role: UserRole.OWNER,
        familyId: demoFamily._id.toString(),
      });

      // Admin
      const admin = await this.userModel.create({
        username: '管理员',
        email: 'admin@example.com',
        password: hashedPassword,
        role: UserRole.ADMIN,
        familyId: demoFamily._id.toString(),
      });

      // Editor
      const editor = await this.userModel.create({
        username: '编辑者',
        email: 'editor@example.com',
        password: hashedPassword,
        role: UserRole.EDITOR,
        familyId: demoFamily._id.toString(),
      });

      // Member
      const member = await this.userModel.create({
        username: '普通成员',
        email: 'member@example.com',
        password: hashedPassword,
        role: UserRole.MEMBER,
        familyId: demoFamily._id.toString(),
      });

      // 更新家庭信息
      demoFamily.createdBy = owner._id.toString();
      demoFamily.members = [
        owner._id.toString(),
        admin._id.toString(),
        editor._id.toString(),
        member._id.toString(),
      ];
      await demoFamily.save();

      this.logger.log('演示数据初始化完成！');
      this.logger.log('演示账号:');
      this.logger.log('  Owner:  owner@example.com / 123456');
      this.logger.log('  Admin:  admin@example.com / 123456');
      this.logger.log('  Editor: editor@example.com / 123456');
      this.logger.log('  Member: member@example.com / 123456');

      return {
        message: '演示数据初始化成功',
        users: [
          { email: 'owner@example.com', role: UserRole.OWNER },
          { email: 'admin@example.com', role: UserRole.ADMIN },
          { email: 'editor@example.com', role: UserRole.EDITOR },
          { email: 'member@example.com', role: UserRole.MEMBER },
        ],
        password: '123456',
      };
    } catch (error) {
      this.logger.error('初始化演示数据失败:', error);
      throw error;
    }
  }

  // 清除所有数据
  async clearAllData() {
    try {
      await this.userModel.deleteMany({});
      await this.familyModel.deleteMany({});
      this.logger.log('所有数据已清除');
      return { message: '数据清除成功' };
    } catch (error) {
      this.logger.error('清除数据失败:', error);
      throw error;
    }
  }
}

