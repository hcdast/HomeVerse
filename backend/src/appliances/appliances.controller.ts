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
import { AppliancesService } from './appliances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('appliances')
@UseGuards(JwtAuthGuard)
export class AppliancesController {
  constructor(private readonly appliancesService: AppliancesService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.appliancesService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  @Get()
  async findAll(@Query('category') category: string, @Request() req) {
    return this.appliancesService.findByFamily(req.user.familyId, category);
  }

  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.appliancesService.getStatistics(req.user.familyId);
  }

  @Get('warranty-expiring')
  async getExpiringWarranties(@Query('days') days: string, @Request() req) {
    return this.appliancesService.getExpiringWarranties(
      req.user.familyId,
      days ? parseInt(days) : 30,
    );
  }

  @Get('maintenance-due')
  async getMaintenanceDue(@Query('days') days: string, @Request() req) {
    return this.appliancesService.getMaintenanceDue(
      req.user.familyId,
      days ? parseInt(days) : 30,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.appliancesService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.appliancesService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.appliancesService.delete(id);
    return { message: '已删除' };
  }

  @Post(':id/maintenance-records')
  async addMaintenanceRecord(@Param('id') id: string, @Body() record: any) {
    return this.appliancesService.addMaintenanceRecord(id, record);
  }

  @Delete(':id/maintenance-records/:index')
  async deleteMaintenanceRecord(
    @Param('id') id: string,
    @Param('index') index: string,
  ) {
    return this.appliancesService.deleteMaintenanceRecord(id, parseInt(index));
  }
}



