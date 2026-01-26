import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { BooksService } from './books.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('books')
@UseGuards(JwtAuthGuard)
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.booksService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  @Get()
  async findAll(
    @Query('category') category: string,
    @Query('status') status: string,
    @Query('wishlist') wishlist: string,
    @Request() req,
  ) {
    return this.booksService.findByFamily(req.user.familyId, {
      category,
      status,
      isWishlist: wishlist === 'true',
    });
  }

  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.booksService.getStatistics(req.user.familyId);
  }

  @Get('reading')
  async getCurrentlyReading(@Request() req) {
    return this.booksService.getCurrentlyReading(req.user.familyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.booksService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.booksService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.booksService.delete(id);
    return { message: '已删除' };
  }

  @Post(':id/start-reading')
  async startReading(@Param('id') id: string, @Request() req) {
    return this.booksService.startReading(id, req.user.userId);
  }

  @Put(':id/progress')
  async updateProgress(@Param('id') id: string, @Body() body: { currentPage: number }) {
    return this.booksService.updateProgress(id, body.currentPage);
  }

  @Post(':id/finish')
  async finishReading(@Param('id') id: string, @Body() body: { rating?: number; review?: string }) {
    return this.booksService.finishReading(id, body.rating, body.review);
  }

  @Post(':id/notes')
  async addNote(@Param('id') id: string, @Body() note: any, @Request() req) {
    return this.booksService.addNote(id, req.user.userId, note);
  }
}




