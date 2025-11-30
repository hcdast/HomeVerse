import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async create(createDto: any): Promise<TransactionDocument> {
    this.logger.log(`保存财务记录: ${JSON.stringify(createDto)}`);
    
    const transaction = new this.transactionModel(createDto);
    const saved = await transaction.save();
    
    this.logger.log(`记录保存成功: ${saved._id}`);
    return saved;
  }

  async findByFamily(familyId: string, startDate?: Date, endDate?: Date): Promise<TransactionDocument[]> {
    const query: any = { familyId };
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    return this.transactionModel.find(query).populate('createdBy', 'username').sort({ date: -1 }).exec();
  }

  async getStatistics(familyId: string, year?: number, month?: number): Promise<any> {
    try {
      // 如果没有指定年月，使用当前年月
      const now = new Date();
      const currentYear = year ? Number(year) : now.getFullYear();
      const currentMonth = month !== undefined ? Number(month) : now.getMonth();
      
      this.logger.log(`统计参数 - year: ${currentYear}, month: ${currentMonth} (0-11)`);
      
      // 月份范围：0-11，创建月初和月末日期
      const startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      // 月末：下个月的第0天 = 本月最后一天
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      
      this.logger.log(`查询范围: ${startDate.toISOString()} 到 ${endDate.toISOString()}`);

      const transactions = await this.transactionModel.find({
        familyId,
        date: { $gte: startDate, $lte: endDate },
      }).exec();

      this.logger.log(`找到 ${transactions.length} 条交易记录`);

      const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      const result = {
        income,
        expense,
        balance: income - expense,
        transactions: transactions.length,
      };
      
      this.logger.log(`统计结果: 收入=${income}, 支出=${expense}, 结余=${result.balance}`);

      return result;
    } catch (error) {
      this.logger.error('财务统计查询失败:', error);
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

