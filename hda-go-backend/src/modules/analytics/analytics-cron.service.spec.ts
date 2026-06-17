import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsCronService } from './analytics-cron.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockPrisma = {
  creator: {
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  creatorMonthlyStats: { upsert: jest.fn() },
  campaign: { findMany: jest.fn(), count: jest.fn() },
  campaignAnalytics: { upsert: jest.fn() },
  submission: { count: jest.fn() },
  creatorOrder: { findMany: jest.fn(), aggregate: jest.fn() },
  platformMetrics: { upsert: jest.fn() },
  creatorProgress: { upsert: jest.fn() },
  notification: { create: jest.fn(), createMany: jest.fn() },
};

describe('AnalyticsCronService', () => {
  let service: AnalyticsCronService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsCronService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AnalyticsCronService>(AnalyticsCronService);
  });

  // ══════════════════════════════════════════════════
  // aggregateCreatorMonthlyStats
  // ══════════════════════════════════════════════════
  describe('aggregateCreatorMonthlyStats', () => {
    it('aggregates GMV, orders, and consistency per creator', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([
        {
          user_id: 'u1',
          submissions: [
            { status: 'APPROVED', submitted_at: new Date() },
            { status: 'QC_REVIEW', submitted_at: new Date() },
          ],
          orders: [
            { gmv_amount: 1000000, order_count: 5 },
            { gmv_amount: 500000, order_count: 3 },
          ],
          participants: [{ joined_at: new Date() }],
        },
      ]);
      mockPrisma.creatorMonthlyStats.upsert.mockResolvedValue({});
      mockPrisma.creator.update.mockResolvedValue({});

      await service.aggregateCreatorMonthlyStats();

      expect(mockPrisma.creatorMonthlyStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            gmv: 1500000,
            orders: 8,
            campaigns_joined: 1,
            campaigns_completed: 1,
            posts_count: 2,
          }),
        }),
      );
      expect(mockPrisma.creator.update).toHaveBeenCalled();
    });

    it('handles creator with no submissions', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([
        {
          user_id: 'u2',
          submissions: [],
          orders: [],
          participants: [],
        },
      ]);
      mockPrisma.creatorMonthlyStats.upsert.mockResolvedValue({});
      mockPrisma.creator.update.mockResolvedValue({});

      await service.aggregateCreatorMonthlyStats();

      expect(mockPrisma.creatorMonthlyStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            gmv: 0,
            orders: 0,
            completion_rate: 0,
          }),
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════
  // aggregateCampaignAnalytics
  // ══════════════════════════════════════════════════
  describe('aggregateCampaignAnalytics', () => {
    it('computes completion rate and totals per campaign', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          _count: { participants: 10, submissions: 4, orders: 3 },
          submissions: [
            { status: 'APPROVED' },
            { status: 'POSTED' },
            { status: 'QC_REVIEW' },
            { status: 'REVISION' },
          ],
          orders: [
            { gmv_amount: 500000, order_count: 5 },
            { gmv_amount: 300000, order_count: 3 },
            { gmv_amount: 200000, order_count: 2 },
          ],
        },
      ]);
      mockPrisma.campaignAnalytics.upsert.mockResolvedValue({});

      await service.aggregateCampaignAnalytics();

      expect(mockPrisma.campaignAnalytics.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            total_participants: 10,
            total_submissions: 4,
            approved_submissions: 2,
            total_gmv: 1000000,
            total_orders: 10,
            completion_rate: 50, // 2/4 * 100
          }),
        }),
      );
    });

    it('handles campaign with no submissions', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c2',
          _count: { participants: 0, submissions: 0, orders: 0 },
          submissions: [],
          orders: [],
        },
      ]);
      mockPrisma.campaignAnalytics.upsert.mockResolvedValue({});

      await service.aggregateCampaignAnalytics();

      expect(mockPrisma.campaignAnalytics.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            completion_rate: 0,
            total_gmv: 0,
          }),
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════
  // aggregatePlatformMetrics
  // ══════════════════════════════════════════════════
  describe('aggregatePlatformMetrics', () => {
    it('aggregates all platform KPIs', async () => {
      mockPrisma.creator.count
        .mockResolvedValueOnce(100) // totalCreators
        .mockResolvedValueOnce(40); // activeCreators
      mockPrisma.campaign.count
        .mockResolvedValueOnce(50) // totalCampaigns
        .mockResolvedValueOnce(10); // activeCampaigns
      mockPrisma.submission.count.mockResolvedValue(500);
      mockPrisma.creatorOrder.aggregate.mockResolvedValue({
        _sum: { gmv_amount: 5000000, order_count: 50 },
        _count: 2,
      });
      mockPrisma.platformMetrics.upsert.mockResolvedValue({});

      await service.aggregatePlatformMetrics();

      expect(mockPrisma.platformMetrics.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            total_creators: 100,
            active_creators: 40,
            total_campaigns: 50,
            active_campaigns: 10,
            total_gmv: 5000000,
            total_orders: 50,
            total_submissions: 500,
          }),
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════
  // recalculateAllLevelProgress
  // ══════════════════════════════════════════════════
  describe('recalculateAllLevelProgress', () => {
    it('upserts progress for each creator', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([
        {
          user_id: 'u1',
          gmv_total: 5000000,
          total_campaigns: 10,
          total_orders: 50,
          creator_level: 3,
        },
        {
          user_id: 'u2',
          gmv_total: 1000000,
          total_campaigns: 3,
          total_orders: 15,
          creator_level: 1,
        },
      ]);
      mockPrisma.creatorProgress.upsert.mockResolvedValue({});

      await service.recalculateAllLevelProgress();

      expect(mockPrisma.creatorProgress.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.creatorProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { creator_id: 'u1' },
          update: expect.objectContaining({ gmv_progress: 5000000 }),
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════
  // detectAndNotifyDormantCreators
  // ══════════════════════════════════════════════════
  describe('detectAndNotifyDormantCreators', () => {
    it('groups dormant creators by CM and sends notifications', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([
        { user_id: 'u1', cm_id: 'cm-1', user: { name: 'Alice' } },
        { user_id: 'u2', cm_id: 'cm-1', user: { name: 'Bob' } },
        { user_id: 'u3', cm_id: 'cm-2', user: { name: 'Charlie' } },
      ]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      await service.detectAndNotifyDormantCreators();

      // 2 CMs notified via createMany
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              user_id: 'cm-1',
              title: '⚠️ Dormant Creator Alert',
            }),
          ]),
        }),
      );
    });

    it('handles no dormant creators', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([]);

      await service.detectAndNotifyDormantCreators();

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════
  // resetMonthlyStatsIfNewMonth
  // ══════════════════════════════════════════════════
  describe('resetMonthlyStatsIfNewMonth', () => {
    it('resets gmv_monthly on day 1', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 6, 1)); // July 1
      mockPrisma.creator.updateMany.mockResolvedValue({ count: 50 });

      await service.resetMonthlyStatsIfNewMonth();

      expect(mockPrisma.creator.updateMany).toHaveBeenCalledWith({
        data: { gmv_monthly: 0 },
      });
      jest.useRealTimers();
    });

    it('does NOT reset on other days', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 6, 15)); // July 15

      await service.resetMonthlyStatsIfNewMonth();

      expect(mockPrisma.creator.updateMany).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  // ══════════════════════════════════════════════════
  // runDailyAggregation (orchestrator)
  // ══════════════════════════════════════════════════
  describe('runDailyAggregation', () => {
    it('calls all 6 sub-jobs', async () => {
      const spy1 = jest
        .spyOn(service, 'aggregateCreatorMonthlyStats')
        .mockResolvedValue();
      const spy2 = jest
        .spyOn(service, 'aggregateCampaignAnalytics')
        .mockResolvedValue();
      const spy3 = jest
        .spyOn(service, 'aggregatePlatformMetrics')
        .mockResolvedValue();
      const spy4 = jest
        .spyOn(service, 'recalculateAllLevelProgress')
        .mockResolvedValue();
      const spy5 = jest
        .spyOn(service, 'detectAndNotifyDormantCreators')
        .mockResolvedValue();
      const spy6 = jest
        .spyOn(service, 'resetMonthlyStatsIfNewMonth')
        .mockResolvedValue();

      await service.runDailyAggregation();

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
      expect(spy3).toHaveBeenCalled();
      expect(spy4).toHaveBeenCalled();
      expect(spy5).toHaveBeenCalled();
      expect(spy6).toHaveBeenCalled();
    });
  });
});
