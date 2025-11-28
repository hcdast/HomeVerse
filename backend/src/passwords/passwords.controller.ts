import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { PasswordsService } from './passwords.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('passwords')
@UseGuards(JwtAuthGuard)
export class PasswordsController {
  constructor(private readonly passwordsService: PasswordsService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    try {
      return await this.passwordsService.create({
        ...createDto,
        familyId: req.user.familyId,
        createdBy: req.user.userId,
      });
    } catch (error) {
      throw new HttpException(
        error.message || '创建失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async findAll(@Request() req) {
    return this.passwordsService.findByFamily(req.user.familyId);
  }

  @Get(':id/reveal')
  async getPassword(@Param('id') id: string, @Request() req) {
    try {
      return await this.passwordsService.getPassword(id, req.user.userId);
    } catch (error) {
      throw new HttpException(
        error.message || '查看密码失败',
        error.message === '密码记录不存在' ? HttpStatus.NOT_FOUND : HttpStatus.FORBIDDEN,
      );
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.passwordsService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.passwordsService.delete(id);
    return { message: '已删除' };
  }
}

