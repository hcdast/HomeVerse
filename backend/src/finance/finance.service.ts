import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';

@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async create(createDto: any): Promise<TransactionDocument> {
    const transaction = new this.transactionModel(createDto);
    return transaction.save();
  }

  async findByFamily(familyId: string, startDate?: Date, endDate?: Date): Promise<TransactionDocument[]> {
    const query: any = { familyId };
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    return this.transactionModel.find(query).populate('createdBy', 'username').sort({ date: -1 }).exec();
  }

  async getStatistics(familyId: string, year?: number, month?: number): Promise<any> {
    // 如果没有指定年月，使用当前年月
    const now = new Date();
    const currentYear = year ? Number(year) : now.getFullYear();
    const currentMonth = month !== undefined ? Number(month) : now.getMonth();
    
    // 月份范围：0-11，创建月初和月末日期
    const startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    // 月末：下个月的第0天 = 本月最后一天
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    try {
      const transactions = await this.transactionModel.find({
        familyId,
        date: { $gte: startDate, $lte: endDate },
      }).exec();

      const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      return {
        income,
        expense,
        balance: income - expense,
        transactions: transactions.length,
      };
    } catch (error) {
      console.error('财务统计查询失败:', error);
      return {
        income: 0,
        expense: 0,
        balance: 0,
        transactions: 0,
      };
    }
  }

  async delete(id: string): Promise<void> {
    await this.transactionModel.findByIdAndDelete(id);
  }
}

