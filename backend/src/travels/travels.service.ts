import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Travel, TravelDocument, TravelDay, TravelExpense } from './schemas/travel.schema';

@Injectable()
export class TravelsService {
  constructor(@InjectModel(Travel.name) private travelModel: Model<TravelDocument>) {}

  async create(createDto: Partial<Travel>): Promise<TravelDocument> {
    const travel = new this.travelModel(createDto);
    return travel.save();
  }

  async findByFamily(familyId: string, status?: string): Promise<TravelDocument[]> {
    const query: any = { familyId };
    if (status) query.status = status;
    return this.travelModel.find(query)
      .populate('createdBy', 'username avatar')
      .populate('participants', 'username avatar')
      .sort({ startDate: -1 }).exec();
  }

  async findById(id: string): Promise<TravelDocument> {
    const travel = await this.travelModel.findById(id)
      .populate('createdBy', 'username avatar')
      .populate('participants', 'username avatar')
      .populate('expenses.paidBy', 'username avatar').exec();
    if (!travel) throw new NotFoundException('旅行计划不存在');
    return travel;
  }

  async update(id: string, updateDto: Partial<Travel>): Promise<TravelDocument> {
    const travel = await this.travelModel.findByIdAndUpdate(id, updateDto, { new: true });
    if (!travel) throw new NotFoundException('旅行计划不存在');
    return travel;
  }

  async delete(id: string): Promise<void> {
    const result = await this.travelModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('旅行计划不存在');
  }

  async addItineraryDay(travelId: string, day: Partial<TravelDay>): Promise<TravelDocument> {
    const travel = await this.travelModel.findById(travelId);
    if (!travel) throw new NotFoundException('旅行计划不存在');
    travel.itinerary.push(day as any);
    travel.itinerary.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return travel.save();
  }

  async addExpense(travelId: string, expense: Partial<TravelExpense>): Promise<TravelDocument> {
    const travel = await this.travelModel.findById(travelId);
    if (!travel) throw new NotFoundException('旅行计划不存在');
    travel.expenses.push(expense as any);
    return travel.save();
  }

  async getStatistics(familyId: string): Promise<any> {
    const travels = await this.travelModel.find({ familyId }).exec();
    let totalExpenses = 0;
    let completedCount = 0;
    const destinations: Set<string> = new Set();

    for (const travel of travels) {
      if (travel.status === 'completed') completedCount++;
      if (travel.destination) destinations.add(travel.destination);
      for (const expense of travel.expenses) {
        totalExpenses += expense.amount || 0;
      }
    }

    return {
      total: travels.length,
      completedCount,
      planningCount: travels.filter(t => t.status === 'planning').length,
      totalExpenses,
      destinationCount: destinations.size,
    };
  }

  async getUpcoming(familyId: string): Promise<TravelDocument[]> {
    const now = new Date();
    return this.travelModel.find({
      familyId,
      status: { $in: ['planning', 'ongoing'] },
      startDate: { $gte: now },
    }).sort({ startDate: 1 }).limit(5).exec();
  }
}




