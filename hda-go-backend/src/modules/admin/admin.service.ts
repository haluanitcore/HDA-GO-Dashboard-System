import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData() {
    // 1. Get or initialize revenue percentage setting
    let revenueSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'revenue_percentage' },
    });
    if (!revenueSetting) {
      try {
        revenueSetting = await this.prisma.systemSetting.create({
          data: { key: 'revenue_percentage', value: '10' },
        });
      } catch (err) {
        // Fallback if concurrent insert or other db constraint occurs
        revenueSetting = { key: 'revenue_percentage', value: '10', updated_at: new Date() } as any;
      }
    }
    const revenuePercent = parseFloat(revenueSetting?.value || '10') || 10.0;

    // 2. Summary counts (Querying directly from source tables for real-time accuracy)
    const [
      total_users,
      total_creators,
      active_creators,
      total_cm,
      total_bd,
      total_brands,
      total_campaigns,
      active_campaigns,
      pending_bd_campaigns,
      total_submissions,
      pending_qc_submissions,
      pending_reward_claims,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.creator.count(),
      this.prisma.creator.count({ where: { onboarding_status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { role: 'CM' } }),
      this.prisma.user.count({ where: { role: 'BD' } }),
      this.prisma.user.count({ where: { role: 'BRAND' } }),
      this.prisma.campaign.count(),
      this.prisma.campaign.count({ where: { status: 'ACTIVE' } }),
      this.prisma.campaign.count({ where: { status: 'PENDING_BD' } }),
      this.prisma.submission.count(),
      this.prisma.submission.count({ where: { status: 'QC_REVIEW' } }),
      this.prisma.creatorMilestoneClaim.count({ where: { status: 'PENDING' } }),
    ]);

    // Calculate Platform GMV by summing gmv_total from Creator records
    const gmvAggregate = await this.prisma.creator.aggregate({
      _sum: { gmv_total: true },
    });
    const platform_gmv = gmvAggregate._sum.gmv_total || 0;

    // Calculate Campaign Budget Total by summing budget from Campaign records (excluding CANCELLED)
    const budgetAggregate = await this.prisma.campaign.aggregate({
      where: { status: { not: 'CANCELLED' } },
      _sum: { budget: true },
    });
    const campaign_budget_total = budgetAggregate._sum.budget || 0;

    // Calculate Total Orders by summing total_orders from Creator records
    const ordersAggregate = await this.prisma.creator.aggregate({
      _sum: { total_orders: true },
    });
    const total_orders = ordersAggregate._sum.total_orders || 0;

    // Revenue calculation based on revenue percentage setting
    const revenue_total = (revenuePercent / 100.0) * platform_gmv;

    // 3. Top creators by GMV (for leaderboard widget)
    const topCreators = await this.prisma.creator.findMany({
      take: 5,
      orderBy: { gmv_total: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            avatar_url: true,
          },
        },
      },
    });

    const top_creators_gmv = topCreators.map((c) => ({
      creator_id: c.user_id,
      name: c.user.name,
      avatar_url: c.user.avatar_url,
      gmv_total: c.gmv_total,
      total_orders: c.total_orders,
      level: c.creator_level,
    }));

    // 4. Campaigns overview list
    const campaigns = await this.prisma.campaign.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        deadline: true,
        budget: true,
        slot: true,
        sow_total: true,
        reward_type: true,
        _count: {
          select: { participants: true },
        },
      },
    });

    const campaigns_overview = campaigns.map((camp) => ({
      id: camp.id,
      title: camp.title,
      category: camp.category,
      status: camp.status,
      deadline: camp.deadline,
      budget: camp.budget,
      slot: camp.slot,
      sow_total: camp.sow_total,
      reward_type: camp.reward_type,
      participants_count: camp._count.participants,
    }));

    // 5. CM Performance with detailed creators drill-down
    const cms = await this.prisma.user.findMany({
      where: { role: 'CM' },
      select: {
        id: true,
        name: true,
      },
    });

    const cm_performance = await Promise.all(
      cms.map(async (cm) => {
        const creators = await this.prisma.creator.findMany({
          where: { cm_id: cm.id },
          include: {
            user: {
              select: {
                name: true,
                email: true,
                avatar_url: true,
                phone: true,
              },
            },
          },
        });

        const total_creators = creators.length;
        const cm_active_creators = creators.filter(
          (c) => c.onboarding_status === 'ACTIVE',
        ).length;
        const cm_total_gmv = creators.reduce((sum, c) => sum + c.gmv_total, 0);

        const creatorIds = creators.map((c) => c.user_id);
        const cm_pending_claims = await this.prisma.creatorMilestoneClaim.count({
          where: {
            creator_id: { in: creatorIds },
            status: 'PENDING',
          },
        });

        return {
          cm_id: cm.id,
          cm_name: cm.name,
          total_creators,
          active_creators: cm_active_creators,
          total_gmv: cm_total_gmv,
          pending_claims: cm_pending_claims,
          creators: creators.map((c) => ({
            creator_id: c.user_id,
            name: c.user.name,
            email: c.user.email,
            tiktok_username: c.tiktok_username,
            gmv_total: c.gmv_total,
            onboarding_status: c.onboarding_status,
            level: c.creator_level,
          })),
        };
      }),
    );

    // 6. GMV Trend from CreatorWeeklyStats (grouped by week, last 8 weeks)
    // Use real sync data instead of empty PlatformMetrics table
    const weeklyStatsRaw = await this.prisma.creatorWeeklyStats.groupBy({
      by: ['week_label', 'week_start'],
      _sum: { gmv: true, orders: true },
      orderBy: { week_start: 'desc' },
      take: 8,
    });

    // Reverse to chronological order for chart (oldest → newest)
    const sortedWeekly = [...weeklyStatsRaw].reverse();

    let gmv_trend: { date: string; gmv: number; revenue: number; orders: number }[];

    if (sortedWeekly.length > 0) {
      gmv_trend = sortedWeekly.map((w) => {
        const gmv = Number(w._sum.gmv || 0);
        const revenue = (revenuePercent / 100.0) * gmv;
        return {
          date: w.week_start
            ? w.week_start.toISOString().substring(0, 10)
            : w.week_label,
          gmv,
          revenue,
          orders: Number(w._sum.orders || 0),
        };
      });
    } else {
      // Fallback: use current platform totals as single data point for today
      const today = new Date().toISOString().substring(0, 10);
      gmv_trend = [{
        date: today,
        gmv: Number(platform_gmv),
        revenue: (revenuePercent / 100.0) * Number(platform_gmv),
        orders: Number(total_orders),
      }];
    }


    return {
      summary: {
        total_users,
        total_creators,
        active_creators,
        total_cm,
        total_bd,
        total_brands,
        platform_gmv,
        campaign_budget_total,
        total_orders,
        total_campaigns,
        active_campaigns,
        pending_bd_campaigns,
        total_submissions,
        pending_qc_submissions,
        pending_reward_claims,
        revenue_total,
        revenue_percentage: revenuePercent,
      },
      top_creators_gmv,
      campaigns_overview,
      cm_performance,
      gmv_trend,
    };
  }
}
