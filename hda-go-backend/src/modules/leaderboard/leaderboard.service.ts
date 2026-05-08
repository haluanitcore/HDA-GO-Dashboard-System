import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // TOP CREATORS BY GMV (Monthly)
  // ──────────────────────────────────────────────
  async getTopByGMV(limit = 20) {
    return this.prisma.creator.findMany({
      orderBy: { gmv_monthly: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true } },
        progress: true,
      },
    });
  }

  // ──────────────────────────────────────────────
  // TOP CREATORS BY ORDERS
  // ──────────────────────────────────────────────
  async getTopByOrders(limit = 20) {
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
  async getTopByStreak(limit = 20) {
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
    const allCreators = await this.prisma.creator.findMany({
      orderBy: { gmv_monthly: 'desc' },
      select: { user_id: true, gmv_monthly: true },
    });

    const rank = allCreators.findIndex((c) => c.user_id === creatorId) + 1;
    const total = allCreators.length;

    return { creatorId, rank, total, percentile: Math.round(((total - rank) / total) * 100) };
  }
}
