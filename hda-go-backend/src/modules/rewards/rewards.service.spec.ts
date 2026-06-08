import { Test, TestingModule } from '@nestjs/testing';
import { RewardsService } from './rewards.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  creator: { findUnique: jest.fn() },
};

describe('RewardsService', () => {
  let service: RewardsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<RewardsService>(RewardsService);
  });

  // ── getAvailableRewards ──────────────────────────────────────────────────────

  describe('getAvailableRewards', () => {
    it('returns no rewards for level 0', async () => {
      const result = await service.getAvailableRewards(0);
      expect(result).toHaveLength(0);
    });

    it('returns rewards up to level 1', async () => {
      const result = await service.getAvailableRewards(1);
      expect(result.every((r) => r.min_level <= 1)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns all rewards for level 5', async () => {
      const result = await service.getAvailableRewards(5);
      expect(result).toHaveLength(5);
    });

    it('returns subset of rewards for level 3', async () => {
      const result = await service.getAvailableRewards(3);
      const levels = result.map((r) => r.min_level);
      expect(Math.max(...levels)).toBeLessThanOrEqual(3);
    });
  });

  // ── getCreatorRewards ────────────────────────────────────────────────────────

  describe('getCreatorRewards', () => {
    it('returns rewards based on creator level', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'c1',
        creator_level: 2,
      });

      const result = await service.getCreatorRewards('c1');

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((r) => r.min_level <= 2)).toBe(true);
    });

    it('returns empty array when creator not found', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue(null);

      const result = await service.getCreatorRewards('ghost');
      expect(result).toEqual([]);
    });
  });
});
