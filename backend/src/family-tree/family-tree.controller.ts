import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { FamilyTreeService } from './family-tree.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('family-tree')
@UseGuards(JwtAuthGuard)
export class FamilyTreeController {
  constructor(private readonly familyTreeService: FamilyTreeService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.familyTreeService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  @Get()
  async findAll(@Request() req) {
    return this.familyTreeService.findByFamily(req.user.familyId);
  }

  @Get('tree')
  async getTreeData(@Request() req) {
    return this.familyTreeService.getTreeData(req.user.familyId);
  }

  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.familyTreeService.getStatistics(req.user.familyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.familyTreeService.findById(id);
  }

  @Get(':id/children')
  async getChildren(@Param('id') id: string) {
    return this.familyTreeService.getChildren(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.familyTreeService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.familyTreeService.delete(id);
    return { message: '已删除' };
  }
}




