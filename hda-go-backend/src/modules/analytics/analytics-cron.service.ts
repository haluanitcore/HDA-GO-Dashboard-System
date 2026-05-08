import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

// ══════════════════════════════════════════════════════════════
// 24 + 38. SYSTEM AUTOMATION FLOW
// Daily Jobs:
//   1. Recalculate GMV aggregates
//   2. Recalculate Leaderboard
//   3. Update Level Progress for all creators
//   4. Detect Dormant Creators
//   5. Generate Smart Recommendations
//   6. Aggregate platform_metrics, campaign_analytics, creator_monthly_stats
// ══════════════════════════════════════════════════════════════

@Injectable()
export class AnalyticsCronService {
  private readonly logger = new Logger(AnalyticsCronService.name);

  constructor(private prisma: PrismaService) {}

  // ── MASTER DAILY JOB — Runs at 00:00 ──
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyAggregation() {
    this.logger.log('═══════════════════════════════════════');
    this.logger.log('🔄 DAILY SYSTEM AUTOMATION STARTED');
    this.logger.log('═══════════════════════════════════════');

    await this.aggregateCreatorMonthlyStats();
    await this.aggregateCampaignAnalytics();
    await this.aggregatePlatformMetrics();
    await this.recalculateAllLevelProgress();
    await this.detectAndNotifyDormantCreators();
    await this.resetMonthlyStatsIfNewMonth();

    this.logger.log('═══════════════════════════════════════');
    this.logger.log('✅ DAILY SYSTEM AUTOMATION COMPLETED');
    this.logger.log('═══════════════════════════════════════');
  }

  // ──────────────────────────────────────────────
  // 1. AGGREGATE CREATOR MONTHLY STATS
  // ──────────────────────────────────────────────
  async aggregateCreatorMonthlyStats() {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const creators = await this.prisma.creator.findMany({
      include: {
        submissions: { where: { submitted_at: { gte: monthStart } } },
        orders: { where: { recorded_at: { gte: monthStart } } },
        participants: { where: { joined_at: { gte: monthStart } } },
      },
    });

    for (const creator of creators) {
      const gmv = creator.orders.reduce((sum, o) => sum + o.gmv_amount, 0);
      const orders = creator.orders.reduce((sum, o) => sum + o.order_count, 0);
      const campaignsJoined = creator.participants.length;
      const completedSubs = creator.submissions.filter(
        (s) => s.status === 'COMPLETED' || s.status === 'APPROVED' || s.status === 'POSTED',
      ).length;
      const completionRate = creator.submissions.length > 0
        ? (completedSubs / creator.submissions.length) * 100
        : 0;

      // Posting consistency = unique active days / total days in month
      const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const activeDays = new Set(
        creator.submissions.map((s) => s.submitted_at.toISOString().split('T')[0]),
      ).size;
      const consistency = (activeDays / totalDays) * 100;

      await this.prisma.creatorMonthlyStats.upsert({
        where: { creator_id_month: { creator_id: creator.user_id, month } },
        update: {
          gmv, orders,
          campaigns_joined: campaignsJoined,
          campaigns_completed: completedSubs,
          posts_count: creator.submissions.length,
          completion_rate: Math.round(completionRate * 100) / 100,
          calculated_at: now,
        },
        create: {
          creator_id: creator.user_id, month, gmv, orders,
          campaigns_joined: campaignsJoined,
          campaigns_completed: completedSubs,
          posts_count: creator.submissions.length,
          completion_rate: Math.round(completionRate * 100) / 100,
        },
      });

      // Update posting_consistency on creator record
      await this.prisma.creator.update({
        where: { user_id: creator.user_id },
        data: { posting_consistency: Math.round(consistency * 100) / 100 },
      });
    }

    this.logger.log(`  📊 Creator monthly stats: ${creators.length} creators processed.`);
  }

  // ──────────────────────────────────────────────
  // 2. AGGREGATE CAMPAIGN ANALYTICS
  // ──────────────────────────────────────────────
  async aggregateCampaignAnalytics() {
    const campaigns = await this.prisma.campaign.findMany({
      include: {
        _count: { select: { participants: true, submissions: true, orders: true } },
        submissions: { select: { status: true } },
        orders: { select: { gmv_amount: true, order_count: true } },
      },
    });

    for (const campaign of campaigns) {
      const approved = campaign.submissions.filter(
        (s) => ['APPROVED', 'POSTED', 'COMPLETED'].includes(s.status),
      ).length;
      const totalGMV = campaign.orders.reduce((sum, o) => sum + o.gmv_amount, 0);
      const totalOrders = campaign.orders.reduce((sum, o) => sum + o.order_count, 0);
      const rate = campaign._count.submissions > 0
        ? (approved / campaign._count.submissions) * 100
        : 0;

      await this.prisma.campaignAnalytics.upsert({
        where: { campaign_id: campaign.id },
        update: {
          total_participants: campaign._count.participants,
          total_submissions: campaign._count.submissions,
          approved_submissions: approved,
          total_orders: totalOrders,
          total_gmv: totalGMV,
          completion_rate: Math.round(rate * 100) / 100,
          calculated_at: new Date(),
        },
        create: {
          campaign_id: campaign.id,
          total_participants: campaign._count.participants,
          total_submissions: campaign._count.submissions,
          approved_submissions: approved,
          total_orders: totalOrders,
          total_gmv: totalGMV,
          completion_rate: Math.round(rate * 100) / 100,
        },
      });
    }

    this.logger.log(`  📢 Campaign analytics: ${campaigns.length} campaigns processed.`);
  }

