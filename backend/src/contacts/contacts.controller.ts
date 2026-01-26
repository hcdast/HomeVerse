import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContactCategory } from './schemas/contact.schema';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  // 创建联系人
  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.contactsService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  // 获取所有联系人
  @Get()
  async findAll(@Query('category') category: ContactCategory, @Request() req) {
    if (category) {
      return this.contactsService.findByCategory(req.user.familyId, category);
    }
    return this.contactsService.findByFamily(req.user.familyId);
  }

  // 获取紧急联系人
  @Get('emergency')
  async getEmergency(@Request() req) {
    return this.contactsService.getEmergencyContacts(req.user.familyId);
  }

  // 获取收藏联系人
  @Get('favorites')
  async getFavorites(@Request() req) {
    return this.contactsService.getFavoriteContacts(req.user.familyId);
  }

  // 搜索联系人
  @Get('search')
  async search(@Query('keyword') keyword: string, @Request() req) {
    if (!keyword) {
      return [];
    }
    return this.contactsService.search(req.user.familyId, keyword);
  }

  // 获取统计信息
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.contactsService.getStatistics(req.user.familyId);
  }

  // 获取单个联系人
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contactsService.findById(id);
  }

  // 切换紧急联系人状态
  @Put(':id/toggle-emergency')
  async toggleEmergency(@Param('id') id: string) {
    return this.contactsService.toggleEmergency(id);
  }

  // 切换收藏状态
  @Put(':id/toggle-favorite')
  async toggleFavorite(@Param('id') id: string) {
    return this.contactsService.toggleFavorite(id);
  }

  // 更新联系人
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.contactsService.update(id, updateDto);
  }

  // 删除联系人
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.contactsService.delete(id);
    return { message: '已删除' };
  }

  // 批量导入联系人
  @Post('bulk-import')
  async bulkImport(@Body() body: { contacts: any[] }, @Request() req) {
    return this.contactsService.bulkImport(
      req.user.familyId,
      req.user.userId,
      body.contacts,
    );
  }
}

