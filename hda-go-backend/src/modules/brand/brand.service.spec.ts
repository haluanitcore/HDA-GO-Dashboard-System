import { Test, TestingModule } from '@nestjs/testing';
import { BrandService } from './brand.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  campaign: { findMany: jest.fn() },
};

describe('BrandService', () => {
  let service: BrandService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<BrandService>(BrandService);
  });

  // ── GET DASHBOARD ─────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('returns stats with ROI calculation', async () => {
      const campaigns = [
        {
          id: 'c1',
          title: 'Camp',
          status: 'ACTIVE',
          budget: 1000000,
          _count: { participants: 3, submissions: 2 },
          participants: [{ creator_id: 'u1' }, { creator_id: 'u2' }],
          orders: [{ gmv_amount: 500000 }, { gmv_amount: 300000 }],
          analytics: null,
          created_at: new Date(),
        },
      ];
      // First call: recent 5 campaigns (with _count)
      mockPrisma.campaign.findMany.mockResolvedValueOnce(campaigns);
      // Second call: all campaigns (with participants/orders/analytics)
      mockPrisma.campaign.findMany.mockResolvedValueOnce(campaigns);

      const result = await service.getDashboard('brand-1');

      expect(result.stats.totalSpend).toBe(1000000);
      expect(result.stats.generatedGmv).toBe(800000);
      expect(result.stats.activeCreators).toBe(2);
    });

    it('returns zero ROI when no spend', async () => {
      mockPrisma.campaign.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getDashboard('brand-1');

      expect(result.stats.roi).toBe(0);
      expect(result.stats.totalSpend).toBe(0);
    });
  });

  // ── GET ANALYTICS ─────────────────────────────────────────────────────────

  describe('getAnalytics', () => {
    it('returns analytics with funnel calculation', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          budget: 500000,
          orders: [{ gmv_amount: 1000000 }],
          analytics: null,
        },
      ]);

      const result = await service.getAnalytics('brand-1');

      expect(result.stats.totalSpend).toBe(500000);
      expect(result.stats.generatedGmv).toBe(1000000);
      expect(result.stats.roi).toBe(200);
      expect(result.funnel.views).toBeGreaterThan(0);
    });

    it('handles zero spend ROI', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);

      const result = await service.getAnalytics('brand-1');

      expect(result.stats.roi).toBe(0);
    });
  });
});
