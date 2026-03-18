import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { PerpetualCalendarService } from './perpetual-calendar.service';
import { CreateEventDto, UpdateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly perpetualCalendarService: PerpetualCalendarService,
  ) {}

  // 创建事件
  @Post()
  async create(@Body() createEventDto: CreateEventDto, @Request() req) {
    return this.calendarService.create({
      ...createEventDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  // 获取万年历信息（农历、节气、节日等）
  @Get('perpetual/:year/:month')
  async getPerpetualCalendar(
    @Param('year') year: number,
    @Param('month') month: number,
  ) {
    return this.perpetualCalendarService.getPerpetualCalendar(Number(year), Number(month));
  }

  // 获取聚合事件（整合日历、待办、提醒、纪念日）
  @Get('aggregated/:year/:month')
  async getAggregatedEvents(
    @Param('year') year: number,
    @Param('month') month: number,
    @Request() req,
  ) {
    return this.calendarService.getAggregatedEvents(
      req.user.familyId,
      req.user.userId,
      Number(year),
      Number(month),
    );
  }

  // 获取家庭事件
  @Get('family')
  async getFamilyEvents(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.calendarService.findByFamily(req.user.familyId, start, end);
  }

  // 获取我的事件
  @Get('my-events')
  async getMyEvents(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.calendarService.findByUser(req.user.userId, start, end);
  }

  // 获取即将到来的事件
  @Get('upcoming')
  async getUpcoming(@Request() req) {
    return this.calendarService.getUpcomingEvents(req.user.familyId);
  }

  // 获取单个事件
  @Get(':id')
  async getEvent(@Param('id') id: string) {
    return this.calendarService.findById(id);
  }

  // 更新事件
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto, @Request() req) {
    return this.calendarService.update(id, req.user.userId, updateEventDto);
  }

  // 删除事件
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.calendarService.delete(id, req.user.userId);
    return { message: '事件已删除' };
  }

  // 更新事件状态
  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.calendarService.updateStatus(id, body.status as any);
  }
}

