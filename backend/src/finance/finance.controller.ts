import { Controller, Get, Post, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.financeService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  @Get()
  async getTransactions(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.financeService.findByFamily(req.user.familyId, start, end);
  }

  @Get('statistics')
  async getStatistics(
    @Query('year') year: number,
    @Query('month') month: number,
    @Request() req,
  ) {
    return this.financeService.getStatistics(req.user.familyId, year, month);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.financeService.delete(id);
    return { message: '记录已删除' };
  }
}

