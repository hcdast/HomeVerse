import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Todo, TodoDocument } from './schemas/todo.schema';

@Injectable()
export class TodosService {
  constructor(
    @InjectModel(Todo.name) private todoModel: Model<TodoDocument>,
  ) {}

  async create(createDto: any): Promise<TodoDocument> {
    const todo = new this.todoModel(createDto);
    return todo.save();
  }

  async findByFamily(familyId: string): Promise<TodoDocument[]> {
    return this.todoModel
      .find({ familyId })
      .populate('createdBy', 'username')
      .populate('assignedTo', 'username')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<TodoDocument> {
    return this.todoModel.findById(id).exec();
  }

  async update(id: string, updateDto: any): Promise<TodoDocument> {
    return this.todoModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.todoModel.findByIdAndDelete(id).exec();
  }

  async toggleComplete(id: string): Promise<TodoDocument> {
    const todo = await this.findById(id);
    todo.completed = !todo.completed;
    return todo.save();
  }
}

