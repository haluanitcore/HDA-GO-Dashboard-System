import { Test, TestingModule } from '@nestjs/testing';
import { CreatorsService } from './creators.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  creator: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  campaignParticipant: { findMany: jest.fn() },
  submission: { findMany: jest.fn() },
  creatorOrder: { findMany: jest.fn(), aggregate: jest.fn() },
  creatorProgress: { findUnique: jest.fn() },
};

describe('CreatorsService', () => {
  let service: CreatorsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CreatorsService>(CreatorsService);
  });

  // ── getProfile ───────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('returns creator profile with user and progress', async () => {
      const profile = {
        user_id: 'u1',
        creator_level: 2,
        user: { id: 'u1', name: 'Alice', email: 'a@test.com', role: 'CREATOR' },
        progress: { current_level: 2, progress_percentage: 60 },
      };
      mockPrisma.creator.findUnique.mockResolvedValue(profile);

      const result = await service.getProfile('u1');
      expect(result).toEqual(profile);
      expect(mockPrisma.creator.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: 'u1' } }),
      );
    });

    it('returns null when creator not found', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue(null);
      const result = await service.getProfile('ghost');
      expect(result).toBeNull();
    });
  });

  // ── getMyCM ──────────────────────────────────────────────────────────────────

  describe('getMyCM', () => {
    it('returns CM info when creator has assigned CM', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        cm_id: 'cm1',
        cm_user: {
          id: 'cm1',
          name: 'Bob CM',
          email: 'cm@test.com',
          gdrive_url: 'https://drive.google.com/cm',
          gdrive_folder_id: 'folder123',
        },
      });

      const result = await service.getMyCM('u1');

      expect(result.cm_id).toBe('cm1');
      expect(result.cm_name).toBe('Bob CM');
      expect(result.gdrive_url).toBe('https://drive.google.com/cm');
    });

    it('returns nulls when creator has no CM assigned', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        cm_id: null,
        cm_user: null,
      });

      const result = await service.getMyCM('u1');

      expect(result).toEqual({
        cm_id: null,
        cm_name: null,
        cm_email: null,
        gdrive_url: null,
      });
    });
  });

  // ── getDashboardData ──────────────────────────────────────────────────────────

  describe('getDashboardData', () => {
    it('aggregates GMV correctly from orders', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        gmv_monthly: 5000,
        streak_days: 3,
        user: { id: 'u1', name: 'Alice', email: 'a@test.com', role: 'CREATOR' },
      });
      mockPrisma.campaignParticipant.findMany.mockResolvedValue([]);
      mockPrisma.submission.findMany.mockResolvedValue([]);
      mockPrisma.creatorOrder.aggregate
        .mockResolvedValueOnce({ _sum: { gmv_amount: 3000, order_count: 7 }, _count: 2 })
        .mockResolvedValueOnce({ _sum: { gmv_amount: 5000 } });
      mockPrisma.creatorProgress.findUnique.mockResolvedValue({
        current_level: 2,
      });

      const result = await service.getDashboardData('u1');

      expect(result.gmv.total).toBe(3000);
      expect(result.gmv.totalOrders).toBe(7);
      expect(result.gmv.monthly).toBe(5000);
      expect(result.streak).toBe(3);
    });

    it('returns correct counts for pending and approved submissions', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        gmv_monthly: 0,
        streak_days: 0,
        user: { id: 'u1', name: 'Alice', email: 'a@test.com', role: 'CREATOR' },
      });
      mockPrisma.campaignParticipant.findMany.mockResolvedValue([]);
      mockPrisma.submission.findMany.mockResolvedValue([
        { status: 'DRAFT', campaign: { title: 'C1' }, deliverable: null },
        { status: 'QC_REVIEW', campaign: { title: 'C2' }, deliverable: null },
        { status: 'APPROVED', campaign: { title: 'C3' }, deliverable: null },
        { status: 'REVISION', campaign: { title: 'C4' }, deliverable: null },
      ]);
      mockPrisma.creatorOrder.aggregate
        .mockResolvedValueOnce({ _sum: { gmv_amount: 0, order_count: 0 }, _count: 0 })
        .mockResolvedValueOnce({ _sum: { gmv_amount: 0 } });
      mockPrisma.creatorProgress.findUnique.mockResolvedValue(null);

      const result = await service.getDashboardData('u1');

      expect(result.submissions.pending).toBe(3);
      expect(result.submissions.approved).toBe(1);
    });
  });

  // ── updateStreak ──────────────────────────────────────────────────────────────

  describe('updateStreak', () => {
    it('increments streak_days by 1', async () => {
      mockPrisma.creator.update.mockResolvedValue({
        user_id: 'u1',
        streak_days: 5,
      });

      const result = await service.updateStreak('u1');

      expect(mockPrisma.creator.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { streak_days: { increment: 1 } },
        }),
      );
      expect(result.streak_days).toBe(5);
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all creators ordered by gmv_total desc', async () => {
      const creators = [
        { user_id: 'u1', gmv_total: 5000 },
        { user_id: 'u2', gmv_total: 2000 },
      ];
      mockPrisma.creator.findMany.mockResolvedValue(creators);
      mockPrisma.creator.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockPrisma.creator.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { gmv_total: 'desc' } }),
      );
    });
  });
});
