import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

export interface ExportOptions {
  modules: string[];
  format: 'json' | 'csv';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ImportResult {
  module: string;
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class DataTransferService {
  private readonly logger = new Logger(DataTransferService.name);

  constructor(
    @InjectConnection() private connection: Connection,
  ) {}

  // 导出数据
  async exportData(familyId: string, options: ExportOptions): Promise<any> {
    const familyObjectId = new Types.ObjectId(familyId);
    const exportData: Record<string, any[]> = {};

    for (const moduleName of options.modules) {
      try {
        const data = await this.exportModule(familyObjectId, moduleName, options);
        exportData[moduleName] = data;
      } catch (error) {
        this.logger.error(`导出 ${moduleName} 失败: ${error.message}`);
        exportData[moduleName] = [];
      }
    }

    if (options.format === 'csv') {
      return this.convertToCSV(exportData);
    }

    return {
      exportedAt: new Date(),
      familyId,
      data: exportData,
    };
  }

  private async exportModule(
    familyId: Types.ObjectId,
    moduleName: string,
    options: ExportOptions,
  ): Promise<any[]> {
    const collectionName = this.getCollectionName(moduleName);
    const collection = this.connection.collection(collectionName);

    const filter: any = { familyId };

    // 日期范围过滤（如果有 createdAt 字段）
    if (options.dateRange) {
      filter.createdAt = {
        $gte: options.dateRange.start,
        $lte: options.dateRange.end,
      };
    }

    const documents = await collection.find(filter).toArray();

    // 清理敏感字段
    return documents.map(doc => {
      const cleaned = { ...doc };
      delete cleaned._id;
      delete cleaned.__v;
      // 将 ObjectId 转换为字符串
      Object.keys(cleaned).forEach(key => {
        if (cleaned[key] instanceof Types.ObjectId) {
          cleaned[key] = cleaned[key].toString();
        }
      });
      return cleaned;
    });
  }

  // 导入数据
  async importData(
    familyId: string,
    userId: string,
    moduleName: string,
    data: any[],
  ): Promise<ImportResult> {
    const familyObjectId = new Types.ObjectId(familyId);
    const userObjectId = new Types.ObjectId(userId);
    const collectionName = this.getCollectionName(moduleName);
    const collection = this.connection.collection(collectionName);

    const result: ImportResult = {
      module: moduleName,
      total: data.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      try {
        const item = data[i];
        
        // 添加必要字段
        const document = {
          ...item,
          familyId: familyObjectId,
          createdBy: userObjectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // 处理日期字段
        this.parseDateFields(document);

        await collection.insertOne(document);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(`第 ${i + 1} 行: ${error.message}`);
      }
    }

    this.logger.log(`导入 ${moduleName}: 成功 ${result.success}/${result.total}`);
    return result;
  }

  // 从 CSV 导入
  async importFromCSV(
    familyId: string,
    userId: string,
    moduleName: string,
    csvContent: string,
  ): Promise<ImportResult> {
    const data = this.parseCSV(csvContent);
    return this.importData(familyId, userId, moduleName, data);
  }

  // 备份家庭所有数据
  async backupFamily(familyId: string): Promise<any> {
    const modules = [
      'albums',
      'articles',
      'todos',
      'finances',
      'recipes',
      'calendars',
      'contacts',
      'healths',
      'shoppings',
      'chores',
    ];

    return this.exportData(familyId, {
      modules,
      format: 'json',
    });
  }

  // 恢复家庭数据
  async restoreFamily(
    familyId: string,
    userId: string,
    backupData: any,
  ): Promise<Record<string, ImportResult>> {
    const results: Record<string, ImportResult> = {};

    for (const [moduleName, data] of Object.entries(backupData.data || {})) {
      if (Array.isArray(data) && data.length > 0) {
        results[moduleName] = await this.importData(familyId, userId, moduleName, data);
      }
    }

    return results;
  }

  // 获取集合名称映射
  private getCollectionName(moduleName: string): string {
    const mapping: Record<string, string> = {
      albums: 'albums',
      articles: 'articles',
      todos: 'todos',
      finances: 'finances',
      recipes: 'recipes',
      calendars: 'calendarevents',
      contacts: 'contacts',
      healths: 'healths',
      shoppings: 'shoppings',
      chores: 'chores',
      files: 'files',
      passwords: 'passwords',
      budgets: 'budgets',
      goals: 'goals',
      travels: 'travels',
    };

    return mapping[moduleName] || moduleName;
  }

  // 解析日期字段
  private parseDateFields(obj: any): void {
    const dateFields = [
      'date', 'dueDate', 'startDate', 'endDate', 'completedAt',
      'birthday', 'expiryDate', 'reminderDate',
    ];

    for (const field of dateFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        const parsed = new Date(obj[field]);
        if (!isNaN(parsed.getTime())) {
          obj[field] = parsed;
        }
      }
    }
  }

  // 解析 CSV
  private parseCSV(csvContent: string): any[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new BadRequestException('CSV 格式无效');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const obj: any = {};
        headers.forEach((header, index) => {
          let value: any = values[index];
          // 尝试解析数字
          if (!isNaN(Number(value)) && value !== '') {
            value = Number(value);
          }
          // 尝试解析布尔值
          if (value === 'true') value = true;
          if (value === 'false') value = false;
          obj[header] = value;
        });
        data.push(obj);
      }
    }

    return data;
  }

  // 解析 CSV 行（处理引号）
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  // 转换为 CSV
  private convertToCSV(data: Record<string, any[]>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [module, items] of Object.entries(data)) {
      if (items.length === 0) {
        result[module] = '';
        continue;
      }

      const headers = Object.keys(items[0]);
      const csvLines = [headers.join(',')];

      for (const item of items) {
        const values = headers.map(h => {
          let val = item[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') val = JSON.stringify(val);
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        });
        csvLines.push(values.join(','));
      }

      result[module] = csvLines.join('\n');
    }

    return result;
  }
}



