import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GmvService } from './gmv.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LevelsService } from '../levels/levels.service';

const mockPrisma = {
  creatorOrder: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  creator: { findUnique: jest.fn(), update: jest.fn() },
  creatorProgress: { update: jest.fn() },
  notification: { create: jest.fn() },
  submissionDeliverable: { findMany: jest.fn() },
};

const mockLevelsService = {
  evaluateLevel: jest.fn(),
};

describe('GmvService', () => {
  let service: GmvService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GmvService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LevelsService, useValue: mockLevelsService },
      ],
    }).compile();
    service = module.get<GmvService>(GmvService);
  });

  // ── SUBMIT SELF REPORT ────────────────────────────────────────────────────

  describe('submitSelfReport', () => {
    const dto = {
      campaignId: 'c1',
      orderCount: 5,
      gmvAmount: 500000,
      periodDate: '2026-06-01',
      notes: 'Monthly report',
    };

    it('creates an order with PENDING_VERIFICATION status', async () => {
      const order = { id: 'o1', status: 'PENDING_VERIFICATION', ...dto };
      mockPrisma.creatorOrder.create.mockResolvedValue(order);
      mockPrisma.creator.findUnique.mockResolvedValue({ cm_id: 'cm-1' });
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.submitSelfReport('u1', dto);

      expect(result.status).toBe('PENDING_VERIFICATION');
      expect(mockPrisma.creatorOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'SELF_REPORT',
            status: 'PENDING_VERIFICATION',
          }),
        }),
      );
    });

    it('notifies CM when creator has a CM', async () => {
      mockPrisma.creatorOrder.create.mockResolvedValue({ id: 'o1' });
      mockPrisma.creator.findUnique.mockResolvedValue({ cm_id: 'cm-1' });
      mockPrisma.notification.create.mockResolvedValue({});

      await service.submitSelfReport('u1', dto);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: 'cm-1',
            type: 'QC',
          }),
        }),
      );
    });

    it('skips CM notification when creator has no CM', async () => {
      mockPrisma.creatorOrder.create.mockResolvedValue({ id: 'o1' });
      mockPrisma.creator.findUnique.mockResolvedValue({ cm_id: null });

      await service.submitSelfReport('u1', dto);

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  // ── VERIFY GMV ────────────────────────────────────────────────────────────

  describe('verifyGmv', () => {
    const record = {
      id: 'o1',
      creator_id: 'u1',
      campaign_id: 'c1',
      gmv_amount: 500000,
      order_count: 5,
      status: 'PENDING_VERIFICATION',
    };

    it('approves (VERIFY) and updates creator stats', async () => {
      mockPrisma.creatorOrder.findUnique.mockResolvedValue(record);
      mockPrisma.creatorOrder.update.mockResolvedValue({ ...record, status: 'VERIFIED' });
      mockPrisma.creator.update.mockResolvedValue({});
      mockPrisma.creatorProgress.update.mockResolvedValue({});
      mockPrisma.submissionDeliverable.findMany.mockResolvedValue([
        { remaining_sow: 0 },
      ]);
      mockLevelsService.evaluateLevel.mockResolvedValue({ leveledUp: false });

      const result = await service.verifyGmv('o1', 'cm-1', { action: 'VERIFY' });

      expect(mockPrisma.creator.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gmv_total: { increment: 500000 },
          }),
        }),
      );
    });

    it('rejects and does NOT update stats', async () => {
      mockPrisma.creatorOrder.findUnique.mockResolvedValue(record);
      mockPrisma.creatorOrder.update.mockResolvedValue({ status: 'REJECTED' });

      const result = await service.verifyGmv('o1', 'cm-1', {
        action: 'REJECT',
        rejectReason: 'Screenshot blur',
      });

      expect(result.status).toBe('REJECTED');
      expect(mockPrisma.creator.update).not.toHaveBeenCalled();
    });

    it('adjusts GMV amount when action is ADJUST', async () => {
      mockPrisma.creatorOrder.findUnique.mockResolvedValue(record);
      mockPrisma.creatorOrder.update.mockResolvedValue({ status: 'ADJUSTED' });
      mockPrisma.creator.update.mockResolvedValue({});
      mockPrisma.creatorProgress.update.mockResolvedValue({});
      mockPrisma.submissionDeliverable.findMany.mockResolvedValue([]);

      await service.verifyGmv('o1', 'cm-1', {
        action: 'ADJUST',
        adjustedAmount: 300000,
      });

      expect(mockPrisma.creator.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gmv_total: { increment: 300000 },
          }),
        }),
      );
    });

    it('throws NotFoundException when record not found', async () => {
      mockPrisma.creatorOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyGmv('ghost', 'cm-1', { action: 'VERIFY' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when already processed', async () => {
      mockPrisma.creatorOrder.findUnique.mockResolvedValue({
        ...record,
        status: 'VERIFIED',
      });

      await expect(
        service.verifyGmv('o1', 'cm-1', { action: 'VERIFY' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('triggers level evaluation when all SOW is finished', async () => {
      mockPrisma.creatorOrder.findUnique.mockResolvedValue(record);
      mockPrisma.creatorOrder.update.mockResolvedValue({ status: 'VERIFIED' });
      mockPrisma.creator.update.mockResolvedValue({});
      mockPrisma.creatorProgress.update.mockResolvedValue({});
      mockPrisma.submissionDeliverable.findMany.mockResolvedValue([
        { remaining_sow: 0 },
        { remaining_sow: 0 },
      ]);
      mockLevelsService.evaluateLevel.mockResolvedValue({ leveledUp: true });

      await service.verifyGmv('o1', 'cm-1', { action: 'VERIFY' });

      expect(mockLevelsService.evaluateLevel).toHaveBeenCalledWith('u1');
    });
  });

  // ── RECORD ORDER (Legacy) ─────────────────────────────────────────────────

  describe('recordOrder', () => {
    it('creates order, updates stats, and evaluates level', async () => {
      mockPrisma.creatorOrder.create.mockResolvedValue({ id: 'o1' });
      mockPrisma.creator.update.mockResolvedValue({});
      mockPrisma.creatorProgress.update.mockResolvedValue({});
      mockLevelsService.evaluateLevel.mockResolvedValue({ leveledUp: false });

      const result = await service.recordOrder('u1', 'c1', 10, 1000000);

      expect(result.order.id).toBe('o1');
      expect(mockLevelsService.evaluateLevel).toHaveBeenCalledWith('u1');
    });
  });

  // ── GET CREATOR GMV ───────────────────────────────────────────────────────

  describe('getCreatorGMV', () => {
    it('returns aggregated GMV with campaign breakdown', async () => {
      mockPrisma.creatorOrder.findMany.mockResolvedValue([
        {
          campaign_id: 'c1',
          gmv_amount: 500000,
          order_count: 5,
          campaign: { title: 'Camp A', category: 'FNB' },
        },
        {
          campaign_id: 'c1',
          gmv_amount: 300000,
          order_count: 3,
          campaign: { title: 'Camp A', category: 'FNB' },
        },
      ]);

      const result = await service.getCreatorGMV('u1');

      expect(result.totalGMV).toBe(800000);
      expect(result.totalOrders).toBe(8);
      expect(result.breakdown).toHaveLength(1);
    });
  });

  // ── GET PLATFORM GMV ──────────────────────────────────────────────────────

  describe('getPlatformGMV', () => {
    it('returns platform-wide totals', async () => {
      mockPrisma.creatorOrder.findMany.mockResolvedValue([
        { gmv_amount: 100, order_count: 1 },
        { gmv_amount: 200, order_count: 2 },
      ]);

      const result = await service.getPlatformGMV();

      expect(result.totalGMV).toBe(300);
      expect(result.totalOrders).toBe(3);
      expect(result.transactionCount).toBe(2);
    });
  });

  // ── GET PENDING GMV ───────────────────────────────────────────────────────

  describe('getPendingGmv', () => {
    it('returns orders pending verification', async () => {
      mockPrisma.creatorOrder.findMany.mockResolvedValue([{ id: 'o1' }]);

      const result = await service.getPendingGmv();

      expect(result).toHaveLength(1);
      expect(mockPrisma.creatorOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING_VERIFICATION' },
        }),
      );
    });
  });
});
