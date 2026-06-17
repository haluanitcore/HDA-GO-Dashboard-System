import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CmCreatorsService } from './cm-creators.service';
import { PrismaService } from '../../prisma/prisma.service';

const txMock = {
  user: { create: jest.fn() },
  creator: { create: jest.fn() },
  creatorProgress: { create: jest.fn() },
  creatorAssignmentLog: { create: jest.fn() },
  notification: { create: jest.fn() },
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  creator: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  creatorProgress: { create: jest.fn() },
  notification: { create: jest.fn() },
  $transaction: jest.fn((cb: any) => cb(txMock)),
};

describe('CmCreatorsService', () => {
  let service: CmCreatorsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CmCreatorsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CmCreatorsService>(CmCreatorsService);
  });

  // ── ONBOARD CREATOR ───────────────────────────────────────────────────────

  describe('onboardCreator', () => {
    const dto = {
      name: 'New Creator',
      email: 'creator@test.com',
      phone_number: '0812345',
      gender: 'MALE',
      domicile: 'Jakarta',
      tiktok_username: '@newcreator',
      tiktok_url: 'https://tiktok.com/@newcreator',
      tiktok_followers: 5000,
      avg_views: 1000,
      niche: ['FNB', 'Beauty'],
      affiliate_exp: 'Beginner',
      sow_per_month: 4,
      gmv_target_monthly: 1000000,
    };

    it('creates user, creator, progress and returns credentials with HDA-XXXX password', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // email check → not found
        .mockResolvedValueOnce({ name: 'CM Alice' }); // CM name lookup
      txMock.user.create.mockResolvedValue({});
      txMock.creator.create.mockResolvedValue({});
      txMock.creatorProgress.create.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.onboardCreator('cm-1', dto);

      expect(result.success).toBe(true);
      expect(result.credentials.username).toBe(dto.email);
      // Verify password format is HDA-XXXX (4 digits)
      expect(result.credentials.tempPassword).toMatch(/^HDA-\d{4}$/);
    });

    it('throws BadRequestException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.onboardCreator('cm-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates transaction with correct creator fields', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ name: 'CM' }); // CM name lookup
      txMock.user.create.mockResolvedValue({});
      txMock.creator.create.mockResolvedValue({});
      txMock.creatorProgress.create.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      await service.onboardCreator('cm-1', dto);

      expect(txMock.creator.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cm_id: 'cm-1',
            phone_number: '0812345',
            tiktok_username: '@newcreator',
            niche: JSON.stringify(['FNB', 'Beauty']),
            onboarding_status: 'ACTIVE',
          }),
        }),
      );
    });

    it('sends welcome notification to new creator', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ name: 'CM Bob' });
      txMock.user.create.mockResolvedValue({});
      txMock.creator.create.mockResolvedValue({});
      txMock.creatorProgress.create.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      await service.onboardCreator('cm-1', dto);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: '👋 Selamat Datang di HDA GO!',
            type: 'SYSTEM',
          }),
        }),
      );
    });
  });

  // ── GET MY CREATORS ───────────────────────────────────────────────────────

  describe('getMyCreators', () => {
    it('returns creators managed by CM', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([
        { user_id: 'u1', user: { id: 'u1', name: 'A', email: 'a@t.com' } },
        { user_id: 'u2', user: { id: 'u2', name: 'B', email: 'b@t.com' } },
      ]);

      const result = await service.getMyCreators('cm-1');

      expect(result.total).toBe(2);
      expect(result.creators).toHaveLength(2);
    });
  });

  // ── GET CREATOR DETAIL ────────────────────────────────────────────────────

  describe('getCreatorDetail', () => {
    it('returns creator with submissions', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        user: { id: 'u1', name: 'A', email: 'a@t.com' },
        submissions: [],
      });

      const result = await service.getCreatorDetail('u1');
      expect(result.user_id).toBe('u1');
    });

    it('throws NotFoundException when creator not found', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue(null);
      await expect(service.getCreatorDetail('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── UPDATE CREATOR ────────────────────────────────────────────────────────

  describe('updateCreator', () => {
    it('updates creator fields and user name', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({ user_id: 'u1' });
      mockPrisma.creator.update.mockResolvedValue({ user_id: 'u1' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateCreator('u1', {
        phone_number: '999',
        name: 'Updated Name',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Updated Name' } }),
      );
    });

    it('converts niche array to JSON string', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({ user_id: 'u1' });
      mockPrisma.creator.update.mockResolvedValue({ user_id: 'u1' });

      await service.updateCreator('u1', { niche: ['FNB', 'Tech'] });

      expect(mockPrisma.creator.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            niche: JSON.stringify(['FNB', 'Tech']),
          }),
        }),
      );
    });

    it('throws NotFoundException when creator not found', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue(null);
      await expect(service.updateCreator('ghost', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── TRANSFER CREATOR ──────────────────────────────────────────────────────

  describe('transferCreator', () => {
    it('transfers creator and creates assignment log', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        cm_id: 'cm-1',
      });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'cm-2', role: 'CM' });
      txMock.creatorAssignmentLog.create.mockResolvedValue({});
      txMock.notification.create.mockResolvedValue({});
      // Mock tx.creator.update — need to add it to txMock
      (txMock as any).creator = { update: jest.fn().mockResolvedValue({}) };

      const result = await service.transferCreator(
        'u1',
        'cm-1',
        'cm-2',
        'Rotation',
      );

      expect(result.success).toBe(true);
    });

    it('throws NotFoundException when creator not found', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue(null);

      await expect(
        service.transferCreator('ghost', 'cm-1', 'cm-2', 'x'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when target CM not found', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        cm_id: 'cm-1',
      });
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.transferCreator('u1', 'cm-1', 'cm-99', 'x'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── GET CM LIST ───────────────────────────────────────────────────────────

  describe('getCMList', () => {
    it('returns CMs with creator count', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'cm1', name: 'Alice', email: 'a@t.com', created_at: new Date() },
      ]);
      mockPrisma.creator.groupBy.mockResolvedValue([
        { cm_id: 'cm1', _count: { cm_id: 5 } },
      ]);

      const result = await service.getCMList();

      expect(result[0].creatorCount).toBe(5);
    });
  });
});