  // ──────────────────────────────────────────────
  // 3. AGGREGATE PLATFORM METRICS
  // ──────────────────────────────────────────────
  async aggregatePlatformMetrics() {
    const today = new Date().toISOString().split('T')[0];

    const [totalCreators, activeCreators, totalCampaigns, activeCampaigns, totalSubmissions, orders] =
      await Promise.all([
        this.prisma.creator.count(),
        this.prisma.creator.count({ where: { gmv_monthly: { gt: 0 } } }),
        this.prisma.campaign.count(),
        this.prisma.campaign.count({ where: { status: 'ACTIVE' } }),
        this.prisma.submission.count(),
        this.prisma.creatorOrder.findMany(),
      ]);

    const totalGMV = orders.reduce((sum, o) => sum + o.gmv_amount, 0);
    const totalOrders = orders.reduce((sum, o) => sum + o.order_count, 0);

    await this.prisma.platformMetrics.upsert({
      where: { date: today },
      update: {
        total_creators: totalCreators, active_creators: activeCreators,
        total_campaigns: totalCampaigns, active_campaigns: activeCampaigns,
        total_gmv: totalGMV, total_orders: totalOrders,
        total_submissions: totalSubmissions, calculated_at: new Date(),
      },
      create: {
        date: today, total_creators: totalCreators, active_creators: activeCreators,
        total_campaigns: totalCampaigns, active_campaigns: activeCampaigns,
        total_gmv: totalGMV, total_orders: totalOrders, total_submissions: totalSubmissions,
      },
    });

    this.logger.log(`  📈 Platform metrics saved for ${today}.`);
  }

  // ──────────────────────────────────────────────
  // 4. RECALCULATE ALL LEVEL PROGRESS
  // ──────────────────────────────────────────────
  async recalculateAllLevelProgress() {
    const creators = await this.prisma.creator.findMany();

    for (const creator of creators) {
      // Progress percentage is on CreatorProgress, not Creator model
      // Simple update — full evaluation is done by LevelsService when GMV changes
      await this.prisma.creatorProgress.upsert({
        where: { creator_id: creator.user_id },
        update: {
          gmv_progress: creator.gmv_total,
          campaign_progress: creator.total_campaigns,
          order_progress: creator.total_orders,
        },
        create: {
          creator_id: creator.user_id,
          current_level: creator.creator_level,
          target_level: creator.creator_level + 1,
          progress_percentage: 0,
          gmv_progress: creator.gmv_total,
          campaign_progress: creator.total_campaigns,
          order_progress: creator.total_orders,
        },
      });
    }

    this.logger.log(`  ⭐ Level progress recalculated for ${creators.length} creators.`);
  }

  // ──────────────────────────────────────────────
  // 5. DETECT DORMANT CREATORS & NOTIFY CM
  // ──────────────────────────────────────────────
  async detectAndNotifyDormantCreators() {
    const dormant = await this.prisma.creator.findMany({
      where: {
        gmv_monthly: 0,
        streak_days: 0,
        cm_id: { not: null },
      },
      include: { user: { select: { name: true } } },
    });

    // Group by CM
    const byCM: Record<string, string[]> = {};
    dormant.forEach((c) => {
      if (c.cm_id) {
        if (!byCM[c.cm_id]) byCM[c.cm_id] = [];
        byCM[c.cm_id].push(c.user.name);
      }
    });

    // Notify each CM
    for (const [cmId, creatorNames] of Object.entries(byCM)) {
      await this.prisma.notification.create({
        data: {
          user_id: cmId,
          title: '⚠️ Dormant Creator Alert',
          message: `${creatorNames.length} creator dormant perlu perhatian: ${creatorNames.slice(0, 5).join(', ')}${creatorNames.length > 5 ? '...' : ''}.`,
          type: 'SYSTEM',
          read_status: false,
        },
      });
    }

    this.logger.log(`  ⚠️ Dormant detection: ${dormant.length} creators flagged, ${Object.keys(byCM).length} CMs notified.`);
  }

  // ──────────────────────────────────────────────
  // 6. RESET MONTHLY STATS IF NEW MONTH
  // ──────────────────────────────────────────────
  async resetMonthlyStatsIfNewMonth() {
    const now = new Date();
    if (now.getDate() === 1) {
      await this.prisma.creator.updateMany({
        data: { gmv_monthly: 0 },
      });
      this.logger.log('  🔄 Monthly GMV reset for new month.');
    }
  }
}
