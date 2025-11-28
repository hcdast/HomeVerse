import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { GrowthService } from './growth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('growth')
@UseGuards(JwtAuthGuard)
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.growthService.create({
      ...createDto,
      // 如果childId为空，使用当前登录用户
      childId: createDto.childId || req.user.userId,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  @Get()
  async findAll(@Request() req) {
    return this.growthService.findByFamily(req.user.familyId);
  }

  @Get('child/:childId')
  async findByChild(@Param('childId') childId: string) {
    return this.growthService.findByChild(childId);
  }

  @Get('child/:childId/chart')
  async getChart(@Param('childId') childId: string) {
    return this.growthService.getGrowthChart(childId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.growthService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.growthService.delete(id);
    return { message: '已删除' };
  }
}

