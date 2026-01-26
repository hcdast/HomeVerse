import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShoppingController } from './shopping.controller';
import { ShoppingService } from './shopping.service';
import { ShoppingItem, ShoppingItemSchema } from './schemas/shopping-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShoppingItem.name, schema: ShoppingItemSchema },
    ]),
  ],
  controllers: [ShoppingController],
  providers: [ShoppingService],
  exports: [ShoppingService],
})
export class ShoppingModule {}

