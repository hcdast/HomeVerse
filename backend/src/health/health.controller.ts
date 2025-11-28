import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards, Logger } from '@nestjs/common';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('health')
@UseGuards(JwtAuthGuard)
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    const data = {
      ...createDto,
      // 如果userId为空，使用当前登录用户
      userId: createDto.userId || req.user.userId,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    };
    
    this.logger.log(`创建健康记录: ${JSON.stringify(data)}`);
    
    const result = await this.healthService.create(data);
    
    this.logger.log(`健康记录创建成功: ${result._id}`);
    
    return result;
  }

  @Get()
  async findAll(@Request() req) {
    this.logger.log(`查询健康记录 - familyId: ${req.user.familyId}`);
    
    const records = await this.healthService.findByFamily(req.user.familyId);
    
    this.logger.log(`找到 ${records.length} 条健康记录`);
    
    return records;
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.healthService.findByUser(userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.healthService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.healthService.delete(id);
    return { message: '已删除' };
  }
}

