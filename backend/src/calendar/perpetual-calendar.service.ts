import { Injectable } from '@nestjs/common';

/**
 * 万年历服务
 * 提供农历、节气、节日等信息
 */
@Injectable()
export class PerpetualCalendarService {
  // 农历数据（简化版，实际应使用完整的农历库）
  private readonly lunarMonthDays = [
    [0, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29], // 1900年
    // 这里应该添加完整的农历数据
  ];

  // 节气
  private readonly solarTerms = [
    '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
    '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
    '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
  ];

  // 法定节假日
  private readonly holidays = {
    '01-01': '元旦',
    '02-14': '情人节',
    '03-08': '妇女节',
    '05-01': '劳动节',
    '05-04': '青年节',
    '06-01': '儿童节',
    '10-01': '国庆节',
    '12-25': '圣诞节',
  };

  // 农历节日
  private readonly lunarHolidays = {
    '01-01': '春节',
    '01-15': '元宵节',
    '05-05': '端午节',
    '07-07': '七夕节',
    '08-15': '中秋节',
    '09-09': '重阳节',
    '12-08': '腊八节',
    '12-23': '小年',
  };

  /**
   * 获取某年某月的万年历信息
   */
  getPerpetualCalendar(year: number, month: number) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const days = [];
    
    // 生成日历数据
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      days.push({
        day,
        date: date.toISOString(),
        weekday: date.getDay(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isToday: this.isToday(date),
        holiday: this.holidays[dateStr],
        lunarDate: this.getLunarDate(year, month, day), // 简化版
        solarTerm: this.getSolarTerm(month, day),
      });
    }

    return {
      year,
      month,
      daysInMonth,
      startWeekday,
      days,
      monthName: this.getMonthName(month),
    };
  }

  /**
   * 判断是否是今天
   */
  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  }

  /**
   * 获取农历日期（简化版）
   */
  private getLunarDate(year: number, month: number, day: number): string {
    // 这里应该使用完整的农历转换算法
    // 简化版：返回格式化的农历日期
    const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                       '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                       '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
    
    // 简化算法（实际应该用专业的农历库）
    const dayIndex = (year + month + day) % 30;
    return lunarDays[dayIndex] || '初一';
  }

  /**
   * 获取节气
   */
  private getSolarTerm(month: number, day: number): string | null {
    // 简化版节气判断（实际应该用精确算法）
    const solarTermDates: Record<string, string> = {
      '01-05': '小寒', '01-20': '大寒',
      '02-04': '立春', '02-19': '雨水',
      '03-06': '惊蛰', '03-21': '春分',
      '04-05': '清明', '04-20': '谷雨',
      '05-06': '立夏', '05-21': '小满',
      '06-06': '芒种', '06-21': '夏至',
      '07-07': '小暑', '07-23': '大暑',
      '08-08': '立秋', '08-23': '处暑',
      '09-08': '白露', '09-23': '秋分',
      '10-08': '寒露', '10-23': '霜降',
      '11-07': '立冬', '11-22': '小雪',
      '12-07': '大雪', '12-22': '冬至',
    };

    const dateStr = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return solarTermDates[dateStr] || null;
  }

  /**
   * 获取月份名称
   */
  private getMonthName(month: number): string {
    const months = ['一月', '二月', '三月', '四月', '五月', '六月',
                    '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return months[month - 1];
  }
}

