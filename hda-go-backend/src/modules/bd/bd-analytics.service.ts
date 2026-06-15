import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BdCampaignService } from './bd-campaign.service';

// ══════════════════════════════════════════════════════════════
// BD ANALYTICS SERVICE
//
// Extracted from bd.service.ts — handles BD analytics
// including approval rates, budget breakdown, brand
// performance, and monthly trends.
// ══════════════════════════════════════════════════════════════

@Injectable()
export class BdAnalyticsService {
  constructor(
    private prisma: PrismaService,
    private bdCampaignService: BdCampaignService,
  ) {}

  // ──────────────────────────────────────────────
  // BD ANALYTICS
  // ──────────────────────────────────────────────
  async getAnalytics(bdUserId: string) {
    const assignedBrands =
      await this.bdCampaignService.getAssignedBrandIds(bdUserId);

    const whereClause: Record<string, unknown> = {};
    if (assignedBrands.length > 0) {
      whereClause.brand_id = { in: assignedBrands };
    }

    const allCampaigns = await this.prisma.campaign.findMany({
      where: whereClause,
    });

    // Approval rate
    const reviewed = allCampaigns.filter((c) =>
      ['BD_APPROVED', 'BD_REVISION', 'ACTIVE', 'COMPLETED'].includes(c.status),
    );
    const approved = reviewed.filter((c) =>
      ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status),
    );
    const approvalRate =
      reviewed.length > 0 ? (approved.length / reviewed.length) * 100 : 0;

    // Budget by category
    const budgetByCategory: Record<string, number> = {};
    allCampaigns.forEach((c) => {
      budgetByCategory[c.category] =
        (budgetByCategory[c.category] || 0) + c.budget;
    });

    // Campaigns by status
    const campaignsByStatus: Record<string, number> = {};
    allCampaigns.forEach((c) => {
      campaignsByStatus[c.status] = (campaignsByStatus[c.status] || 0) + 1;
    });

    // Brand performance
    const brandIds = [...new Set(allCampaigns.map((c) => c.brand_id))];
    const brands = await this.prisma.user.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true },
    });
    const brandMap = new Map(brands.map((b) => [b.id, b.name]));

    const brandPerformance = brandIds.map((bid) => {
      const brandCampaigns = allCampaigns.filter((c) => c.brand_id === bid);
      return {
        brand_id: bid,
        brand_name: brandMap.get(bid) || 'Unknown',
        totalCampaigns: brandCampaigns.length,
        totalBudget: brandCampaigns.reduce((sum, c) => sum + c.budget, 0),
        approvedCount: brandCampaigns.filter((c) =>
          ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status),
        ).length,
        pendingCount: brandCampaigns.filter((c) => c.status === 'PENDING_BD')
          .length,
      };
    });

    // Monthly trend (last 6 months)
    const now = new Date();
    const monthlyTrend: {
      month: string;
      total: number;
      approved: number;
      budget: number;
    }[] = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthStr = month.toLocaleDateString('id-ID', {
        month: 'short',
        year: '2-digit',
      });

      const monthCampaigns = allCampaigns.filter((c) => {
        const d = new Date(c.created_at);
        return d >= month && d <= monthEnd;
      });

      monthlyTrend.push({
        month: monthStr,
        total: monthCampaigns.length,
        approved: monthCampaigns.filter((c) =>
          ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status),
        ).length,
        budget: monthCampaigns.reduce((sum, c) => sum + c.budget, 0),
      });
    }

    return {
      approvalRate: Math.round(approvalRate),
      totalReviewed: reviewed.length,
      totalApproved: approved.length,
      totalBudgetApproved: approved.reduce((sum, c) => sum + c.budget, 0),
      budgetByCategory,
      campaignsByStatus,
      brandPerformance,
      monthlyTrend,
    };
  }
}
