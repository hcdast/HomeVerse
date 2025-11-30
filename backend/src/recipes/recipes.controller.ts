import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards, Logger, BadRequestException } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('recipes')
@UseGuards(JwtAuthGuard)
export class RecipesController {
  private readonly logger = new Logger(RecipesController.name);

  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  async create(@Body() createDto: any, @Request() req) {
    this.logger.log(`创建食谱请求: ${JSON.stringify(createDto)}`);
    
    // 验证必填字段
    if (!createDto.name) {
      throw new BadRequestException('菜名不能为空');
    }
    
    try {
      const data = {
        ...createDto,
        cookingTime: createDto.cookingTime ? Number(createDto.cookingTime) : undefined,
        familyId: req.user.familyId,
        createdBy: req.user.userId,
      };
      
      this.logger.log(`保存食谱数据: ${JSON.stringify(data)}`);
      
      const result = await this.recipesService.create(data);
      
      this.logger.log(`食谱创建成功: ${result._id}`);
      return result;
    } catch (error) {
      this.logger.error(`创建食谱失败: ${error.message}`);
      throw new BadRequestException(error.message || '创建失败');
    }
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

