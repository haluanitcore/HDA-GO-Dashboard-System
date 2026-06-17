import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BrandService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(brandId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { brand_id: brandId },
      include: {
        submissions: { select: { status: true } },
        orders: { select: { gmv_amount: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    const mappedCampaigns = campaigns.map((camp) => {
      const sowCompleted = (camp.submissions || []).filter((s) =>
        ['APPROVED', 'POSTED', 'COMPLETED'].includes(s.status),
      ).length;

      const gmv = (camp.orders || []).reduce((sum, o) => sum + o.gmv_amount, 0);

      return {
        id: camp.id,
        title: camp.title,
        status: camp.status,
        budget: camp.budget,
        sowTotal: camp.sow_total,
        sowCompleted,
        gmv,
      };
    });

    const allCampaigns = await this.prisma.campaign.findMany({
      where: { brand_id: brandId },
      include: {
        participants: { select: { creator_id: true } },
        orders: { select: { gmv_amount: true } },
        analytics: { select: { total_gmv: true, total_orders: true } },
      },
      take: 200,
      orderBy: { created_at: 'desc' },
    });

    const activeCampaigns = allCampaigns.filter((c) =>
      ['ACTIVE', 'COMPLETED'].includes(c.status),
    );

    const totalSpend = allCampaigns
      .filter((c) => ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status))
      .reduce((sum, c) => sum + c.budget, 0);

    const generatedGmv = activeCampaigns.reduce(
      (sum, c) =>
        sum + c.orders.reduce((orderSum, o) => orderSum + o.gmv_amount, 0),
      0,
    );

    let roi = 0;
    if (totalSpend > 0) {
      roi = Math.round((generatedGmv / totalSpend) * 100);
    }

    const uniqueCreators = new Set();
    allCampaigns.forEach((c) => {
      c.participants.forEach((p) => {
        uniqueCreators.add(p.creator_id);
      });
    });

    return {
      stats: {
        totalSpend,
        generatedGmv,
        roi,
        activeCreators: uniqueCreators.size,
      },
      campaigns: mappedCampaigns,
    };
  }

  async getAnalytics(brandId: string) {
    const allCampaigns = await this.prisma.campaign.findMany({
      where: { brand_id: brandId },
      include: {
        orders: { select: { gmv_amount: true } },
        analytics: { select: { total_gmv: true, total_orders: true } },
      },
      take: 200,
      orderBy: { created_at: 'desc' },
    });

    const totalSpend = allCampaigns.reduce((sum, c) => sum + c.budget, 0);
    const generatedGmv = allCampaigns.reduce(
      (sum, c) =>
        sum + c.orders.reduce((orderSum, o) => orderSum + o.gmv_amount, 0),
      0,
    );
    const roi =
      totalSpend > 0 ? Math.round((generatedGmv / totalSpend) * 100) : 0;

    const assumedTraffic = generatedGmv / 50000;
    const funnel = {
      views: Math.round(assumedTraffic * 100),
      clicks: Math.round(assumedTraffic * 3.6),
      orders: Math.round(assumedTraffic),
    };

    return {
      stats: {
        totalSpend,
        generatedGmv,
        roi,
      },
      funnel,
      campaigns: allCampaigns,
    };
  }
}
