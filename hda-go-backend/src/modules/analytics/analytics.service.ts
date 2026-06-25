import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // PLATFORM KPI (Executive Dashboard)
  // Reads from pre-aggregated platform_metrics table
  // ──────────────────────────────────────────────
  async getPlatformKPI() {
    // Get latest platform metrics
    const latest = await this.prisma.platformMetrics.findFirst({
      orderBy: { calculated_at: 'desc' },
    });

    // Get live counts for real-time accuracy
    const pendingSubmissions = await this.prisma.submission.count({
      where: { status: 'QC_REVIEW' },
    });

    return {
      ...latest,
      pendingSubmissions,
    };
  }

  // ──────────────────────────────────────────────
  // PLATFORM METRICS HISTORY (trend chart)
  // ──────────────────────────────────────────────
  async getMetricsHistory(days = 30) {
    return this.prisma.platformMetrics.findMany({
      orderBy: { date: 'desc' },
      take: days,
    });
  }

  // ──────────────────────────────────────────────
  // CAMPAIGN ANALYTICS (from aggregated table)
  // ──────────────────────────────────────────────
  async getCampaignAnalytics(skip: number = 0, take: number = 50) {
    return this.prisma.campaignAnalytics.findMany({
      skip,
      take,
      include: {
        campaign: {
          select: { title: true, category: true, status: true, deadline: true },
        },
      },
      orderBy: { total_gmv: 'desc' },
    });
  }

  // ──────────────────────────────────────────────
  // CREATOR PERFORMANCE (from monthly stats)
  // ──────────────────────────────────────────────
  async getCreatorPerformance(limit = 20) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return this.prisma.creatorMonthlyStats.findMany({
      where: { month },
      include: {
        creator: {
          include: {
            user: { select: { name: true } },
            progress: { select: { gmv_progress: true, target_level: true, progress_percentage: true } },
          },
        },
      },
      orderBy: { gmv: 'desc' },
      take: limit,
    });
  }

  // ──────────────────────────────────────────────
  // CREATOR MONTHLY STATS HISTORY
  // ──────────────────────────────────────────────
  // requestingCmId: null = ADMIN/EXECUTIVE (no scope check); string = CM (must own creator)
  async getCreatorHistory(creatorId: string, requestingCmId: string | null) {
    if (requestingCmId !== null) {
      const creator = await this.prisma.creator.findUnique({
        where: { user_id: creatorId },
        select: { cm_id: true },
      });
      if (!creator || creator.cm_id !== requestingCmId) {
        throw new ForbiddenException('Access denied to creator outside your group');
      }
    }
    return this.prisma.creatorMonthlyStats.findMany({
      where: { creator_id: creatorId },
      orderBy: { month: 'desc' },
      take: 12,
    });
  }
}
