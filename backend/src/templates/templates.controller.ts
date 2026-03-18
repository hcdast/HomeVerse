import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { TemplateCategory } from './schemas/template.schema';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  // 创建模板
  @Post()
  async create(@Request() req: any, @Body() dto: CreateTemplateDto) {
    const familyId = req.user.familyId;
    const userId = req.user.userId;
    return this.templatesService.create(familyId, userId, dto);
  }

  // 获取模板列表
  @Get()
  async findAll(@Request() req: any, @Query('category') category?: TemplateCategory) {
    const familyId = req.user.familyId;
    if (!familyId) {
      // 只返回系统模板
      return this.templatesService.findAll('000000000000000000000000', category);
    }
    return this.templatesService.findAll(familyId, category);
  }

  // 获取单个模板
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.templatesService.findById(id);
  }

  // 更新模板
  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    const familyId = req.user.familyId;
    return this.templatesService.update(id, familyId, dto);
  }

  // 删除模板
  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const familyId = req.user.familyId;
    await this.templatesService.delete(id, familyId);
    return { success: true };
  }

  // 使用模板
  @Post(':id/use')
  async useTemplate(@Param('id') id: string) {
    const template = await this.templatesService.useTemplate(id);
    return { success: true, template };
  }

  // 复制模板
  @Post(':id/copy')
  async copyTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body('name') name?: string,
  ) {
    const familyId = req.user.familyId;
    const userId = req.user.userId;
    return this.templatesService.copyTemplate(id, familyId, userId, name);
  }
}



