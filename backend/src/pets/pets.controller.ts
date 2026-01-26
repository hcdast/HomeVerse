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
import { PetsService } from './pets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.petsService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  @Get()
  async findAll(@Request() req) {
    return this.petsService.findByFamily(req.user.familyId);
  }

  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.petsService.getStatistics(req.user.familyId);
  }

  @Get('health-reminders')
  async getHealthReminders(@Query('days') days: string, @Request() req) {
    return this.petsService.getUpcomingHealthReminders(
      req.user.familyId,
      days ? parseInt(days) : 30,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.petsService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.petsService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.petsService.delete(id);
    return { message: '已删除' };
  }

  @Post(':id/health-records')
  async addHealthRecord(@Param('id') id: string, @Body() record: any) {
    return this.petsService.addHealthRecord(id, record);
  }

  @Delete(':id/health-records/:index')
  async deleteHealthRecord(
    @Param('id') id: string,
    @Param('index') index: string,
  ) {
    return this.petsService.deleteHealthRecord(id, parseInt(index));
  }

  @Post(':id/feeding-records')
  async addFeedingRecord(
    @Param('id') id: string,
    @Body() record: any,
    @Request() req,
  ) {
    return this.petsService.addFeedingRecord(id, {
      ...record,
      fedBy: req.user.userId,
      time: new Date(),
    });
  }
}


