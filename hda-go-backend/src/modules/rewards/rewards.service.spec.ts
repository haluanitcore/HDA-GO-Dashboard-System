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
    it('returns no rewards for level 0', () => {
      const result = service.getAvailableRewards(0);
      expect(result).toHaveLength(0);
    });

    it('returns rewards up to level 1', () => {
      const result = service.getAvailableRewards(1);
      expect(result.every((r) => r.min_level <= 1)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns all rewards for level 4 (max level)', () => {
      const result = service.getAvailableRewards(4);
      expect(result).toHaveLength(4);
    });

    it('returns subset of rewards for level 3', () => {
      const result = service.getAvailableRewards(3);
      const levels = result.map((r) => r.min_level);
      expect(Math.max(...levels)).toBeLessThanOrEqual(3);
    });
  });

  // ── getCreatorRewards ────────────────────────────────────────────────────────

  describe('getCreatorRewards', () => {
    it('returns coming soon message', async () => {
      const result = await service.getCreatorRewards('c1');

      expect(result).toEqual({
        message: 'Reward system coming soon',
        rewards: [],
        available: false,
      });
    });
  });
});
