import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CreatorsService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // GET CREATOR PROFILE + STATS
  // ──────────────────────────────────────────────
  async getProfile(userId: string) {
    return this.prisma.creator.findUnique({
      where: { user_id: userId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        progress: true,
      },
    });
  }

  // ──────────────────────────────────────────────
  // CREATOR DASHBOARD AGGREGATION
  // Frontend Request Dashboard API → Backend Aggregate → Return all data
  // ──────────────────────────────────────────────
  async getDashboardData(userId: string) {
    const [creator, campaigns, submissions, orders, progress] = await Promise.all([
      // Creator Profile + Stats
      this.prisma.creator.findUnique({
        where: { user_id: userId },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),

      // Campaign Joined
      this.prisma.campaignParticipant.findMany({
        where: { creator_id: userId },
        include: {
          campaign: true,
        },
        orderBy: { joined_at: 'desc' },
        take: 10,
      }),

      // Pending Submissions + SOW Progress
      this.prisma.submission.findMany({
        where: { creator_id: userId },
        include: {
          campaign: { select: { title: true, category: true } },
          deliverable: true,
        },
        orderBy: { submitted_at: 'desc' },
        take: 10,
      }),

      // GMV & Orders
      this.prisma.creatorOrder.findMany({
        where: { creator_id: userId },
        include: {
          campaign: { select: { title: true } },
        },
      }),

      // Level Progress
      this.prisma.creatorProgress.findUnique({
        where: { creator_id: userId },
      }),
    ]);

    // Calculate aggregated GMV
    const totalGMV = orders.reduce((sum, o) => sum + o.gmv_amount, 0);
    const totalOrders = orders.reduce((sum, o) => sum + o.order_count, 0);

    return {
      profile: creator,
      gmv: {
        total: totalGMV,
        monthly: creator?.gmv_monthly || 0,
        totalOrders,
      },
      campaigns: {
        joined: campaigns.length,
        list: campaigns,
      },
      submissions: {
        pending: submissions.filter((s) => s.status === 'PENDING').length,
        approved: submissions.filter((s) => s.status === 'APPROVED').length,
        list: submissions,
      },
      sowProgress: submissions.map((s) => ({
        campaign: s.campaign.title,
        total: s.deliverable?.total_sow || 0,
        completed: s.deliverable?.completed_sow || 0,
        remaining: s.deliverable?.remaining_sow || 0,
      })),
      levelProgress: progress,
      streak: creator?.streak_days || 0,
    };
  }

  // ──────────────────────────────────────────────
  // UPDATE STREAK
  // ──────────────────────────────────────────────
  async updateStreak(userId: string) {
    return this.prisma.creator.update({
      where: { user_id: userId },
      data: {
        streak_days: { increment: 1 },
      },
    });
  }

  // ──────────────────────────────────────────────
  // GET ALL CREATORS (for CM/Admin)
  // ──────────────────────────────────────────────
  async findAll() {
    return this.prisma.creator.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        progress: true,
      },
      orderBy: { gmv_total: 'desc' },
    });
  }
}
