import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LevelsService } from '../levels/levels.service';

@Injectable()
export class GmvService {
  constructor(
    private prisma: PrismaService,
    private levelsService: LevelsService,
  ) {}

  // ══════════════════════════════════════════════
  // 23. GMV & ORDER TRACKING FLOW
  // Campaign Performance Data Masuk → Orders Recorded → GMV Aggregated
  // → Creator Monthly Stats Updated → CM Dashboard Updated → Brand Analytics Updated
  // → Level Engine Recalculate → Progress Updated
  // ══════════════════════════════════════════════
  async recordOrder(creatorId: string, campaignId: string, orderCount: number, gmvAmount: number) {
    // ── Step 1: Record Order ──
    const order = await this.prisma.creatorOrder.create({
      data: {
        creator_id: creatorId,
        campaign_id: campaignId,
        order_count: orderCount,
        gmv_amount: gmvAmount,
      },
    });

    // ── Step 2: Update creator aggregate stats ──
    await this.prisma.creator.update({
      where: { user_id: creatorId },
      data: {
        gmv_total: { increment: gmvAmount },
        gmv_monthly: { increment: gmvAmount },
        total_orders: { increment: orderCount },
      },
    });

    // ── Step 3: Update creator progress GMV ──
    await this.prisma.creatorProgress.update({
      where: { creator_id: creatorId },
      data: {
        gmv_progress: { increment: gmvAmount },
        order_progress: { increment: orderCount },
      },
    });

    // ── Step 4: Auto-trigger Level Engine Recalculate ──
    // Level Engine evaluates: GMV + Orders + Campaigns + Posting + LIVE
    const levelResult = await this.levelsService.evaluateLevel(creatorId);

    // ── Step 5: Notify creator about GMV recorded ──
    await this.prisma.notification.create({
      data: {
        user_id: creatorId,
        title: '💰 GMV Recorded!',
        message: `${orderCount} order baru tercatat. GMV +Rp ${gmvAmount.toLocaleString('id-ID')}.`,
        type: 'SYSTEM',
        read_status: false,
      },
    });

    return {
      order,
      levelEvaluation: levelResult,
    };
  }

  // ── GET GMV SUMMARY BY CREATOR ──
  async getCreatorGMV(creatorId: string) {
    const orders = await this.prisma.creatorOrder.findMany({
      where: { creator_id: creatorId },
      include: { campaign: { select: { title: true, category: true } } },
      orderBy: { recorded_at: 'desc' },
    });

    const totalGMV = orders.reduce((sum, o) => sum + o.gmv_amount, 0);
    const totalOrders = orders.reduce((sum, o) => sum + o.order_count, 0);

    // Group by campaign
    const byCampaign: Record<string, { title: string; gmv: number; orders: number }> = {};
    orders.forEach((o) => {
      if (!byCampaign[o.campaign_id]) {
        byCampaign[o.campaign_id] = { title: o.campaign.title, gmv: 0, orders: 0 };
      }
      byCampaign[o.campaign_id].gmv += o.gmv_amount;
      byCampaign[o.campaign_id].orders += o.order_count;
    });

    return {
      totalGMV,
      totalOrders,
      breakdown: Object.values(byCampaign),
      recentOrders: orders.slice(0, 10),
    };
  }

  // ── PLATFORM-WIDE GMV (Executive/Admin) ──
  async getPlatformGMV() {
    const orders = await this.prisma.creatorOrder.findMany();
    const totalGMV = orders.reduce((sum, o) => sum + o.gmv_amount, 0);
    const totalOrders = orders.reduce((sum, o) => sum + o.order_count, 0);

    return { totalGMV, totalOrders, transactionCount: orders.length };
  }
}
