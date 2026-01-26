import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { EducationService } from './education.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('education')
@UseGuards(JwtAuthGuard)
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.educationService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  @Get()
  async findAll(@Request() req) {
    return this.educationService.findByFamily(req.user.familyId);
  }

  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.educationService.getStatistics(req.user.familyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.educationService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.educationService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.educationService.delete(id);
    return { message: '已删除' };
  }

  @Post(':id/courses')
  async addCourse(@Param('id') id: string, @Body() course: any) {
    return this.educationService.addCourse(id, course);
  }

  @Post(':id/grades')
  async addGrade(@Param('id') id: string, @Body() grade: any) {
    return this.educationService.addGrade(id, grade);
  }
}




