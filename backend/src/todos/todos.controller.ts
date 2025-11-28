import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { TodosService } from './todos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.todosService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  @Get()
  async findAll(@Request() req) {
    return this.todosService.findByFamily(req.user.familyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.todosService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.todosService.update(id, updateDto);
  }

  @Put(':id/toggle')
  async toggleComplete(@Param('id') id: string) {
    return this.todosService.toggleComplete(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.todosService.delete(id);
    return { message: '已删除' };
  }
}

