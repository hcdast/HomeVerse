import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Recipe, RecipeDocument } from './schemas/recipe.schema';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(
    @InjectModel(Recipe.name) private recipeModel: Model<RecipeDocument>,
  ) {}

  async create(createDto: any): Promise<RecipeDocument> {
    this.logger.log(`创建食谱: ${JSON.stringify(createDto)}`);
    
    const recipe = new this.recipeModel(createDto);
    const saved = await recipe.save();
    
    this.logger.log(`食谱保存成功: ${saved._id}`);
    return saved;
  }

  async findByFamily(familyId: string): Promise<RecipeDocument[]> {
    return this.recipeModel
      .find({ familyId })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<RecipeDocument> {
    return this.recipeModel.findById(id).populate('createdBy', 'username').exec();
  }

  async update(id: string, updateDto: any): Promise<RecipeDocument> {
    return this.recipeModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.recipeModel.findByIdAndDelete(id).exec();
  }

  async incrementCooks(id: string): Promise<RecipeDocument> {
    return this.recipeModel.findByIdAndUpdate(
      id,
      { $inc: { cooks: 1 } },
      { new: true }
    ).exec();
  }
}

