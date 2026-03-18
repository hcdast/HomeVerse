import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuPlannerController } from './menu-planner.controller';
import { MenuPlannerService } from './menu-planner.service';
import {
  MealPlan,
  MealPlanSchema,
  MenuPlan,
  MenuPlanSchema,
  ShoppingListGeneration,
  ShoppingListGenerationSchema,
} from './schemas/menu-planner.schema';
import { Recipe, RecipeSchema } from '../recipes/schemas/recipe.schema';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MealPlan.name, schema: MealPlanSchema },
      { name: MenuPlan.name, schema: MenuPlanSchema },
      { name: ShoppingListGeneration.name, schema: ShoppingListGenerationSchema },
      { name: Recipe.name, schema: RecipeSchema },
    ]),
    forwardRef(() => AiModule),
  ],
  controllers: [MenuPlannerController],
  providers: [MenuPlannerService],
  exports: [MenuPlannerService],
})
export class MenuPlannerModule {}
