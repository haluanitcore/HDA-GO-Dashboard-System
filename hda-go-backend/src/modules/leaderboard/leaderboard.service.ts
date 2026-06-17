import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // TOP CREATORS BY GMV (Monthly)
  // ──────────────────────────────────────────────
  async getTopByGMV(limit = 10) {
    return this.prisma.creator.findMany({
      orderBy: { gmv_monthly: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true } },
        progress: { select: { gmv_progress: true, target_level: true, progress_percentage: true } },
      },
    });
  }

  // ──────────────────────────────────────────────
  // TOP CREATORS BY ORDERS
  // ──────────────────────────────────────────────
  async getTopByOrders(limit = 10) {
    return this.prisma.creator.findMany({
      orderBy: { total_orders: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true } },
      },
    });
  }

  // ──────────────────────────────────────────────
  // TOP CREATORS BY STREAK
  // ──────────────────────────────────────────────
  async getTopByStreak(limit = 10) {
    return this.prisma.creator.findMany({
      orderBy: { streak_days: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true } },
      },
    });
  }

  // ──────────────────────────────────────────────
  // CREATOR RANK POSITION
  // ──────────────────────────────────────────────
  async getCreatorRank(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
      select: { gmv_monthly: true },
    });

    if (!creator) {
      return { creatorId, rank: 0, total: 0, percentile: 0 };
    }

    const rank = await this.prisma.creator.count({
      where: { gmv_monthly: { gt: creator.gmv_monthly } },
    }) + 1;

    const total = await this.prisma.creator.count();

    return {
      creatorId,
      rank,
      total,
      percentile: total > 0 ? Math.round(((total - rank) / total) * 100) : 0,
    };
  }
}
