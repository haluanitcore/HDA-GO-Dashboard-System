import { Test, TestingModule } from '@nestjs/testing';
import { BdAnalyticsService } from './bd-analytics.service';
import { BdCampaignService } from './bd-campaign.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  campaign: {
    findMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

const mockBdCampaignService = {
  getAssignedBrandIds: jest.fn(),
};

describe('BdAnalyticsService', () => {
  let service: BdAnalyticsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BdAnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BdCampaignService, useValue: mockBdCampaignService },
      ],
    }).compile();
    service = module.get<BdAnalyticsService>(BdAnalyticsService);
  });

  describe('getAnalytics', () => {
    it('calculates approval rate correctly', async () => {
      mockBdCampaignService.getAssignedBrandIds.mockResolvedValue([]);
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          status: 'BD_APPROVED',
          brand_id: 'b1',
          budget: 1000000,
          category: 'HOTEL',
          created_at: new Date(),
        },
        {
          id: 'c2',
          status: 'BD_APPROVED',
          brand_id: 'b1',
          budget: 2000000,
          category: 'FNB',
          created_at: new Date(),
        },
        {
          id: 'c3',
          status: 'BD_REVISION',
          brand_id: 'b2',
          budget: 500000,
          category: 'HOTEL',
          created_at: new Date(),
        },
        {
          id: 'c4',
          status: 'ACTIVE',
          brand_id: 'b1',
          budget: 3000000,
          category: 'HOTEL',
          created_at: new Date(),
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'b1', name: 'Brand A' },
        { id: 'b2', name: 'Brand B' },
      ]);

      const result = await service.getAnalytics('admin-1');

      // 3 approved (BD_APPROVED + ACTIVE) out of 4 reviewed
      expect(result.approvalRate).toBe(75);
      expect(result.totalReviewed).toBe(4);
      expect(result.totalApproved).toBe(3);
    });

    it('returns 0% approval rate when no campaigns reviewed', async () => {
      mockBdCampaignService.getAssignedBrandIds.mockResolvedValue([]);
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          status: 'PENDING_BD',
          brand_id: 'b1',
          budget: 1000000,
          category: 'HOTEL',
          created_at: new Date(),
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getAnalytics('admin-1');

      expect(result.approvalRate).toBe(0);
      expect(result.totalReviewed).toBe(0);
    });

    it('calculates budget by category', async () => {
      mockBdCampaignService.getAssignedBrandIds.mockResolvedValue([]);
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          status: 'ACTIVE',
          brand_id: 'b1',
          budget: 1000000,
          category: 'HOTEL',
          created_at: new Date(),
        },
        {
          id: 'c2',
          status: 'ACTIVE',
          brand_id: 'b1',
          budget: 2000000,
          category: 'HOTEL',
          created_at: new Date(),
        },
        {
          id: 'c3',
          status: 'ACTIVE',
          brand_id: 'b1',
          budget: 500000,
          category: 'FNB',
          created_at: new Date(),
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'b1', name: 'B1' }]);

      const result = await service.getAnalytics('admin-1');

      expect(result.budgetByCategory.HOTEL).toBe(3000000);
      expect(result.budgetByCategory.FNB).toBe(500000);
    });

    it('generates brand performance metrics', async () => {
      mockBdCampaignService.getAssignedBrandIds.mockResolvedValue([]);
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          status: 'BD_APPROVED',
          brand_id: 'b1',
          budget: 1000000,
          category: 'HOTEL',
          created_at: new Date(),
        },
        {
          id: 'c2',
          status: 'PENDING_BD',
          brand_id: 'b1',
          budget: 500000,
          category: 'HOTEL',
          created_at: new Date(),
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'b1', name: 'Brand A' },
      ]);

      const result = await service.getAnalytics('admin-1');

      expect(result.brandPerformance).toHaveLength(1);
      expect(result.brandPerformance[0].totalCampaigns).toBe(2);
      expect(result.brandPerformance[0].approvedCount).toBe(1);
      expect(result.brandPerformance[0].pendingCount).toBe(1);
    });

    it('generates monthly trend for last 6 months', async () => {
      mockBdCampaignService.getAssignedBrandIds.mockResolvedValue([]);
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getAnalytics('admin-1');

      expect(result.monthlyTrend).toHaveLength(6);
    });

    it('filters by assigned brands for BD users', async () => {
      mockBdCampaignService.getAssignedBrandIds.mockResolvedValue(['brand-1']);
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getAnalytics('bd-1');

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { brand_id: { in: ['brand-1'] } },
        }),
      );
    });
  });
});
