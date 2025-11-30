import { Controller, Get, Post, Delete, Body, Param, Query, Request, UseGuards, Logger } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(private readonly financeService: FinanceService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    this.logger.log(`创建财务记录: ${JSON.stringify(createDto)}`);
    
    const result = await this.financeService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
    
    this.logger.log(`记录创建成功: ${result._id}`);
    return result;
  }

  @Get()
  async getTransactions(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    this.logger.log(`查询财务记录 - familyId: ${req.user.familyId}`);
    
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const records = await this.financeService.findByFamily(req.user.familyId, start, end);
    
    this.logger.log(`找到 ${records.length} 条记录`);
    return records;
  }

  @Get('statistics')
  async getStatistics(
    @Query('year') year: number,
    @Query('month') month: number,
    @Request() req,
  ) {
    this.logger.log(`查询统计 - familyId: ${req.user.familyId}, year: ${year}, month: ${month}`);
    
    const stats = await this.financeService.getStatistics(req.user.familyId, year, month);
    
    this.logger.log(`统计结果: ${JSON.stringify(stats)}`);
    return stats;
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.financeService.delete(id);
    return { message: '记录已删除' };
  }
}

