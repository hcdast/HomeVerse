import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { WikiService } from './wiki.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wiki')
@UseGuards(JwtAuthGuard)
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.wikiService.create({
      ...createDto,
      familyId: req.user.familyId,
    }, req.user.userId);
  }

  @Get()
  async findAll(@Request() req) {
    return this.wikiService.findByFamily(req.user.familyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.wikiService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
    return this.wikiService.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.wikiService.delete(id);
    return { message: '已删除' };
  }
}

