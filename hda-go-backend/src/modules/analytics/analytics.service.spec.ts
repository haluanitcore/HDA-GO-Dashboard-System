import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  platformMetrics: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  submission: { count: jest.fn() },
  campaignAnalytics: { findMany: jest.fn() },
  creatorMonthlyStats: { findMany: jest.fn() },
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  // ── GET PLATFORM KPI ──────────────────────────────────────────────────────

  describe('getPlatformKPI', () => {
    it('returns latest metrics with pending submissions count', async () => {
      mockPrisma.platformMetrics.findFirst.mockResolvedValue({
        total_gmv: 50000000,
        total_creators: 100,
      });
      mockPrisma.submission.count.mockResolvedValue(12);

      const result = await service.getPlatformKPI();

      expect(result.total_gmv).toBe(50000000);
      expect(result.pendingSubmissions).toBe(12);
    });

    it('handles no metrics found', async () => {
      mockPrisma.platformMetrics.findFirst.mockResolvedValue(null);
      mockPrisma.submission.count.mockResolvedValue(0);

      const result = await service.getPlatformKPI();

      expect(result.pendingSubmissions).toBe(0);
    });
  });

  // ── GET METRICS HISTORY ───────────────────────────────────────────────────

  describe('getMetricsHistory', () => {
    it('returns metrics for last N days', async () => {
      mockPrisma.platformMetrics.findMany.mockResolvedValue([
        { date: '2026-06-01' },
        { date: '2026-06-02' },
      ]);

      const result = await service.getMetricsHistory(7);

      expect(result).toHaveLength(2);
      expect(mockPrisma.platformMetrics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 7 }),
      );
    });

    it('defaults to 30 days', async () => {
      mockPrisma.platformMetrics.findMany.mockResolvedValue([]);

      await service.getMetricsHistory();

      expect(mockPrisma.platformMetrics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 30 }),
      );
    });
  });

  // ── GET CAMPAIGN ANALYTICS ────────────────────────────────────────────────

  describe('getCampaignAnalytics', () => {
    it('returns campaign analytics with campaign details', async () => {
      mockPrisma.campaignAnalytics.findMany.mockResolvedValue([
        {
          total_gmv: 1000000,
          campaign: {
            title: 'Camp A',
            category: 'FNB',
            status: 'ACTIVE',
            deadline: new Date(),
          },
        },
      ]);

      const result = await service.getCampaignAnalytics();

      expect(result).toHaveLength(1);
      expect(result[0].campaign.title).toBe('Camp A');
    });
  });

  // ── GET CREATOR PERFORMANCE ───────────────────────────────────────────────

  describe('getCreatorPerformance', () => {
    it('returns monthly stats for current month', async () => {
      mockPrisma.creatorMonthlyStats.findMany.mockResolvedValue([
        { creator_id: 'u1', gmv: 500000 },
      ]);

      const result = await service.getCreatorPerformance();

      expect(result).toHaveLength(1);
      expect(mockPrisma.creatorMonthlyStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });
  });

  // ── GET CREATOR HISTORY ───────────────────────────────────────────────────

  describe('getCreatorHistory', () => {
    it('returns last 12 months of stats', async () => {
      mockPrisma.creatorMonthlyStats.findMany.mockResolvedValue([]);

      await service.getCreatorHistory('u1', null);

      expect(mockPrisma.creatorMonthlyStats.findMany).toHaveBeenCalledWith({
        where: { creator_id: 'u1' },
        orderBy: { month: 'desc' },
        take: 12,
      });
    });
  });
});
