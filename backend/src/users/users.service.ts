import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // 创建用户
  async create(createUserDto: any): Promise<UserDocument> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  // 根据邮箱查找用户
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  // 根据ID查找用户
  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  // 根据用户名查找用户
  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  // 更新用户信息
  async update(id: string, updateUserDto: any): Promise<UserDocument> {
    return this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
  }

  // 更新用户的家庭ID
  async updateFamilyId(userId: string, familyId: string): Promise<UserDocument> {
    return this.userModel.findByIdAndUpdate(userId, { familyId }, { new: true }).exec();
  }

  // 获取家庭成员列表
  async findFamilyMembers(familyId: string): Promise<UserDocument[]> {
    return this.userModel.find({ familyId }).exec();
  }
}

