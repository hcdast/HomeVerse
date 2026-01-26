import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { TravelsService } from './travels.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('travels')
@UseGuards(JwtAuthGuard)
export class TravelsController {
  constructor(private readonly travelsService: TravelsService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.travelsService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
      participants: [req.user.userId, ...(createDto.participants || [])],
    });
  }

  @Get()
  async findAll(@Query('status') status: string, @Request() req) {
    return this.travelsService.findByFamily(req.user.familyId, status);
  }

  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.travelsService.getStatistics(req.user.familyId);
  }

  @Get('upcoming')
  async getUpcoming(@Request() req) {
    return this.travelsService.getUpcoming(req.user.familyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.travelsService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.travelsService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.travelsService.delete(id);
    return { message: '已删除' };
  }

  @Post(':id/itinerary')
  async addItineraryDay(@Param('id') id: string, @Body() day: any) {
    return this.travelsService.addItineraryDay(id, day);
  }

  @Post(':id/expenses')
  async addExpense(@Param('id') id: string, @Body() expense: any, @Request() req) {
    return this.travelsService.addExpense(id, { ...expense, paidBy: req.user.userId });
  }
}




