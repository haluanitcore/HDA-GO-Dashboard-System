import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BrandService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(brandId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { brand_id: brandId },
      include: {
        _count: { select: { participants: true, submissions: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    const allCampaigns = await this.prisma.campaign.findMany({
      where: { brand_id: brandId },
      include: {
        participants: true,
      },
    });

    const activeCampaigns = allCampaigns.filter(c => ['ACTIVE', 'COMPLETED'].includes(c.status));
    
    const totalSpend = allCampaigns
      .filter(c => ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status))
      .reduce((sum, c) => sum + c.budget, 0);

    const generatedGmv = activeCampaigns.reduce((sum, c) => sum + (c.generated_gmv || 0), 0);
    
    let roi = 0;
    if (totalSpend > 0) {
      roi = Math.round((generatedGmv / totalSpend) * 100);
    }

    const uniqueCreators = new Set();
    allCampaigns.forEach(c => {
      c.participants.forEach(p => {
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
      campaigns,
    };
  }

  async getAnalytics(brandId: string) {
    const allCampaigns = await this.prisma.campaign.findMany({
      where: { brand_id: brandId },
    });

    const totalSpend = allCampaigns.reduce((sum, c) => sum + c.budget, 0);
    const generatedGmv = allCampaigns.reduce((sum, c) => sum + (c.generated_gmv || 0), 0);
    const roi = totalSpend > 0 ? Math.round((generatedGmv / totalSpend) * 100) : 0;
    
    // Calculate simple funnel based on aggregated GMV assuming 1% conversion
    const assumedTraffic = generatedGmv / 50000; // rough estimation for dummy funnel
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
