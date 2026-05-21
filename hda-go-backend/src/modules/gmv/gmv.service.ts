import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LevelsService } from '../levels/levels.service';
import * as Tesseract from 'tesseract.js';

@Injectable()
export class GmvService {
  constructor(
    private prisma: PrismaService,
    private levelsService: LevelsService,
  ) {}

  // ══════════════════════════════════════════════
  // 1. OCR SCREENSHOT PARSING
  // ══════════════════════════════════════════════
  async parseScreenshot(fileBuffer: Buffer) {
    try {
      const { data: { text } } = await Tesseract.recognize(fileBuffer, 'ind+eng');
      
      // Simple Regex patterns to extract GMV and Orders
      const gmvMatch = text.match(/Rp[\s]?([\d.,]+)/i);
      const ordersMatch = text.match(/(\d+)[\s]?(pesanan|order|orders)/i);

      let gmvAmount = 0;
      let orderCount = 0;

      if (gmvMatch) {
        gmvAmount = parseFloat(gmvMatch[1].replace(/[.,]/g, ''));
      }
      if (ordersMatch) {
        orderCount = parseInt(ordersMatch[1], 10);
      }

      return {
        success: gmvAmount > 0 || orderCount > 0,
        text_preview: text.substring(0, 100) + '...',
        gmvAmount,
        orderCount,
        periodDate: new Date().toISOString().split('T')[0], // Default to today
      };
    } catch (err) {
      console.error('OCR Error:', err);
      return { success: false, error: 'Failed to read image' };
    }
  }

  // ══════════════════════════════════════════════
  // 2. CREATOR SELF-REPORT GMV
  // ══════════════════════════════════════════════
  async submitSelfReport(creatorId: string, dto: any) {
    // Determine Verification Deadline (Next business day 09:00 if weekend, else 24h)
    const now = new Date();
    const day = now.getDay();
    const deadline = new Date(now);

    if (day === 5 && now.getHours() >= 17) { // Friday evening
      deadline.setDate(deadline.getDate() + 3);
      deadline.setHours(9, 0, 0, 0);
    } else if (day === 6) { // Saturday
      deadline.setDate(deadline.getDate() + 2);
      deadline.setHours(9, 0, 0, 0);
    } else if (day === 0) { // Sunday
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(9, 0, 0, 0);
    } else { // Mon-Thu or Friday morning
      deadline.setHours(deadline.getHours() + 24);
    }

    const order = await this.prisma.creatorOrder.create({
      data: {
        creator_id: creatorId,
        campaign_id: dto.campaignId,
        order_count: dto.orderCount,
        gmv_amount: dto.gmvAmount,
        source: 'SELF_REPORT',
        status: 'PENDING_VERIFICATION',
        period_date: new Date(dto.periodDate),
        notes: dto.notes,
        verification_deadline: deadline,
      },
    });

    // Notify CM
    const creator = await this.prisma.creator.findUnique({ where: { user_id: creatorId }, select: { cm_id: true } });
    if (creator?.cm_id) {
      await this.prisma.notification.create({
        data: {
          user_id: creator.cm_id,
          title: '📝 Verifikasi GMV',
          message: `Creator melaporkan GMV Rp ${dto.gmvAmount}. Batas waktu: ${deadline.toLocaleString()}`,
          type: 'QC',
        },
      });
    }

    return order;
  }

  // ══════════════════════════════════════════════
  // 3. CM VERIFY GMV
  // ══════════════════════════════════════════════
  async verifyGmv(recordId: string, cmId: string, dto: { action: string, adjustedAmount?: number, rejectReason?: string }) {
    const record = await this.prisma.creatorOrder.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException('GMV Record not found');
    if (record.status !== 'PENDING_VERIFICATION') throw new BadRequestException('Record is already processed');

    let newStatus = 'VERIFIED';
    let finalGmv = record.gmv_amount;

    if (dto.action === 'REJECT') {
      newStatus = 'REJECTED';
      await this.prisma.creatorOrder.update({
        where: { id: recordId },
        data: { status: newStatus, reject_reason: dto.rejectReason, verified_by: cmId, verified_at: new Date() }
      });
      return { success: true, status: newStatus };
    }

    if (dto.action === 'ADJUST' && dto.adjustedAmount !== undefined) {
      newStatus = 'ADJUSTED';
      finalGmv = dto.adjustedAmount;
    }

    // Process approval
    const updated = await this.prisma.creatorOrder.update({
      where: { id: recordId },
      data: {
        status: newStatus,
        adjusted_amount: newStatus === 'ADJUSTED' ? finalGmv : null,
        verified_by: cmId,
        verified_at: new Date()
      }
    });

    // ── Update creator aggregate stats ──
    await this.prisma.creator.update({
      where: { user_id: record.creator_id },
      data: {
        gmv_total: { increment: finalGmv },
        gmv_monthly: { increment: finalGmv },
        total_orders: { increment: record.order_count },
      },
    });

    await this.prisma.creatorProgress.update({
      where: { creator_id: record.creator_id },
      data: {
        gmv_progress: { increment: finalGmv },
        order_progress: { increment: record.order_count },
      },
    });

    // ── Check if all SOW is completed to trigger level engine ──
    const deliveries = await this.prisma.submissionDeliverable.findMany({
      where: { submission: { campaign_id: record.campaign_id, creator_id: record.creator_id } }
    });
    
    const isSowFinished = deliveries.every(d => d.remaining_sow === 0);
    
    if (isSowFinished) {
      await this.levelsService.evaluateLevel(record.creator_id);
    }

    return updated;
  }

  // ══════════════════════════════════════════════
  // OLD API / CM DIRECT RECORD (LEGACY COMPAT)
  // ══════════════════════════════════════════════
  async recordOrder(creatorId: string, campaignId: string, orderCount: number, gmvAmount: number) {
    const order = await this.prisma.creatorOrder.create({
      data: {
        creator_id: creatorId,
        campaign_id: campaignId,
        order_count: orderCount,
        gmv_amount: gmvAmount,
        source: 'CM_INPUT',
        status: 'VERIFIED',
      },
    });

    await this.prisma.creator.update({
      where: { user_id: creatorId },
      data: {
        gmv_total: { increment: gmvAmount },
        gmv_monthly: { increment: gmvAmount },
        total_orders: { increment: orderCount },
      },
    });

    await this.prisma.creatorProgress.update({
      where: { creator_id: creatorId },
      data: {
        gmv_progress: { increment: gmvAmount },
        order_progress: { increment: orderCount },
      },
    });

    const levelResult = await this.levelsService.evaluateLevel(creatorId);

    return { order, levelEvaluation: levelResult };
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

  // ── GET PENDING GMV (CM) ──
  async getPendingGmv() {
    return this.prisma.creatorOrder.findMany({
      where: { status: 'PENDING_VERIFICATION' },
      include: {
        creator: { include: { user: { select: { name: true } } } },
        campaign: { select: { title: true } },
      },
      orderBy: { recorded_at: 'asc' },
    });
  }
}
