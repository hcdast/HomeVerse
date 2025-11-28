import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('recipes')
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.recipesService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  @Get()
  async findAll(@Request() req) {
    return this.recipesService.findByFamily(req.user.familyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.recipesService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.recipesService.update(id, updateDto);
  }

  @Put(':id/cook')
  async markAsCooked(@Param('id') id: string) {
    return this.recipesService.incrementCooks(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.recipesService.delete(id);
    return { message: '已删除' };
  }
}

