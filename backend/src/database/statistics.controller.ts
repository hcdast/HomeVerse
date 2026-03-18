import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  async getDashboardStats(@Request() req: any) {
    const familyId = req.user.familyId;
    if (!familyId) {
      return {
        overview: {
          totalAlbums: 0,
          totalFiles: 0,
          totalArticles: 0,
          totalMembers: 0,
          totalPhotos: 0,
          storageUsed: 0,
        },
        finance: {
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          monthlyTrend: [],
          categoryBreakdown: [],
        },
        activities: {
          recentActivities: [],
          weeklyActivityCount: [0, 0, 0, 0, 0, 0, 0],
        },
        todos: {
          total: 0,
          completed: 0,
          pending: 0,
          overdue: 0,
          completionRate: 0,
        },
        health: {
          latestRecords: [],
        },
      };
    }
    return this.statisticsService.getDashboardStats(familyId);
  }

  @Get('finance/trend')
  async getFinanceTrend(
    @Request() req: any,
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
  ) {
    const familyId = req.user.familyId;
    if (!familyId) {
      return [];
    }
    return this.statisticsService.getFinanceTrend(familyId, period);
  }
}



