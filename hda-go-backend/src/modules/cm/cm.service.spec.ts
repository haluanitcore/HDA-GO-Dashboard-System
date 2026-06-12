import { Test, TestingModule } from '@nestjs/testing';
import { CmService } from './cm.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';

const mockPrisma = {
  user: { findMany: jest.fn() },
  creator: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  submission: { count: jest.fn() },
  campaign: { findUnique: jest.fn(), findMany: jest.fn() },
  notification: { create: jest.fn() },
};

const mockEventsGateway = {
  emitCampaignPush: jest.fn(),
};

describe('CmService', () => {
  let service: CmService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CmService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();
    service = module.get<CmService>(CmService);
  });

  // ── GET CM LIST ───────────────────────────────────────────────────────────

  describe('getCmList', () => {
    it('returns all CM users ordered by name', async () => {
      const cms = [
        { id: 'cm1', name: 'Alice', email: 'a@t.com', gdrive_url: null },
      ];
      mockPrisma.user.findMany.mockResolvedValue(cms);

      const result = await service.getCmList();

      expect(result).toEqual(cms);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'CM' } }),
      );
    });
  });

  // ── GET DASHBOARD ─────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    const mockCreators = [
      {
        user_id: 'u1',
        user: { id: 'u1', name: 'Active', email: 'a@t.com' },
        gmv_monthly: 1000000,
        total_orders: 10,
        streak_days: 5,
        total_posts: 3,
        posting_consistency: 50,
        creator_level: 1,
        progress: { progress_percentage: 40 },
      },
      {
        user_id: 'u2',
        user: { id: 'u2', name: 'Dormant', email: 'b@t.com' },
        gmv_monthly: 0,
        total_orders: 0,
        streak_days: 0,
        total_posts: 0,
        posting_consistency: 0,
        creator_level: 0,
        progress: { progress_percentage: 0 },
      },
      {
        user_id: 'u3',
        user: { id: 'u3', name: 'NearLvlUp', email: 'c@t.com' },
        gmv_monthly: 500000,
        total_orders: 5,
        streak_days: 3,
        total_posts: 2,
        posting_consistency: 30,
        creator_level: 1,
        progress: { progress_percentage: 85 },
      },
    ];

    it('returns aggregated dashboard with pipeline classification', async () => {
      mockPrisma.creator.findMany.mockResolvedValue(mockCreators);
      mockPrisma.submission.count.mockResolvedValue(3);

      const result = await service.getDashboard('cm-1');

      expect(result.summary.totalCreators).toBe(3);
      expect(result.summary.totalGMV).toBe(1500000);
      expect(result.summary.pendingSubmissions).toBe(3);
      expect(result.pipeline).toHaveLength(3);
    });

    it('classifies creators correctly', async () => {
      mockPrisma.creator.findMany.mockResolvedValue(mockCreators);
      mockPrisma.submission.count.mockResolvedValue(0);

      const result = await service.getDashboard('cm-1');

      const statuses = result.pipeline.map((c: any) => c.status);
      expect(statuses).toContain('ACTIVE');
      expect(statuses).toContain('DORMANT');
      expect(statuses).toContain('NEAR_LEVEL_UP');
    });
  });

  // ── GET CREATORS BY STATUS ────────────────────────────────────────────────

  describe('getCreatorsByStatus', () => {
    it('filters creators by DORMANT status', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([
        {
          user_id: 'u1',
          user: { id: 'u1', name: 'A', email: 'a@t.com' },
          gmv_monthly: 0,
          total_orders: 0,
          streak_days: 0,
          total_posts: 0,
          posting_consistency: 0,
          creator_level: 0,
          progress: null,
        },
      ]);

      const result = await service.getCreatorsByStatus('cm-1', 'DORMANT');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('DORMANT');
    });
  });

  // ── PUSH CAMPAIGN RECOMMENDATION ──────────────────────────────────────────

  describe('pushCampaignRecommendation', () => {
    it('creates notification and emits WebSocket event', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'c1',
        title: 'Camp',
        category: 'FNB',
        deadline: new Date('2026-12-31'),
      });
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        user: { name: 'Alice' },
      });
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });

      const result = await service.pushCampaignRecommendation(
        'cm-1',
        'u1',
        'c1',
      );

      expect(result!.pushed).toBe(true);
      expect(result!.creatorName).toBe('Alice');
      expect(mockEventsGateway.emitCampaignPush).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ campaignId: 'c1' }),
      );
    });

    it('returns null when campaign or creator not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      mockPrisma.creator.findUnique.mockResolvedValue(null);

      const result = await service.pushCampaignRecommendation(
        'cm-1',
        'u1',
        'c1',
      );
      expect(result).toBeNull();
    });
  });

  // ── ASSIGN CREATOR ────────────────────────────────────────────────────────

  describe('assignCreator', () => {
    it('updates creator cm_id', async () => {
      mockPrisma.creator.update.mockResolvedValue({
        user_id: 'u1',
        cm_id: 'cm-2',
      });

      const result = await service.assignCreator('u1', 'cm-2');

      expect(result.cm_id).toBe('cm-2');
    });
  });

  // ── GMV MONITORING ────────────────────────────────────────────────────────

  describe('getGMVMonitoring', () => {
    it('returns total GMV and creator breakdown', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([
        {
          user_id: 'u1',
          user: { name: 'A' },
          creator_level: 1,
          gmv_monthly: 1000,
          gmv_total: 5000,
          total_orders: 10,
          streak_days: 3,
        },
        {
          user_id: 'u2',
          user: { name: 'B' },
          creator_level: 0,
          gmv_monthly: 500,
          gmv_total: 2000,
          total_orders: 5,
          streak_days: 1,
        },
      ]);

      const result = await service.getGMVMonitoring('cm-1');

      expect(result.totalGMV).toBe(1500);
      expect(result.creators).toHaveLength(2);
    });
  });

  // ── LEVEL MONITORING ──────────────────────────────────────────────────────

  describe('getLevelMonitoring', () => {
    it('returns level distribution', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([
        {
          user_id: 'u1',
          user: { name: 'A' },
          creator_level: 1,
          progress: null,
        },
        {
          user_id: 'u2',
          user: { name: 'B' },
          creator_level: 1,
          progress: null,
        },
        {
          user_id: 'u3',
          user: { name: 'C' },
          creator_level: 3,
          progress: null,
        },
      ]);

      const result = await service.getLevelMonitoring('cm-1');

      expect(result.levelDistribution[1]).toBe(2);
      expect(result.levelDistribution[3]).toBe(1);
    });
  });
});
