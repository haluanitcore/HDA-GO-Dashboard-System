import { Test, TestingModule } from '@nestjs/testing';
import { LevelsService } from './levels.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  creator: { findUnique: jest.fn(), update: jest.fn() },
  creatorProgress: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  notification: { create: jest.fn() },
};

describe('LevelsService', () => {
  let service: LevelsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LevelsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<LevelsService>(LevelsService);
  });

  // ── EVALUATE LEVEL ────────────────────────────────────────────────────────

  describe('evaluateLevel', () => {
    it('returns null when creator not found', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue(null);

      const result = await service.evaluateLevel('ghost');
      expect(result).toBeNull();
    });

    it('keeps level at 0 for newcomer with no stats', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        creator_level: 0,
        gmv_total: 0,
        total_campaigns: 0,
        total_orders: 0,
        posting_consistency: 0,
        live_participation: 0,
        cm_id: null,
        user: { name: 'Newbie' },
      });
      mockPrisma.creator.update.mockResolvedValue({});
      mockPrisma.creatorProgress.upsert.mockResolvedValue({});

      const result = await service.evaluateLevel('u1');

      expect(result!.newLevel).toBe(0);
      expect(result!.leveledUp).toBe(false);
    });

    it('levels up to 1 when meeting Starter threshold', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        creator_level: 0,
        gmv_total: 1500000,
        total_campaigns: 3,
        total_orders: 15,
        posting_consistency: 25,
        live_participation: 0,
        cm_id: 'cm-1',
        user: { name: 'RisingStar' },
      });
      mockPrisma.creator.update.mockResolvedValue({});
      mockPrisma.creatorProgress.upsert.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.evaluateLevel('u1');

      expect(result!.previousLevel).toBe(0);
      expect(result!.newLevel).toBe(1);
      expect(result!.leveledUp).toBe(true);
      expect(result!.levelName).toBe('Starter');
    });

    it('sends notifications to creator and CM on level up', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        creator_level: 0,
        gmv_total: 1000000,
        total_campaigns: 2,
        total_orders: 10,
        posting_consistency: 20,
        live_participation: 0,
        cm_id: 'cm-1',
        user: { name: 'Alice' },
      });
      mockPrisma.creator.update.mockResolvedValue({});
      mockPrisma.creatorProgress.upsert.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      await service.evaluateLevel('u1');

      // 2 notifications: one for creator, one for CM
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
    });

    it('does NOT send notification when level stays the same', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        creator_level: 0,
        gmv_total: 0,
        total_campaigns: 0,
        total_orders: 0,
        posting_consistency: 0,
        live_participation: 0,
        cm_id: null,
        user: { name: 'Static' },
      });
      mockPrisma.creator.update.mockResolvedValue({});
      mockPrisma.creatorProgress.upsert.mockResolvedValue({});

      await service.evaluateLevel('u1');

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('returns correct progress factors toward next level', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        creator_level: 1,
        gmv_total: 2000000,
        total_campaigns: 3,
        total_orders: 30,
        posting_consistency: 30,
        live_participation: 1,
        cm_id: null,
        user: { name: 'Progress' },
      });
      mockPrisma.creator.update.mockResolvedValue({});
      mockPrisma.creatorProgress.upsert.mockResolvedValue({});

      const result = await service.evaluateLevel('u1');

      expect(result!.factors.gmv.current).toBe(2000000);
      expect(result!.factors.gmv.required).toBe(5000000); // Level 2 threshold
    });
  });

  // ── GET THRESHOLDS ────────────────────────────────────────────────────────

  describe('getThresholds', () => {
    it('returns all 7 level thresholds', () => {
      const thresholds = service.getThresholds();

      expect(thresholds).toHaveLength(7);
      expect(thresholds[0].level).toBe(0);
      expect(thresholds[6].level).toBe(6);
      expect(thresholds[6].name).toBe('Legend');
    });
  });

  // ── GET PROGRESS ──────────────────────────────────────────────────────────

  describe('getProgress', () => {
    it('returns progress with level names and factors', async () => {
      mockPrisma.creatorProgress.findUnique.mockResolvedValue({
        creator_id: 'u1',
        current_level: 1,
        target_level: 2,
        progress_percentage: 45.5,
      });
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        gmv_total: 2000000,
        total_campaigns: 3,
        total_orders: 30,
        posting_consistency: 30,
        live_participation: 1,
      });

      const result = await service.getProgress('u1');

      expect(result!.currentLevelName).toBe('Starter');
      expect(result!.nextLevelName).toBe('Rising');
      expect(result!.factors.gmv.current).toBe(2000000);
    });

    it('returns null when progress or creator not found', async () => {
      mockPrisma.creatorProgress.findUnique.mockResolvedValue(null);
      mockPrisma.creator.findUnique.mockResolvedValue(null);

      const result = await service.getProgress('ghost');
      expect(result).toBeNull();
    });
  });
});
