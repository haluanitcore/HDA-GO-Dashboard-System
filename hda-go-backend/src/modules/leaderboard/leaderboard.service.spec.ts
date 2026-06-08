import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardService } from './leaderboard.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  creator: { findMany: jest.fn() },
};

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<LeaderboardService>(LeaderboardService);
  });

  // ── TOP BY GMV ────────────────────────────────────────────────────────────

  describe('getTopByGMV', () => {
    it('returns creators sorted by gmv_monthly with default limit 20', async () => {
      const creators = [{ user_id: 'u1', gmv_monthly: 1000 }];
      mockPrisma.creator.findMany.mockResolvedValue(creators);

      const result = await service.getTopByGMV();

      expect(result).toEqual(creators);
      expect(mockPrisma.creator.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { gmv_monthly: 'desc' },
          take: 20,
        }),
      );
    });

    it('respects custom limit', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([]);

      await service.getTopByGMV(5);

      expect(mockPrisma.creator.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  // ── TOP BY ORDERS ─────────────────────────────────────────────────────────

  describe('getTopByOrders', () => {
    it('returns creators sorted by total_orders', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([{ user_id: 'u1' }]);

      const result = await service.getTopByOrders();

      expect(mockPrisma.creator.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { total_orders: 'desc' } }),
      );
    });
  });

  // ── TOP BY STREAK ─────────────────────────────────────────────────────────

  describe('getTopByStreak', () => {
    it('returns creators sorted by streak_days', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([{ user_id: 'u1' }]);

      await service.getTopByStreak();

      expect(mockPrisma.creator.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { streak_days: 'desc' } }),
      );
    });
  });

  // ── GET CREATOR RANK ──────────────────────────────────────────────────────

  describe('getCreatorRank', () => {
    it('calculates correct rank and percentile', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([
        { user_id: 'u1', gmv_monthly: 3000 },
        { user_id: 'u2', gmv_monthly: 2000 },
        { user_id: 'u3', gmv_monthly: 1000 },
      ]);

      const result = await service.getCreatorRank('u2');

      expect(result.rank).toBe(2);
      expect(result.total).toBe(3);
      expect(result.percentile).toBe(33); // (3-2)/3 * 100
    });

    it('returns rank 0 when creator not in list', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([
        { user_id: 'u1', gmv_monthly: 1000 },
      ]);

      const result = await service.getCreatorRank('ghost');

      expect(result.rank).toBe(0);
    });
  });
});
