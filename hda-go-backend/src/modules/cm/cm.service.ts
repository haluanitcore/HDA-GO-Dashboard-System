import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';

// ══════════════════════════════════════════════════════════════
// 25. CM WORKFLOW — Creator Growth Manager
// CM is now the center of creator growth
//
// 26. CM DASHBOARD FLOW
// Fetch Pipeline → Load GMV, Level, Dormant, Campaigns, Submissions
//
// 27. CREATOR PIPELINE SYSTEM
// Active / Low Activity / Dormant / Near Level Up
//
// 28. PUSH RECOMMENDATION FLOW
// CM Recommend → Generate → Notify → Creator Opens → Creator Joins
// ══════════════════════════════════════════════════════════════

type CreatorStatus = 'ACTIVE' | 'LOW_ACTIVITY' | 'DORMANT' | 'NEAR_LEVEL_UP';

@Injectable()
export class CmService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // ──────────────────────────────────────────────
  // 26. CM DASHBOARD — Full Aggregated View
  // ──────────────────────────────────────────────
  async getDashboard(cmUserId: string) {
    const creators = await this.prisma.creator.findMany({
      where: { cm_id: cmUserId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        progress: true,
      },
    });

    // Classify each creator
    const pipeline = creators.map((c) => ({
      ...c,
      status: this.classifyCreatorStatus(c),
    }));

    // Aggregations
    const totalGMV = creators.reduce((sum, c) => sum + c.gmv_monthly, 0);
    const totalOrders = creators.reduce((sum, c) => sum + c.total_orders, 0);
    const activeCount = pipeline.filter((c) => c.status === 'ACTIVE').length;
    const lowActivityCount = pipeline.filter((c) => c.status === 'LOW_ACTIVITY').length;
    const dormantCount = pipeline.filter((c) => c.status === 'DORMANT').length;
    const nearLevelUpCount = pipeline.filter((c) => c.status === 'NEAR_LEVEL_UP').length;

    // Pending submissions for QC
    const pendingSubmissions = await this.prisma.submission.count({
      where: {
        status: 'QC_REVIEW',
        creator: { cm_id: cmUserId },
      },
    });

    return {
      summary: {
        totalCreators: creators.length,
        totalGMV,
        totalOrders,
        activeCount,
        lowActivityCount,
        dormantCount,
        nearLevelUpCount,
        pendingSubmissions,
      },
      pipeline,
    };
  }

  // ──────────────────────────────────────────────
  // 27. CREATOR PIPELINE — Status Classification
  // Active | Low Activity (Warning) | Dormant (Perlu Push) | Near Level Up (Prioritas)
  // ──────────────────────────────────────────────
  private classifyCreatorStatus(creator: any): CreatorStatus {
    // Near Level Up takes priority — progress >= 80%
    if (creator.progress && creator.progress.progress_percentage >= 80) {
      return 'NEAR_LEVEL_UP';
    }

    // Dormant — zero activity this month
    if (creator.gmv_monthly === 0 && creator.streak_days === 0 && creator.total_posts === 0) {
      return 'DORMANT';
    }

    // Low Activity — some activity but below threshold
    if (creator.gmv_monthly < 500000 || creator.streak_days < 3) {
      return 'LOW_ACTIVITY';
    }

    // Active — healthy performance
    return 'ACTIVE';
  }

  // ──────────────────────────────────────────────
  // GET CREATORS BY STATUS
  // ──────────────────────────────────────────────
  async getCreatorsByStatus(cmUserId: string, status: CreatorStatus) {
    const creators = await this.prisma.creator.findMany({
      where: { cm_id: cmUserId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        progress: true,
      },
    });

    return creators
      .filter((c) => this.classifyCreatorStatus(c) === status)
      .map((c) => ({
        userId: c.user_id,
        name: c.user.name,
        email: c.user.email,
        level: c.creator_level,
        gmvMonthly: c.gmv_monthly,
        orders: c.total_orders,
        streak: c.streak_days,
        consistency: c.posting_consistency,
        status,
        progress: c.progress,
      }));
  }

  // ──────────────────────────────────────────────
  // 28. PUSH RECOMMENDATION FLOW
  // CM clicks Recommend → System generates recommendation
  // → Send notification → Creator receives push → Opens → Joins
  // ──────────────────────────────────────────────
  async pushCampaignRecommendation(cmUserId: string, creatorId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
      include: { user: { select: { name: true } } },
    });

    if (!campaign || !creator) return null;

    // Save notification in DB — embed campaign_id in title for frontend parsing
    const notification = await this.prisma.notification.create({
      data: {
        user_id: creatorId,
        title: `CAMPAIGN_REC::${campaign.id}`,
        message: `CM merekomendasikan campaign "${campaign.title}" (${campaign.category}) untukmu. Deadline: ${campaign.deadline.toLocaleDateString('id-ID')}. Klik untuk bergabung!`,
        type: 'PUSH',
        read_status: false,
      },
    });

    // Emit real-time event via Socket.io
    this.eventsGateway.emitCampaignPush(creatorId, {
      campaignId: campaign.id,
      campaignTitle: campaign.title,
    });

    return {
      notification,
      pushed: true,
      creatorName: creator.user.name,
      campaignTitle: campaign.title,
    };
  }

  // ──────────────────────────────────────────────
  // AUTO-GENERATE RECOMMENDATIONS for Near Level Up creators
  // ──────────────────────────────────────────────
  async generateSmartRecommendations(cmUserId: string) {
    const nearLevelUp = await this.getCreatorsByStatus(cmUserId, 'NEAR_LEVEL_UP');

    const activeCampaigns = await this.prisma.campaign.findMany({
      where: { status: 'ACTIVE' },
      include: { _count: { select: { participants: true } } },
    });

    const recommendations: any[] = [];

    for (const creator of nearLevelUp) {
      // Find campaigns matching creator's level
      const eligible = activeCampaigns.filter(
        (c) => c.min_level <= creator.level && (c.slot === 0 || c._count.participants < c.slot),
      );

      if (eligible.length > 0) {
        recommendations.push({
          creator: { id: creator.userId, name: creator.name, level: creator.level },
          suggestedCampaigns: eligible.slice(0, 3).map((c) => ({
            id: c.id,
            title: c.title,
            category: c.category,
            slotsRemaining: c.slot > 0 ? c.slot - c._count.participants : 'Unlimited',
          })),
          reason: `Near Level Up (${creator.progress?.progress_percentage?.toFixed(1)}% → Level ${(creator.progress?.target_level)})`,
        });
      }
    }

    return recommendations;
  }

  // ──────────────────────────────────────────────
  // ASSIGN CREATOR TO CM
  // ──────────────────────────────────────────────
  async assignCreator(creatorId: string, cmUserId: string) {
    return this.prisma.creator.update({
      where: { user_id: creatorId },
      data: { cm_id: cmUserId },
    });
  }

  // ──────────────────────────────────────────────
  // GMV MONITORING — For CM's portfolio
  // ──────────────────────────────────────────────
  async getGMVMonitoring(cmUserId: string) {
    const creators = await this.prisma.creator.findMany({
      where: { cm_id: cmUserId },
      include: { user: { select: { name: true } } },
      orderBy: { gmv_monthly: 'desc' },
    });

    const totalGMV = creators.reduce((sum, c) => sum + c.gmv_monthly, 0);

    return {
      totalGMV,
      creators: creators.map((c) => ({
        name: c.user.name,
        userId: c.user_id,
        level: c.creator_level,
        gmvMonthly: c.gmv_monthly,
        gmvTotal: c.gmv_total,
        orders: c.total_orders,
        streak: c.streak_days,
      })),
    };
  }

  // ──────────────────────────────────────────────
  // LEVEL MONITORING
  // ──────────────────────────────────────────────
  async getLevelMonitoring(cmUserId: string) {
    const creators = await this.prisma.creator.findMany({
      where: { cm_id: cmUserId },
      include: {
        user: { select: { name: true } },
        progress: true,
      },
      orderBy: { creator_level: 'desc' },
    });

    const levelDistribution: Record<number, number> = {};
    creators.forEach((c) => {
      levelDistribution[c.creator_level] = (levelDistribution[c.creator_level] || 0) + 1;
    });

    return { levelDistribution, creators };
  }
}
